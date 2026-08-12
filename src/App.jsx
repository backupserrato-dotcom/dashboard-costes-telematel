import React, { lazy, Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Navbar from './components/Navbar';
import FilterBar from './components/FilterBar';
import KpiCards from './components/KpiCards';
import ArticlesTable from './components/ArticlesTable';
import UnifiedCostTable from './components/UnifiedCostTable';
import DataTrustBar from './components/DataTrustBar';
import ArticleDetailModal from './components/ArticleDetailModal';
import { parseCableSectionAndColor } from './utils/cableParser';
import {
  fetchLiveDatabaseData, fetchServerInfo, fetchCatalogos, refreshErpNow, fetchPendingOrders,
  calculateKpis, buildUnifiedRows, SERVER_CONFIG
} from './services/liveDbClient';
import { RefreshCw, Database } from 'lucide-react';

const PurchasingManagementTable = lazy(() => import('./components/PurchasingManagementTable'));
const DelegationsBreakdown = lazy(() => import('./components/DelegationsBreakdown'));
const Listin11View = lazy(() => import('./components/Listin11View'));
const ApiConnectorView = lazy(() => import('./components/ApiConnectorView'));
const DashboardCharts = lazy(() => import('./components/DashboardCharts'));

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
  const requestIdRef = useRef(0);
  const filtersReadyRef = useRef(false);
  const filterTimerRef = useRef(null);

  const loadCache = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const result = await fetchLiveDatabaseData(filters, 'cache');
    if (requestId !== requestIdRef.current) return;
    setRows(result.articles || []);
    setTotals(result.totals || { stock_disp: 0, valoracion: 0, articulos_unicos: 0 });
    setStatus(result);
    setLoading(false);
  }, [filters]);

  const loadLive = useCallback(async () => {
    if (filterTimerRef.current) window.clearTimeout(filterTimerRef.current);
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const refresh = await refreshErpNow();
    if (requestId !== requestIdRef.current) return;
    if (!refresh.success) {
      setStatus(current => ({ ...current, mode: 'ERROR', error: refresh.error || 'No se pudo actualizar el ERP' }));
      setLoading(false);
      return;
    }
    const [result, fullResult, pedRes] = await Promise.all([
      fetchLiveDatabaseData(filters, 'cache'),
      fetchLiveDatabaseData({}, 'cache', 0, 0),
      fetchPendingOrders()
    ]);
    if (requestId !== requestIdRef.current) return;
    setRows(result.articles || []);
    setAllRows(fullResult.articles || []);
    setTotals(result.totals || { stock_disp: 0, valoracion: 0, articulos_unicos: 0 });
    setPendingOrders(pedRes.data || []);
    setStatus({ ...result, mode: 'ERP_LIVE' });
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    let active = true;
    const requestId = ++requestIdRef.current;
    Promise.all([
      fetchServerInfo(),
      fetchCatalogos(),
      fetchLiveDatabaseData({}, 'cache', 0, 0),
      fetchPendingOrders()
    ]).then(([, catalogs, initialData, orders]) => {
      if (!active || requestId !== requestIdRef.current) return;
      if (catalogs?.success) setCatalogos(catalogs);
      setRows(initialData.articles || []);
      setAllRows(initialData.articles || []);
      setTotals(initialData.totals || { stock_disp: 0, valoracion: 0, articulos_unicos: 0 });
      setPendingOrders(orders.data || []);
      setStatus(initialData);
      setLoading(false);
    });
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!filtersReadyRef.current) {
      filtersReadyRef.current = true;
      return undefined;
    }
    filterTimerRef.current = window.setTimeout(loadCache, 280);
    return () => window.clearTimeout(filterTimerRef.current);
  }, [filters, loadCache]);

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

  const handleSeeDetail = useCallback((codArt) => {
    setSelectedArticle(codArt);
  }, []);

  const handleExportExcel = async () => {
    try {
      const writeExcelFile = (await import('write-excel-file/browser')).default;
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
        const grc = (r.cod_grc || r.nom_grc || '').toString().trim().toUpperCase();
        const gru = (r.cod_gru || r.nom_gru || '').toString().trim().replace(/^0+/, '');
        return (grc === '1L' || grc.startsWith('1L')) && (gru === '11' || gru === '011' || gru.endsWith('11'));
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
      const ordersData = (pendingOrders || []).map(p => ({
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

      const createSheet = (sheet, data) => {
        if (data.length === 0) {
          return { sheet, data: [[{ value: 'Sin datos para los filtros aplicados' }]], columns: [{ width: 36 }] };
        }

        const headers = Object.keys(data[0]);
        return {
          sheet,
          stickyRowsCount: 1,
          columns: headers.map((header) => ({ width: Math.min(42, Math.max(12, header.length + 2)) })),
          data: [
            headers.map((value) => ({ value, fontWeight: 'bold' })),
            ...data.map((row) => headers.map((header) => ({ value: row[header] ?? null }))),
          ],
        };
      };

      const sheets = [
        createSheet('Detalle Artículos', exportData),
        createSheet('Lista Unificada General', unifiedData),
        createSheet('LISTIN 11 (Grupo 1L-11)', listin11ExportData),
        createSheet('Pedidos Pendientes', ordersData),
      ];

      const blob = await writeExcelFile(sheets).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LISTIN_11_Costes_y_Compras_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar a Excel:', err);
      alert('Error al generar el archivo Excel. Por favor reintente.');
    }
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

      <main className="dashboard-main flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
          <Suspense fallback={<div className="chart-loading" aria-label="Cargando resumen visual" />}>
            <DashboardCharts rows={rows} />
          </Suspense>
        )}

        {activeTab === 'tabla' && (
          <>
            <ArticlesTable rows={rows} totals={totals} onSelectArticle={handleSeeDetail} />
            <UnifiedCostTable unifiedRows={unifiedRows} onSeeDetail={handleSeeDetail} />
          </>
        )}
        <Suspense fallback={<div className="view-loading"><RefreshCw className="animate-spin" /> Cargando vista…</div>}>
          {activeTab === 'compras' && <PurchasingManagementTable orders={filteredPendingOrders} totalUnfilteredCount={pendingOrders.length} />}
          {activeTab === 'listin11' && <Listin11View unifiedRows={masterUnifiedRows} />}
          {activeTab === 'delegaciones' && <DelegationsBreakdown rows={rows} />}
          {activeTab === 'api' && <ApiConnectorView connectionStatus={status} onRefreshLive={loadLive} />}
        </Suspense>
      </main>

      {selectedArticle && (
        <ArticleDetailModal codArt={selectedArticle} allRows={allRows} visibleRows={rows} onClose={() => setSelectedArticle(null)} status={status} />
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
