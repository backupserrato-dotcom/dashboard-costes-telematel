import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
  user: process.env.TLM_USER || 'userSQL',
  password: process.env.TLM_PASSWORD || 'userSQL',
  hostName: process.env.TLM_HOST_NAME || 'dataserver',
  hostIp: process.env.TLM_HOST_IP || '192.168.1.3',
  driver: 'Progress OpenEdge 11.7 Driver',
};

const app = express();
const PORT = 3000;

// Global error guards — prevent any unhandled promise/exception from crashing the server
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception (server continues):', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection (server continues):', reason);
});

app.use(cors());
app.use(express.json());

const distPath             = path.join(__dirname, '..', 'dist');
const auditScriptPath         = path.join(__dirname, 'auditar_descarga.ps1');
const unifiedExtractorPath    = path.join(__dirname, 'extraccion_unificada.ps1');
const cachedDataFile          = path.join(__dirname, '..', 'datos_costes_actualizados.json');
const cachedPedidosFile        = path.join(__dirname, '..', 'datos_pedidos_pendientes.json');
const qualityFile             = path.join(__dirname, '..', 'datos_costes_calidad.json');

const CACHE_MAX_AGE_HOURS = 24;

// ─── Helper: read cached JSON safely ────────────────────────────────────────
function readCache() {
  try {
    const raw = fs.readFileSync(cachedDataFile, 'utf8').replace(/^\uFEFF/, '');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}

function readPedidosCache() {
  try {
    const raw = fs.readFileSync(cachedPedidosFile, 'utf8').replace(/^\uFEFF/, '');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function readQuality() {
  try {
    const raw = fs.readFileSync(qualityFile, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch {
    return null;
  }
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
    quality: quality,
    timestamp: new Date().toISOString()
  });
});

// ─── Helper: ejecutar el extractor unificado ────────────────────────────────
function runUnifiedExtractor(callback) {
  execFile('powershell.exe',
    ['-ExecutionPolicy', 'Bypass', '-File', unifiedExtractorPath],
    { maxBuffer: 50 * 1024 * 1024, timeout: 600000 },
    (error, stdout) => {
      if (error) return callback(error, null);
      try {
        const lines = stdout.trim().split('\n');
        const jsonLine = lines.reverse().find(l => l.trim().startsWith('{'));
        const status = jsonLine ? JSON.parse(jsonLine.replace(/^\uFEFF/, '')) : { raw: stdout };
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
  
  // Calculate exact total metrics
  let totalImportePendiente = 0;
  let totalUnidadesPendientes = 0;
  const pedidosUnicos = new Set();
  const articulosUnicos = new Set();

  for (const p of pedidos) {
    totalImportePendiente += p.importe_pendiente || 0;
    totalUnidadesPendientes += p.unidades_pendientes || 0;
    if (p.pedido_id) pedidosUnicos.add(p.pedido_id);
    if (p.cod_art) articulosUnicos.add(p.cod_art);
  }

  res.json({
    success: true,
    totalLineas: pedidos.length,
    totalPedidosUnicos: pedidosUnicos.size,
    totalArticulosUnicos: articulosUnicos.size,
    totalUnidadesPendientes: Math.round(totalUnidadesPendientes * 100) / 100,
    totalImportePendiente: Math.round(totalImportePendiente * 100) / 100,
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
  const cache = readCache();
  if (cache !== null) {
    const cacheSize = fs.existsSync(cachedDataFile) ? fs.statSync(cachedDataFile).size : 0;
    const quality = readQuality();
    return res.json({
      success: true,
      audit: {
        totalInDb: quality ? quality.total_articulos : null,
        downloaded: cache.length,
        percentage: null,
        fileSizeMb: parseFloat((cacheSize / 1024 / 1024).toFixed(2)),
        cacheDate: fs.existsSync(cachedDataFile) ? fs.statSync(cachedDataFile).mtime.toISOString() : null,
        cacheAgeHours: cacheAgeHours(),
        timestamp: new Date().toISOString()
      }
    });
  }

  execFile('powershell.exe',
    ['-ExecutionPolicy', 'Bypass', '-File', auditScriptPath],
    { maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
    (error, stdout) => {
      if (error) return res.status(500).json({ success: false, error: error.message });
      try {
        const data = JSON.parse(stdout.trim().replace(/^\uFEFF/, ''));
        res.json({ success: true, audit: data });
      } catch {
        res.status(500).json({ success: false, error: 'Failed to parse audit json' });
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

  const filtered = cache.filter(a => {
    const aG = a.cod_grc || '';
    if (grupos && !grupos.includes(aG)) return false;
    if (marcas && !marcas.includes(a.cod_mar || a.nom_mar || '')) return false;

    if (subgrupoPorGrupo) {
      const aS = a.cod_gru || '';
      const gSet = subgrupoPorGrupo[aS];
      if (gSet === undefined) return false;
      if (gSet && !gSet.has(aG)) return false;
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

  const paginate = (data) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 0;
    if (pageSize > 0) {
      const start = (page - 1) * pageSize;
      return { page, pageSize, totalPages: Math.ceil(data.length / pageSize) || 1, pageData: data.slice(start, start + pageSize) };
    }
    return { page: 1, pageSize: 0, totalPages: 1, pageData: data };
  };

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
        const pg = paginate(result.rows);
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
  const pg = paginate(result.rows);

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

app.listen(PORT, '0.0.0.0', () => {
  const cache = readCache();
  const pedidos = readPedidosCache();
  console.log(`╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  Dashboard Costes Medios — Servidor Unificado            ║`);
  console.log(`║  URL:     http://localhost:${PORT}                         ║`);
  console.log(`║  ODBC:    Progress OpenEdge 11.7 (userSQL@dataserver)    ║`);
  console.log(`║  Dataset: ${cache ? cache.length.toLocaleString('es-ES') + ' filas de detalle' : 'Sin caché'}`);
  console.log(`║  Pedidos: ${pedidos.length.toLocaleString('es-ES') + ' líneas pendientes de recepcionar'}`);
  console.log(`╚══════════════════════════════════════════════════════════╝`);
});
