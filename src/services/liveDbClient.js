// Cliente de datos del Dashboard de Costes Medios (Telematel GoManage ERP).
// Modelo de filas de detalle: una fila por (articulo + empresa + delegacion).

export const SERVER_CONFIG = {
  hostName: 'dataserver',
  ip: '192.168.1.3',
  driver: 'Progress OpenEdge 11.7 Driver',
  apiProxyUrl: '/api'
};

export const EMPRESAS_DELEGACIONES = [
  { empresaId: '03', empresaNombre: '03 San Pedro',
    delegaciones: [{ id: '00', nombre: '00 Electricidad' }, { id: '10', nombre: '10 Fontanería' }] },
  { empresaId: '04', empresaNombre: '04 Estepona',
    delegaciones: [{ id: '00', nombre: '00 Electricidad' }, { id: '10', nombre: '10 Fontanería' }] },
  { empresaId: '05', empresaNombre: '05 Marbella',
    delegaciones: [{ id: '00', nombre: '00 Marbella' }] }
];

export const SCHEMA_MAPPINGS = [
  { tablaBD: 'PUB.galartic', tagAPI: 'products', descripcion: 'Maestro de Artículos (dep_art, cos_art, cod_grc, cod_gru)' },
  { tablaBD: 'PUB.galmarca', tagAPI: 'brands', descripcion: 'Maestro de Marcas de Fabricantes' },
  { tablaBD: 'PUB.galartal', tagAPI: 'stock', descripcion: 'Existencias por empresa/delegación (can_tal, cod_ent, cod_del)' },
  { tablaBD: 'PUB.gvpclin', tagAPI: 'orders', descripcion: 'Líneas de Pedidos Pendientes de Recepcionar (cpe_lpc, cse_lpc, imp_lpc)' }
];

export async function fetchServerInfo() {
  try {
    const res = await fetch(`${SERVER_CONFIG.apiProxyUrl}/health`);
    if (res.ok) {
      const data = await res.json();
      SERVER_CONFIG.ip = data.hostIp || SERVER_CONFIG.ip;
      SERVER_CONFIG.hostName = data.hostName || SERVER_CONFIG.hostName;
      SERVER_CONFIG.driver = data.driver || SERVER_CONFIG.driver;
      return data;
    }
  } catch (e) { console.warn('Server info fetch error:', e.message); }
  return null;
}

export async function fetchCatalogos() {
  try {
    const res = await fetch(`${SERVER_CONFIG.apiProxyUrl}/catalogos`);
    if (res.ok) return await res.json();
  } catch (e) { console.warn('Catalogos fetch error:', e.message); }
  return { success: false, grupos: [], marcasPorGrupo: {}, subgruposPorGrupoMarca: {}, empresas: [], delegacionesPorEmpresa: {} };
}

export async function fetchCalidad() {
  try {
    const res = await fetch(`${SERVER_CONFIG.apiProxyUrl}/calidad`);
    if (res.ok) return await res.json();
  } catch (e) { console.warn('Calidad fetch error:', e.message); }
  return null;
}

export async function fetchAuditStatus(force = false) {
  try {
    const res = await fetch(`${SERVER_CONFIG.apiProxyUrl}/audit-status${force ? '?force=true' : ''}`);
    if (res.ok) return await res.json();
  } catch (e) { console.warn('Audit status fetch error:', e.message); }
  return null;
}

export async function refreshErpNow() {
  try {
    const res = await fetch(`${SERVER_CONFIG.apiProxyUrl}/refresh-erp`, { method: 'POST' });
    if (res.ok) return await res.json();
  } catch (e) { console.warn('Refresh ERP error:', e.message); }
  return { success: false };
}

export async function fetchPendingOrders() {
  try {
    const res = await fetch(`${SERVER_CONFIG.apiProxyUrl}/pedidos-pendientes`);
    if (res.ok) return await res.json();
  } catch (e) { console.warn('Pedidos pendientes fetch error:', e.message); }
  return { success: false, data: [] };
}

// Filtros multi-valor. Convención: [] = sin filtro, [id,...] = seleccionado.
export async function fetchLiveDatabaseData(filters = {}, mode = 'cache', page = 0, pageSize = 0) {
  const startTime = Date.now();
  const params = new URLSearchParams();
  params.set('mode', mode);

  const joinMulti = (arr) => {
    if (!arr || arr.length === 0) return null;
    return arr.join(',');
  };

  const g = joinMulti(filters.grupos);
  const m = joinMulti(filters.marcas);
  const s = joinMulti(filters.subgrupos);
  const e = joinMulti(filters.empresas);
  const d = joinMulti(filters.delegaciones);

  if (g) params.set('grupoMarca', g);
  if (m) params.set('marca', m);
  if (s) params.set('subgrupo', s);
  if (e) params.set('empresa', e);
  if (d) params.set('delegacion', d);
  if (filters.searchTerm && filters.searchTerm.trim()) params.set('search', filters.searchTerm.trim());
  if (filters.stockFilter && filters.stockFilter !== 'ALL') params.set('stockFilter', filters.stockFilter);
  if (filters.costoFilter && filters.costoFilter !== 'ALL') params.set('costoFilter', filters.costoFilter);
  if (page > 0) { params.set('page', page); params.set('pageSize', pageSize || 50); }

  try {
    const response = await fetch(`${SERVER_CONFIG.apiProxyUrl}/incremental-sync?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000)
    });
    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        mode: result.mode,
        source: result.source,
        extractedAt: result.cacheDate,
        cacheAgeHours: result.cacheAgeHours,
        cacheStale: result.cacheStale,
        cacheMaxAgeHours: result.cacheMaxAgeHours,
        quality: result.quality,
        articles: normalizeRows(result.data || []),
        totals: result.totals || { stock_disp: 0, valoracion: 0, articulos_unicos: 0 },
        totalRecords: result.totalRecords,
        filteredRecords: result.filteredRecords,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
        latencyMs: Date.now() - startTime
      };
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (err) {
    console.warn('fetchLiveDatabaseData error:', err.message);
    return {
      success: false, mode: 'ERROR', error: err.message,
      articles: [], totals: { stock_disp: 0, valoracion: 0, articulos_unicos: 0 },
      latencyMs: Date.now() - startTime
    };
  }
}

export function buildUnifiedRows(detailRows) {
  const map = new Map();
  for (const r of detailRows) {
    if (!map.has(r.cod_art)) {
      map.set(r.cod_art, {
        cod_art: r.cod_art,
        ref_art: r.ref_art,
        nom_art: r.nom_art,
        cod_mar: r.cod_mar,
        nom_mar: r.nom_mar,
        cod_grc: r.cod_grc,
        nom_grc: r.nom_grc,
        cod_gru: r.cod_gru,
        nom_gru: r.nom_gru,
        empresas: new Set(),
        delegaciones: new Set(),
        stock_unificado: 0,
        valoracion_unificada: 0,
        costes: [],
        fecha_actualizacion: r.fecha_actualizacion
      });
    }
    const u = map.get(r.cod_art);
    if (r.empresa_id) u.empresas.add(r.empresa_nombre || r.empresa_id);
    if (r.delegacion_id) u.delegaciones.add(`${r.empresa_nombre || r.empresa_id} / ${r.delegacion_nombre || r.delegacion_id}`);
    u.stock_unificado += r.stock_disp || 0;
    u.valoracion_unificada += r.valoracion || 0;
    if (!r.sin_coste) u.costes.push(r.cos_art || 0);
  }

  const rows = [];
  for (const u of map.values()) {
    const costes = u.costes;
    const distinct = costes.length > 1 ? Math.max(...costes) - Math.min(...costes) > 0.0001 : false;
    const costeMedio = u.stock_unificado > 0
      ? u.valoracion_unificada / u.stock_unificado
      : null;
    rows.push({
      cod_art: u.cod_art,
      ref_art: u.ref_art,
      nom_art: u.nom_art,
      cod_mar: u.cod_mar,
      nom_mar: u.nom_mar,
      cod_grc: u.cod_grc,
      nom_grc: u.nom_grc,
      cod_gru: u.cod_gru,
      nom_gru: u.nom_gru,
      empresas: Array.from(u.empresas).join(', '),
      delegaciones: Array.from(u.delegaciones).join(', '),
      stock_unificado: u.stock_unificado,
      valoracion_unificada: u.valoracion_unificada,
      coste_medio_unificado: costeMedio,
      diferencia_coste: distinct ? 'Sí' : 'No',
      coste_min: costes.length ? Math.min(...costes) : null,
      coste_max: costes.length ? Math.max(...costes) : null,
      fecha_actualizacion: u.fecha_actualizacion
    });
  }
  return rows.sort((a, b) => b.valoracion_unificada - a.valoracion_unificada);
}

function normalizeRows(rows) {
  return rows.map(r => {
    const cos = Number(r.cos_art || 0) || 0;
    const sinCoste = !!r.sin_coste || cos <= 0;
    const stock = Number(r.stock_disp || 0) || 0;
    return {
      cod_art: r.cod_art || '',
      ref_art: r.ref_art || '',
      nom_art: r.nom_art || '',
      cod_mar: r.cod_mar || '',
      nom_mar: r.nom_mar || '',
      cod_grc: r.cod_grc || '',
      nom_grc: r.nom_grc || r.cod_grc || '',
      cod_gru: r.cod_gru || '',
      nom_gru: r.nom_gru || r.cod_gru || '',
      empresa_id: r.empresa_id || '',
      empresa_nombre: r.empresa_nombre || '',
      delegacion_id: r.delegacion_id || '',
      delegacion_nombre: r.delegacion_nombre || '',
      cos_art: cos,
      stock_disp: stock,
      valoracion: Number(r.valoracion || 0) || (cos * stock),
      moneda: r.moneda || 'EUR',
      sin_coste: sinCoste,
      fecha_actualizacion: r.fecha_actualizacion || null
    };
  });
}

export function calculateKpis(rows) {
  let totalFilas = rows.length;
  let totalStockUnits = 0;
  let totalValuation = 0;
  let conCoste = 0;
  let sinCoste = 0;
  let conStock = 0;
  const cods = new Set();

  rows.forEach(r => {
    totalStockUnits += r.stock_disp || 0;
    totalValuation += r.valoracion || 0;
    if (r.sin_coste) sinCoste++; else conCoste++;
    if ((r.stock_disp || 0) > 0) conStock++;
    cods.add(r.cod_art);
  });

  const totalArticles = cods.size;
  const averageCost = conCoste > 0
    ? rows.filter(r => !r.sin_coste).reduce((s, r) => s + r.cos_art, 0) / conCoste
    : 0;

  return {
    totalFilas,
    totalArticles,
    totalStockUnits,
    totalValuation,
    averageCost,
    conCoste,
    sinCoste,
    conStock,
    sinStock: totalFilas - conStock
  };
}

export function buildStockMatrix(rows, codArt) {
  const matrix = {};
  for (const r of rows) {
    if (r.cod_art !== codArt) continue;
    if (!r.empresa_id) continue;
    const key = `${r.empresa_id}-${r.delegacion_id}`;
    matrix[key] = (matrix[key] || 0) + (r.stock_disp || 0);
  }
  return matrix;
}
