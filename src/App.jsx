import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar';
import FilterBar from './components/FilterBar';
import KpiCards from './components/KpiCards';
import ArticlesTable from './components/ArticlesTable';
import UnifiedCostTable from './components/UnifiedCostTable';
import PurchasingManagementTable from './components/PurchasingManagementTable';
import DelegationsBreakdown from './components/DelegationsBreakdown';
import Listin11View, { parseCableSectionAndColor } from './components/Listin11View';
import ApiConnectorView from './components/ApiConnectorView';
import DataTrustBar from './components/DataTrustBar';
import {
  fetchLiveDatabaseData, fetchServerInfo, fetchCatalogos, refreshErpNow, fetchPendingOrders,
  calculateKpis, buildStockMatrix, buildUnifiedRows, EMPRESAS_DELEGACIONES, SERVER_CONFIG
} from './services/liveDbClient';
import { RefreshCw, Database } from 'lucide-react';
import * as XLSX from 'xlsx';

const EMPTY_FILTERS = {
  grupos: [], marcas: [], subgrupos: [],
  empresas: [], delegaciones: [],
  searchTerm: '', stockFilter: 'ALL', costoFilter: 'ALL'
};

export default function App() {
  const [activeTab, setActiveTab] = useState('tabla');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ stock_disp: 0, valoracion: 0, articulos_unicos: 0 });
  const [pendingOrders, setPendingOrders] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [catalogos, setCatalogos] = useState({ grupos: [], marcasPorGrupo: {}, subgruposPorGrupo: {}, subgruposPorGrupoMarca: {}, empresas: [], delegacionesPorEmpresa: {} });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [detailFilter, setDetailFilter] = useState('');
  const [pendingScroll, setPendingScroll] = useState(false);

  const loadCache = useCallback(async () => {
    setLoading(true);
    const result = await fetchLiveDatabaseData(filters, 'cache');
    const pedRes = await fetchPendingOrders();
    setRows(result.articles || []);
    setTotals(result.totals || { stock_disp: 0, valoracion: 0, articulos_unicos: 0 });
    setPendingOrders(pedRes.data || []);
    setStatus(result);
    setLoading(false);
  }, [filters]);

  const loadLive = useCallback(async () => {
    setLoading(true);
    await refreshErpNow();
    const result = await fetchLiveDatabaseData(filters, 'live');
    const pedRes = await fetchPendingOrders();
    setRows(result.articles || []);
    setTotals(result.totals || { stock_disp: 0, valoracion: 0, articulos_unicos: 0 });
    setPendingOrders(pedRes.data || []);
    setStatus(result);
    setLoading(false);
  }, [filters]);

  const loadAllForDetail = useCallback(async () => {
    const result = await fetchLiveDatabaseData({}, 'cache', 0, 0);
    setAllRows(result.articles || []);
  }, []);

  useEffect(() => {
    fetchServerInfo();
    fetchCatalogos().then(c => { if (c && c.success) setCatalogos(c); });
    loadCache();
    loadAllForDetail();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) loadCache();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => setFilters(EMPTY_FILTERS);

  const kpiData = useMemo(() => calculateKpis(rows), [rows]);
  const unifiedRows = useMemo(() => buildUnifiedRows(rows), [rows]);
  const masterUnifiedRows = useMemo(() => buildUnifiedRows(allRows.length > 0 ? allRows : rows), [allRows, rows]);

  // Reactive filtering of pending purchase orders using the active FilterBar selections
  const filteredPendingOrders = useMemo(() => {
    return pendingOrders.filter(p => {
      // 1. Empresa Filter
      if (filters.empresas && filters.empresas.length > 0) {
        if (!filters.empresas.includes(p.empresa_id)) return false;
      }
      // 2. Delegación Filter
      if (filters.delegaciones && filters.delegaciones.length > 0) {
        if (!filters.delegaciones.includes(p.delegacion_id)) return false;
      }
      // 3. Brand Filter
      if (filters.marcas && filters.marcas.length > 0) {
        const bName = (p.nom_mar || p.cod_mar || '').trim();
        const match = filters.marcas.some(m => m.toLowerCase() === bName.toLowerCase() || m.toLowerCase() === (p.cod_mar || '').toLowerCase());
        if (!match) return false;
      }
      // 4. Group Filter
      if (filters.grupos && filters.grupos.length > 0) {
        if (!filters.grupos.includes(p.cod_grc)) return false;
      }
      // 5. Search Term Filter
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const term = filters.searchTerm.toLowerCase().trim();
        const haystack = (
          (p.pedido_id || '') + ' ' +
          (p.cod_art || '') + ' ' +
          (p.ref_art || '') + ' ' +
          (p.nom_art || '') + ' ' +
          (p.nom_mar || '') + ' ' +
          (p.razon_social || '') + ' ' +
          (p.empresa_nombre || '') + ' ' +
          (p.delegacion_nombre || '')
        ).toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [pendingOrders, filters]);

  const tabla1Ref = React.createRef();
  const handleSeeDetail = useCallback((codArt) => {
    setDetailFilter(codArt);
    setPendingScroll(true);
    if (activeTab !== 'tabla') setActiveTab('tabla');
  }, [activeTab]);

  useEffect(() => {
    if (pendingScroll && tabla1Ref.current) {
      tabla1Ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPendingScroll(false);
    }
  }, [pendingScroll, tabla1Ref]);

  const handleExportExcel = () => {
    // Hoja 1: detalle por artículo + empresa + delegación
    const exportData = rows.map(r => ({
      'Código Artículo': r.cod_art,
      'Referencia': r.ref_art,
      'Descripción Oficial': r.nom_art,
      'Marca': r.nom_mar || r.cod_mar,
      'Grupo': r.nom_grc || r.cod_grc,
      'Subgrupo': r.nom_gru || r.cod_gru,
      'Empresa': r.empresa_nombre || r.empresa_id,
      'Delegación': r.delegacion_nombre || r.delegacion_id,
      'Coste de ficha (cos_art)': r.sin_coste ? null : r.cos_art,
      'Stock disponible (stock_disp)': r.stock_disp,
      'Valoración': r.sin_coste ? null : r.valoracion,
      'Sin coste': r.sin_coste ? 'Sí' : 'No',
      'Fecha datos': r.fecha_actualizacion || status?.extractedAt || ''
    }));

    // Hoja 2: coste medio unificado general
    const unifiedData = unifiedRows.map(u => ({
      'Código Artículo': u.cod_art,
      'Referencia': u.ref_art,
      'Descripción Oficial': u.nom_art,
      'Marca': u.nom_mar,
      'Grupo': u.nom_grc,
      'Subgrupo': u.nom_gru,
      'Empresas incluidas': u.empresas,
      'Delegaciones incluidas': u.delegaciones,
      'Stock unificado': u.stock_unificado,
      'Coste medio unificado': u.coste_medio_unificado,
      'Valoración unificada': u.valoracion_unificada,
      'Diferencia de coste': u.diferencia_coste,
      'Coste mínimo': u.coste_min,
      'Coste máximo': u.coste_max,
      'Fecha datos': u.fecha_actualizacion || status?.extractedAt || ''
    }));

    // Hoja 3: LISTIN 11 (Grupo 1L y Subgrupo 11) - Cables con costes unificados por sección
    const listin11Base = masterUnifiedRows.filter(r => {
      const grc = (r.cod_grc || '').toString().trim().toUpperCase();
      const gru = (r.cod_gru || '').toString().trim();
      return grc === '1L' && gru === '11';
    });

    const cableSectionStats = {};
    const cableArticles = [];

    for (const u of listin11Base) {
      const parsed = parseCableSectionAndColor(u.nom_art);
      cableArticles.push({ ...u, section: parsed.section, color: parsed.color });
      if (!cableSectionStats[parsed.section]) {
        cableSectionStats[parsed.section] = { stock: 0, val: 0 };
      }
      cableSectionStats[parsed.section].stock += u.stock_unificado || 0;
      cableSectionStats[parsed.section].val += u.valoracion_unificada || 0;
    }

    const listin11ExportData = cableArticles.map(c => {
      const st = cableSectionStats[c.section] || { stock: 0, val: 0 };
      const costeUnif = st.stock > 0 ? st.val / st.stock : (c.coste_medio_unificado || 0);
      const valUnif = (c.stock_unificado || 0) * costeUnif;
      return {
        'Código Artículo': c.cod_art,
        'Ref Fabricante': c.ref_art,
        'Descripción Comercial Cable': c.nom_art,
        'Sección mm²': c.section !== 'OTRA' ? `${c.section} mm²` : '—',
        'Color Conductor': c.color,
        'Stock Unificado (m)': c.stock_unificado,
        'Coste Original ERP (€/m)': c.coste_medio_unificado,
        'Coste Unificado Sección (€/m)': costeUnif,
        'Valoración Original (€)': c.valoracion_unificada,
        'Valoración Unificada Sección (€)': valUnif,
        'Diferencia (€)': valUnif - (c.valoracion_unificada || 0)
      };
    });

    // Hoja 4: Pedidos pendientes de recepcionar
    const ordersData = filteredPendingOrders.map(p => ({
      'Nº Pedido': p.pedido_id,
      'Línea': p.linea_num,
      'Fecha Pedido': p.fecha_pedido,
      'Proveedor / Razón Social': p.razon_social,
      'Código Artículo': p.cod_art,
      'Ref Fabricante': p.ref_art,
      'Descripción Comercial ERP': p.nom_art,
      'Marca': p.nom_mar,
      'Empresa': p.empresa_nombre || p.empresa_id,
      'Delegación': p.delegacion_nombre || p.delegacion_id,
      'Unidades Pedidas': p.unidades_pedidas,
      'Unidades Servidas': p.unidades_servidas,
      'Unidades Pendientes': p.unidades_pendientes,
      'Unidad Medida': p.unidad_medida,
      'Precio Tarifa': p.precio_unitario,
      'Descuento %': p.descuento_pct,
      'Importe Línea Total (€)': p.importe_linea_total,
      'Importe Pendiente Recepcionar (€)': p.importe_pendiente
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportData), 'Detalle Artículos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unifiedData), 'Lista Unificada General');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(listin11ExportData), 'LISTIN 11 (Grupo 1L-11)');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ordersData), 'Pedidos Pendientes');
    XLSX.writeFile(wb, `LISTIN_11_Costes_y_Compras_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-dark-main text-slate-100 flex flex-col">
      <Navbar
        connectionStatus={status}
        onRefreshCache={loadCache}
        onRefreshLive={loadLive}
        onExportExcel={handleExportExcel}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        loading={loading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && (
          <div className="glass-panel p-4 mb-6 flex items-center gap-3 border-l-4 border-l-sky-500">
            <RefreshCw className="w-5 h-5 text-sky-400 animate-spin" />
            <p className="text-sm font-bold text-white">
              {status?.mode === 'ERP_LIVE' ? 'Consultando ERP ahora…' : 'Cargando datos…'}
            </p>
          </div>
        )}

        <DataTrustBar status={status} onRefreshLive={loadLive} />

        <FilterBar filters={filters} setFilters={setFilters} catalogos={catalogos} onReset={handleReset} />

        <KpiCards kpis={kpiData} />

        {activeTab === 'tabla' && (
          <>
            <div ref={tabla1Ref}>
              <ArticlesTable rows={rows} totals={totals} detailFilter={detailFilter} onSelectArticle={(codArt) => setSelectedArticle(codArt)} />
            </div>
            <UnifiedCostTable unifiedRows={unifiedRows} onSeeDetail={handleSeeDetail} />
          </>
        )}
        {activeTab === 'compras' && (
          <PurchasingManagementTable orders={filteredPendingOrders} totalUnfilteredCount={pendingOrders.length} />
        )}
        {activeTab === 'listin11' && (
          <Listin11View unifiedRows={masterUnifiedRows} />
        )}
        {activeTab === 'delegaciones' && <DelegationsBreakdown rows={rows} />}
        {activeTab === 'api' && <ApiConnectorView connectionStatus={status} onRefreshLive={loadLive} />}
      </main>

      {selectedArticle && (
        <ArticleDetailModal codArt={selectedArticle} allRows={allRows} onClose={() => setSelectedArticle(null)} status={status} />
      )}

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        <p className="flex items-center justify-center gap-1.5">
          <Database className="w-3 h-3" />
          Dashboard Costes Medios & Compras • {SERVER_CONFIG.hostName} ({SERVER_CONFIG.ip})
        </p>
      </footer>
    </div>
  );
}

function ArticleDetailModal({ codArt, allRows, onClose, status }) {
  const fmt = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v || 0);
  const artRows = allRows.filter(r => r.cod_art === codArt);
  const first = artRows[0] || {};
  const cos = first.sin_coste ? null : first.cos_art;
  const totalStock = artRows.reduce((s, r) => s + (r.stock_disp || 0), 0);
  const matrix = buildStockMatrix(allRows, codArt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="glass-panel max-w-2xl w-full p-6 relative border border-slate-700 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">✕</button>

        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="p-3 bg-sky-500/20 border border-sky-500/30 rounded-xl text-sky-400 font-mono font-bold">{codArt}</div>
          <div>
            <span className="badge badge-blue font-mono text-xs mb-1">Ref: {first.ref_art || '—'}</span>
            <h3 className="text-lg font-bold text-white leading-tight">{first.nom_art || 'Sin descripción'}</h3>
            <p className="text-xs text-purple-300 mt-0.5">
              {first.nom_mar || '—'} • Grupo: {first.nom_grc || '—'} • Subgrupo: {first.nom_gru || '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-800 text-sm">
          <div className="glass-card p-3">
            <span className="text-xs text-slate-400 block">Coste de ficha (cos_art)</span>
            {first.sin_coste
              ? <span className="text-xl font-bold text-amber-400">Sin coste informado</span>
              : <span className="text-xl font-bold text-emerald-400 font-mono">{fmt(cos)}</span>}
          </div>
          <div className="glass-card p-3">
            <span className="text-xs text-slate-400 block">Stock disponible total</span>
            {totalStock <= 0
              ? <span className="text-xl font-bold text-rose-400">Sin existencias</span>
              : <span className="text-xl font-bold text-sky-400 font-mono">{totalStock} uds</span>}
          </div>
        </div>

        <div className="pt-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Matriz de stock por empresa y delegación</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EMPRESAS_DELEGACIONES.flatMap(emp =>
              emp.delegaciones.map(del => {
                const key = `${emp.empresaId}-${del.id}`;
                const stk = matrix[key] || 0;
                return (
                  <div key={key} className="glass-card p-3 flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-bold text-slate-200">{emp.empresaNombre}</span>
                      <div className="text-slate-400 text-[11px]">{del.nombre}</div>
                    </div>
                    <span className={`badge font-mono ${stk > 0 ? 'badge-green' : 'badge-rose'}`}>{stk} uds</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-4 text-[11px] text-slate-500 border-t border-slate-800 pt-3">
          Fecha de datos: {first.fecha_actualizacion || status?.extractedAt || '—'} • Fuente: {status?.source || '—'}
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
