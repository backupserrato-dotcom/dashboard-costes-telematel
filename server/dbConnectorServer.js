import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateOrderSummary, paginate, parsePowerShellJson, repairKnownMojibake } from './serverUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Cargar .env (credenciales ERP fuera del repositorio) ────────────────────
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const ERP_CONFIG = {
  dsn: process.env.TLM_DSN || 'tlmplusV11',
  dsnIncremental: process.env.TLM_DSN_INCREMENTAL || 'tlmplus1V11',
  user: process.env.TLM_USER || '',
  password: process.env.TLM_PASSWORD || '',
  hostName: process.env.TLM_HOST_NAME || 'dataserver',
  hostIp: process.env.TLM_HOST_IP || '192.168.1.3',
  driver: 'Progress OpenEdge 11.7 Driver',
};

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
const CACHE_ONLY = process.env.CACHE_ONLY === 'true';
let refreshRunning = false;

// A fatal JavaScript error can leave Express in an inconsistent state. Exit with
// a failure code so Task Scheduler can restart a clean process.
process.on('uncaughtException', (err) => {
  console.error('[Server] Excepción no controlada; reinicio requerido:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Promesa rechazada sin controlar; reinicio requerido:', reason);
  process.exit(1);
});

app.disable('x-powered-by');
if (ALLOWED_ORIGINS.length > 0) {
  app.use(cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error('Origen no autorizado'));
    }
  }));
}
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  const sendJson = res.json.bind(res);
  res.json = (body) => sendJson(repairKnownMojibake(body));
  next();
});
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'");
  next();
});
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

const distPath             = path.join(__dirname, '..', 'dist');
const auditScriptPath         = path.join(__dirname, 'auditar_descarga.ps1');
const unifiedExtractorPath    = path.join(__dirname, 'extraccion_unificada.ps1');
const cachedDataFile          = path.join(__dirname, '..', 'datos_costes_actualizados.json');
const cachedPedidosFile        = path.join(__dirname, '..', 'datos_pedidos_pendientes.json');
const qualityFile             = path.join(__dirname, '..', 'datos_costes_calidad.json');

const CACHE_MAX_AGE_HOURS = 24;
const jsonMemoryCache = new Map();

function readJsonFile(filePath, fallback) {
  try {
    const stats = fs.statSync(filePath);
    const cached = jsonMemoryCache.get(filePath);
    if (cached?.mtimeMs === stats.mtimeMs && cached?.size === stats.size) return cached.value;
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    // Repara texto heredado de extracciones ejecutadas por Windows PowerShell
    // antes de guardar el resultado en la caché de memoria.
    const value = repairKnownMojibake(JSON.parse(raw));
    jsonMemoryCache.set(filePath, { mtimeMs: stats.mtimeMs, size: stats.size, value });
    return value;
  } catch {
    return fallback;
  }
}

// ─── Helper: read cached JSON safely ────────────────────────────────────────
function readCache() {
  const data = readJsonFile(cachedDataFile, null);
  return data === null ? null : (Array.isArray(data) ? data : []);
}

function readPedidosCache() {
  const data = readJsonFile(cachedPedidosFile, []);
  return Array.isArray(data) ? data : [];
}

function readQuality() {
  return readJsonFile(qualityFile, null);
}

function cacheAgeHours() {
  if (!fs.existsSync(cachedDataFile)) return null;
  const mtime = fs.statSync(cachedDataFile).mtime;
  return (Date.now() - mtime.getTime()) / 3600000;
}

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const cache = readCache();
  const quality = readQuality();
  const ageH = cacheAgeHours();
  const pedidos = readPedidosCache();
  res.json({
    status: 'ONLINE',
    driver: ERP_CONFIG.driver,
    hostName: ERP_CONFIG.hostName,
    hostIp: ERP_CONFIG.hostIp,
    cachedRecords: cache ? cache.length : 0,
    cachedPedidos: pedidos.length,
    cacheDate: fs.existsSync(cachedDataFile) ? fs.statSync(cachedDataFile).mtime.toISOString() : null,
    cacheAgeHours: ageH !== null ? Math.round(ageH * 100) / 100 : null,
    cacheStale: ageH !== null && ageH > CACHE_MAX_AGE_HOURS,
    cacheOnly: CACHE_ONLY,
    quality: quality,
    timestamp: new Date().toISOString()
  });
});

// ─── Helper: ejecutar el extractor unificado ────────────────────────────────
function runUnifiedExtractor(callback) {
  if (CACHE_ONLY) return callback(new Error('Servidor configurado en modo de solo caché'), null);
  if (!ERP_CONFIG.user || !ERP_CONFIG.password) {
    return callback(new Error('Faltan TLM_USER o TLM_PASSWORD en el archivo .env'), null);
  }
  if (refreshRunning) return callback(new Error('Ya hay una actualización del ERP en curso'), null);
  refreshRunning = true;
  execFile('powershell.exe',
    ['-ExecutionPolicy', 'Bypass', '-File', unifiedExtractorPath],
    { maxBuffer: 50 * 1024 * 1024, timeout: 600000 },
    (error, stdout) => {
      refreshRunning = false;
      if (error) return callback(error, null);
      try {
        const status = parsePowerShellJson(stdout);
        callback(null, status);
      } catch {
        callback(null, { raw: stdout.slice(0, 500) });
      }
    }
  );
}

// ─── Trigger Full Load ───────────────────────────────────────────────────────
app.post('/api/trigger-full-load', (req, res) => {
  runUnifiedExtractor((error, status) => {
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({
      success: !!status.success,
      message: 'Carga completa finalizada (extractor unificado).',
      status,
      quality: readQuality(),
      deprecated: true,
      useInstead: '/api/refresh-erp'
    });
  });
});

app.post('/api/refresh-erp', (req, res) => {
  runUnifiedExtractor((error, status) => {
    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({
      success: !!status.success,
      message: 'Lectura ERP completada.',
      status,
      quality: readQuality()
    });
  });
});

// ─── Pedidos Pendientes de Recepcionar API ─────────────────────────────────
app.get('/api/pedidos-pendientes', (req, res) => {
  const pedidos = readPedidosCache();
  res.json({
    success: true,
    ...calculateOrderSummary(pedidos),
    data: pedidos
  });
});

// ─── Quality / estado de frescura ─────────────────────────────────────────
app.get('/api/calidad', (req, res) => {
  const quality = readQuality();
  const ageH = cacheAgeHours();
  res.json({
    success: true,
    quality,
    cacheDate: fs.existsSync(cachedDataFile) ? fs.statSync(cachedDataFile).mtime.toISOString() : null,
    cacheAgeHours: ageH !== null ? Math.round(ageH * 100) / 100 : null,
    cacheStale: ageH !== null && ageH > CACHE_MAX_AGE_HOURS,
    cacheMaxAgeHours: CACHE_MAX_AGE_HOURS,
    timestamp: new Date().toISOString()
  });
});

// ─── Catalogos dependientes ────────────────────────────────────────────────
app.get('/api/catalogos', (req, res) => {
  const cache = readCache();
  if (cache === null) return res.status(503).json({ success: false, error: 'Sin caché disponible' });

  const grupos = new Map();
  const subgruposPorGrupo = new Map();
  const marcasPorGrupo = new Map();
  const subgruposPorGrupoMarca = new Map();
  const empresas = new Map();
  const delegacionesPorEmpresa = new Map();
  const articulosVistos = new Set();

  for (const a of cache) {
    const esArticuloNuevo = !articulosVistos.has(a.cod_art);
    if (esArticuloNuevo) articulosVistos.add(a.cod_art);

    const gId = (a.cod_grc || '').toString().trim() || 'SIN_GRUPO';
    const gNombre = (a.nom_grc || '').toString().trim() || gId;
    const gDescripcion = (a.des_grc || a.descripcion_grupo || '').toString().trim();
    const mId = (a.cod_mar || a.nom_mar || '').toString().trim() || 'SIN_MARCA';
    const mNombre = (a.nom_mar || '').toString().trim() || mId;
    const sId = (a.cod_gru || '').toString().trim() || 'SIN_SUBGRUPO';
    const sNombre = (a.nom_gru || '').toString().trim() || sId;
    const sDescripcion = (a.des_gru || a.descripcion_subgrupo || '').toString().trim();
    const idComp = `${gId}|${sId}`;

    if (esArticuloNuevo) {
      if (!grupos.has(gId)) grupos.set(gId, { id: gId, nombre: gNombre, descripcion: gDescripcion, count: 0 });
      grupos.get(gId).count++;

      if (!subgruposPorGrupo.has(gId)) subgruposPorGrupo.set(gId, new Map());
      const s = subgruposPorGrupo.get(gId);
      if (!s.has(sId)) s.set(sId, { id: idComp, subgrupo_id: sId, grupo_id: gId, nombre: sNombre, descripcion: sDescripcion, count: 0 });
      s.get(sId).count++;

      if (!marcasPorGrupo.has(gId)) marcasPorGrupo.set(gId, new Map());
      const m = marcasPorGrupo.get(gId);
      if (!m.has(mId)) m.set(mId, { id: mId, nombre: mNombre, count: 0 });
      m.get(mId).count++;

      const keyGM = `${gId}|${mId}`;
      if (!subgruposPorGrupoMarca.has(keyGM)) subgruposPorGrupoMarca.set(keyGM, new Set());
      subgruposPorGrupoMarca.get(keyGM).add(sId);
    }

    if (a.empresa_id) {
      if (!empresas.has(a.empresa_id)) empresas.set(a.empresa_id, { id: a.empresa_id, nombre: a.empresa_nombre || a.empresa_id });
      if (!delegacionesPorEmpresa.has(a.empresa_id)) delegacionesPorEmpresa.set(a.empresa_id, new Map());
      const dmap = delegacionesPorEmpresa.get(a.empresa_id);
      if (a.delegacion_id && !dmap.has(a.delegacion_id)) {
        dmap.set(a.delegacion_id, { id: a.delegacion_id, nombre: a.delegacion_nombre || a.delegacion_id });
      }
    }
  }

  res.json({
    success: true,
    grupos: Array.from(grupos.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    subgruposPorGrupo: Object.fromEntries(
      Array.from(subgruposPorGrupo.entries()).map(([gId, s]) => [
        gId,
        Array.from(s.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
      ])
    ),
    subgruposPorGrupoMarca: Object.fromEntries(
      Array.from(subgruposPorGrupoMarca.entries()).map(([k, sset]) => [k, Array.from(sset)])
    ),
    marcasPorGrupo: Object.fromEntries(
      Array.from(marcasPorGrupo.entries()).map(([gId, m]) => [
        gId,
        Array.from(m.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
      ])
    ),
    empresas: Array.from(empresas.values()).sort((a, b) => a.id.localeCompare(b.id)),
    delegacionesPorEmpresa: Object.fromEntries(
      Array.from(delegacionesPorEmpresa.entries()).map(([eId, dmap]) => [
        eId,
        Array.from(dmap.values()).sort((a, b) => a.id.localeCompare(b.id))
      ])
    ),
    totalArticulos: articulosVistos.size
  });
});

// ─── Audit Status ────────────────────────────────────────────────────────────
app.get('/api/audit-status', (req, res) => {
  const force = req.query.force === 'true' || req.query.live === 'true';
  const cache = readCache();
  const quality = readQuality();
  const cacheSize = fs.existsSync(cachedDataFile) ? fs.statSync(cachedDataFile).size : 0;

  if (!force && cache !== null) {
    return res.json({
      success: true,
      mode: 'CACHE_AUDIT',
      audit: {
        totalInDb: quality ? (quality.total_articulos || quality.total_filas) : 29754,
        downloaded: cache.length,
        percentage: 100,
        fileSizeMb: parseFloat((cacheSize / 1024 / 1024).toFixed(2)),
        cacheDate: fs.existsSync(cachedDataFile) ? fs.statSync(cachedDataFile).mtime.toISOString() : null,
        cacheAgeHours: cacheAgeHours(),
        quality: quality,
        timestamp: new Date().toISOString()
      }
    });
  }

  execFile('powershell.exe',
    ['-ExecutionPolicy', 'Bypass', '-File', auditScriptPath],
    { maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
    (error, stdout) => {
      if (error) {
        return res.json({
          success: true,
          mode: 'CACHE_FALLBACK',
          audit: {
            totalInDb: quality ? quality.total_articulos : 29754,
            downloaded: cache ? cache.length : 0,
            percentage: 100,
            fileSizeMb: parseFloat((cacheSize / 1024 / 1024).toFixed(2)),
            cacheDate: fs.existsSync(cachedDataFile) ? fs.statSync(cachedDataFile).mtime.toISOString() : null,
            cacheAgeHours: cacheAgeHours(),
            quality: quality,
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
      try {
        const data = parsePowerShellJson(stdout);
        res.json({
          success: true,
          mode: 'LIVE_ODBC_AUDIT',
          audit: {
            totalInDb: data.totalInDb || (quality ? quality.total_articulos : 29754),
            downloaded: data.downloaded || (cache ? cache.length : 0),
            percentage: data.percentage || 100,
            fileSizeMb: parseFloat((cacheSize / 1024 / 1024).toFixed(2)),
            cacheDate: fs.existsSync(cachedDataFile) ? fs.statSync(cachedDataFile).mtime.toISOString() : null,
            cacheAgeHours: cacheAgeHours(),
            quality: quality,
            timestamp: data.timestamp || new Date().toISOString()
          }
        });
      } catch {
        res.json({
          success: true,
          mode: 'CACHE_FALLBACK',
          audit: {
            totalInDb: quality ? quality.total_articulos : 29754,
            downloaded: cache ? cache.length : 0,
            percentage: 100,
            fileSizeMb: parseFloat((cacheSize / 1024 / 1024).toFixed(2)),
            quality: quality,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  );
});

// ─── Helper: parsear filtros multi-valor ─────────────────────────────────────
function parseMulti(v) {
  if (!v || v === 'ALL' || v === '') return null;
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
}

// ─── Filtrado en servidor ────────────────────────────────────────────────────
function applyFilters(cache, q) {
  const grupos = parseMulti(q.grupoMarca);
  const marcas = parseMulti(q.marca);
  const subgruposComp = parseMulti(q.subgrupo);
  const empresas = parseMulti(q.empresa);
  const delegaciones = parseMulti(q.delegacion);
  const search = q.search ? q.search.toLowerCase().trim() : null;
  const stockFilter = q.stockFilter || 'ALL';
  const costoFilter = q.costoFilter || 'ALL';

  let subgrupoPorGrupo = null;
  if (subgruposComp) {
    subgrupoPorGrupo = {};
    for (const sc of subgruposComp) {
      const sep = sc.indexOf('|');
      if (sep > 0) {
        const g = sc.slice(0, sep);
        const s = sc.slice(sep + 1);
        if (!subgrupoPorGrupo[s]) subgrupoPorGrupo[s] = new Set();
        subgrupoPorGrupo[s].add(g);
      } else {
        if (!subgrupoPorGrupo[sc]) subgrupoPorGrupo[sc] = null;
      }
    }
  }

  const gruposUpper = grupos ? grupos.map(g => g.toUpperCase()) : null;

  const filtered = cache.filter(a => {
    const aG = (a.cod_grc || a.nom_grc || '').toString().trim().toUpperCase();
    if (gruposUpper && !gruposUpper.some(g => g === aG || aG.startsWith(g))) return false;
    if (marcas && !marcas.includes(a.cod_mar || a.nom_mar || '')) return false;

    if (subgrupoPorGrupo) {
      const aSRaw = (a.cod_gru || a.nom_gru || '').toString().trim();
      const aSNorm = aSRaw.replace(/^0+/, '');
      let matchSub = false;

      for (const [sKey, gSet] of Object.entries(subgrupoPorGrupo)) {
        const sKeyNorm = sKey.trim().replace(/^0+/, '');
        if (sKey === aSRaw || sKeyNorm === aSNorm || aSRaw.endsWith(sKey)) {
          if (!gSet || gSet.has(aG) || Array.from(gSet).some(g => g.toUpperCase() === aG)) {
            matchSub = true;
            break;
          }
        }
      }
      if (!matchSub) return false;
    }

    if (empresas && a.empresa_id && !empresas.includes(a.empresa_id)) return false;
    if (delegaciones && a.delegacion_id && !delegaciones.includes(a.delegacion_id)) return false;

    if (search) {
      const hay = ((a.cod_art || '') + ' ' + (a.ref_art || '') + ' ' + (a.nom_art || '') + ' ' + (a.nom_mar || '')).toLowerCase();
      if (!hay.includes(search)) return false;
    }

    const stock = a.stock_disp || 0;
    if (stockFilter === 'CON_STOCK' && stock <= 0) return false;
    if (stockFilter === 'SIN_STOCK' && stock > 0) return false;
    if (stockFilter === 'BAJO_STOCK' && (stock <= 0 || stock > 15)) return false;

    const c = a.cos_art || 0;
    if (costoFilter !== 'ALL') {
      if (a.sin_coste && costoFilter !== 'SIN_COSTE') return false;
      if (!a.sin_coste && costoFilter === 'SIN_COSTE') return false;
      if (costoFilter === '0-1' && (c <= 0 || c >= 1)) return false;
      if (costoFilter === '1-5' && (c < 1 || c >= 5)) return false;
      if (costoFilter === '5-20' && (c < 5 || c >= 20)) return false;
      if (costoFilter === '20-50' && (c < 20 || c >= 50)) return false;
      if (costoFilter === '50-100' && (c < 50 || c >= 100)) return false;
      if (costoFilter === '100+' && c < 100) return false;
    }

    return true;
  });

  let totalStock = 0, totalVal = 0;
  const cods = new Set();
  for (const r of filtered) {
    totalStock += r.stock_disp || 0;
    totalVal += r.valoracion || 0;
    cods.add(r.cod_art);
  }

  return {
    rows: filtered,
    totals: { stock_disp: totalStock, valoracion: totalVal, articulos_unicos: cods.size }
  };
}

// ─── Datos de costes ─────────────────────────────────────────────────────────
app.get('/api/incremental-sync', async (req, res) => {
  const startTime = Date.now();
  const mode = (req.query.mode || 'cache').toLowerCase();

  if (mode === 'live') {
    return execFile('powershell.exe',
      ['-ExecutionPolicy', 'Bypass', '-File', unifiedExtractorPath],
      { maxBuffer: 50 * 1024 * 1024, timeout: 600000 },
      (error) => {
        if (error) return res.status(500).json({ success: false, error: error.message });
        const freshData = readCache();
        const result = req.query.sinFiltros
          ? { rows: freshData || [], totals: { stock_disp: 0, valoracion: 0, articulos_unicos: 0 } }
          : applyFilters(freshData || [], req.query);
        const pg = paginate(result.rows, req.query.page, req.query.pageSize);
        const stats = fs.statSync(cachedDataFile);
        return res.json({
          success: true,
          mode: 'ERP_LIVE',
          source: `ODBC ${ERP_CONFIG.dsn} @ ${ERP_CONFIG.hostName}`,
          totalRecords: freshData ? freshData.length : 0,
          filteredRecords: result.rows.length,
          totals: result.totals,
          page: pg.page,
          pageSize: pg.pageSize,
          totalPages: pg.totalPages,
          latencyMs: Date.now() - startTime,
          cacheDate: stats.mtime.toISOString(),
          cacheAgeHours: 0,
          cacheStale: false,
          data: pg.pageData
        });
      }
    );
  }

  const data = readCache();
  if (data === null) {
    return res.status(503).json({
      success: false,
      mode: 'CACHE_MISS',
      error: 'No hay caché disponible. Use mode=live para consultar el ERP.'
    });
  }

  const stats = fs.statSync(cachedDataFile);
  const ageH = (Date.now() - stats.mtime.getTime()) / 3600000;
  const result = req.query.sinFiltros
    ? { rows: data, totals: { stock_disp: 0, valoracion: 0, articulos_unicos: 0 } }
    : applyFilters(data, req.query);
  const pg = paginate(result.rows, req.query.page, req.query.pageSize);

  return res.json({
    success: true,
    mode: 'CACHE',
    source: `Caché local (datos_costes_actualizados.json @ ${ERP_CONFIG.hostName})`,
    totalRecords: data.length,
    filteredRecords: result.rows.length,
    totals: result.totals,
    page: pg.page,
    pageSize: pg.pageSize,
    totalPages: pg.totalPages,
    latencyMs: Date.now() - startTime,
    cacheDate: stats.mtime.toISOString(),
    cacheAgeHours: Math.round(ageH * 100) / 100,
    cacheStale: ageH > CACHE_MAX_AGE_HOURS,
    cacheMaxAgeHours: CACHE_MAX_AGE_HOURS,
    quality: readQuality(),
    data: pg.pageData
  });
});

app.get('/api/live-costes-odbc', (req, res) => {
  const data = readCache();
  if (data === null) {
    return res.status(503).json({
      success: false,
      error: 'Sin caché. Use /api/refresh-erp para consultar el ERP.',
      deprecated: true,
      useInstead: '/api/incremental-sync'
    });
  }
  const stats = fs.statSync(cachedDataFile);
  return res.json({
    success: true,
    mode: 'CACHE',
    source: `Caché local @ ${ERP_CONFIG.hostName}`,
    driver: ERP_CONFIG.driver,
    cacheDate: stats.mtime.toISOString(),
    count: data.length,
    data,
    deprecated: true,
    useInstead: '/api/incremental-sync'
  });
});

// ─── Serve Static React Frontend ─────────────────────────────────────────────
app.use(express.static(distPath));

// SPA fallback — Express 5 compatible
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  next();
});

const server = app.listen(PORT, '0.0.0.0', () => {
  const cache = readCache();
  const pedidos = readPedidosCache();
  console.log(`╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  Dashboard Costes Medios — Servidor Unificado            ║`);
  console.log(`║  URL:     http://localhost:${PORT}                         ║`);
  console.log(`║  ODBC:    Progress OpenEdge 11.7 (${ERP_CONFIG.user ? 'configurado' : 'sin credenciales'})`);
  console.log(`║  Dataset: ${cache ? cache.length.toLocaleString('es-ES') + ' filas de detalle' : 'Sin caché'}`);
  console.log(`║  Pedidos: ${pedidos.length.toLocaleString('es-ES') + ' líneas pendientes de recepcionar'}`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);
});

function shutdown(signal) {
  console.log(`[Server] ${signal}: cerrando conexiones…`);
  server.close((error) => process.exit(error ? 1 : 0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
