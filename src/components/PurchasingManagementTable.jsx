import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, ShoppingBag, Search, ChevronLeft, ChevronRight, AlertCircle, FileText, CheckCircle2, Clock, Filter, User } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const fmt = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v || 0);
const fmtCompact = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
const fmtNumber = (v) => new Intl.NumberFormat('es-ES').format(v || 0);

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <span className="text-slate-600 font-mono text-xs">↕</span>;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 text-amber-400 inline" />
    : <ArrowDown className="w-3.5 h-3.5 text-amber-400 inline" />;
};

export default function PurchasingManagementTable({ orders = [], totalUnfilteredCount = 0 }) {
  const [sortField, setSortField] = useState('importe_pendiente');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');

  // Handle sorting for EVERY SINGLE COLUMN
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  // Secondary local quick-search within the active filtered scope
  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const term = search.toLowerCase().trim();
    return orders.filter(o => 
      ((o.pedido_id || '') + ' ' + (o.cod_art || '') + ' ' + (o.ref_art || '') + ' ' + (o.nom_art || '') + ' ' + (o.nom_mar || '') + ' ' + (o.razon_social || '') + ' ' + (o.empresa_nombre || '') + ' ' + (o.delegacion_nombre || '')).toLowerCase().includes(term)
    );
  }, [orders, search]);

  // Dynamic sorting on ALL columns
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let vA = a[sortField];
      let vB = b[sortField];

      if (vA === undefined || vA === null) vA = '';
      if (vB === undefined || vB === null) vB = '';

      if (typeof vA === 'string' && typeof vB === 'string') {
        return sortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      return sortDir === 'asc' ? (vA || 0) - (vB || 0) : (vB || 0) - (vA || 0);
    });
  }, [filtered, sortField, sortDir]);

  // Summary Metrics calculated for the active filtered scope
  const totalPendingImp = useMemo(() => sorted.reduce((sum, r) => sum + (r.importe_pendiente || 0), 0), [sorted]);
  const totalPendingUnits = useMemo(() => sorted.reduce((sum, r) => sum + (r.unidades_pendientes || 0), 0), [sorted]);
  const uniqueOrdersCount = useMemo(() => new Set(sorted.map(r => r.pedido_id)).size, [sorted]);
  const uniqueArticlesCount = useMemo(() => new Set(sorted.map(r => r.cod_art)).size, [sorted]);

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  // Helper Th with column sorting for EVERY column
  const Th = ({ field, label, align = 'left' }) => (
    <th 
      onClick={() => handleSort(field)} 
      className="px-3 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider bg-slate-800/90 border-b border-slate-700/80 cursor-pointer select-none hover:bg-slate-700/80 transition-colors"
      style={{ textAlign: align }}
    >
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <span>{label}</span>
        <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      
      {/* KPI Cards Summary for Purchasing Management */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Pendiente (Selección)</p>
            <p className="text-2xl font-extrabold text-amber-400 font-mono mt-1">{fmtCompact(totalPendingImp)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Calculado según importe neto de línea ERP</p>
          </div>
          <ShoppingBag className="w-8 h-8 text-amber-400/40" />
        </div>

        <div className="glass-panel p-4 flex items-center justify-between border-l-4 border-l-sky-500">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Líneas Pendientes</p>
            <p className="text-2xl font-extrabold text-sky-400 font-mono mt-1">{sorted.length.toLocaleString('es-ES')}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">De {totalUnfilteredCount.toLocaleString('es-ES')} líneas totales</p>
          </div>
          <Clock className="w-8 h-8 text-sky-400/40" />
        </div>

        <div className="glass-panel p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Unidades Pendientes</p>
            <p className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{fmtNumber(totalPendingUnits)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Para {uniqueArticlesCount} referencias de artículos</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-400/40" />
        </div>

        <div className="glass-panel p-4 flex items-center justify-between border-l-4 border-l-purple-500">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pedidos Únicos Activos</p>
            <p className="text-2xl font-extrabold text-purple-300 font-mono mt-1">{uniqueOrdersCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Nº de documentos de compras</p>
          </div>
          <FileText className="w-8 h-8 text-purple-400/40" />
        </div>
      </div>

      {/* Main Table Container */}
      <div className="glass-panel overflow-hidden border border-slate-700/80 rounded-xl">
        
        {/* Header Control Toolbar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-4 bg-slate-900/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <span>Gestión de Compras — Pedidos Pendientes de Recepcionar</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Los filtros de la barra superior (Empresa, Delegación, Marca, Búsqueda) aplican en tiempo real a esta tabla.</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar pedido, proveedor, ref..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-950 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 w-60"
              />
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Filas:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="bg-slate-950 text-slate-200 border border-slate-700 rounded-md px-2 py-1 text-xs focus:outline-none"
              >
                {PAGE_SIZE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-1 rounded-md bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 px-2 min-w-[70px] text-center font-mono">
                Pág. {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-1 rounded-md bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* Scrollable Table View with Sort Filters on EVERY Column */}
        <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th field="pedido_id" label="Nº Pedido" />
                <Th field="linea_num" label="Línea" align="center" />
                <Th field="fecha_pedido" label="Fecha" />
                <Th field="razon_social" label="Proveedor / Razón Social" />
                <Th field="cod_art" label="Código" />
                <Th field="ref_art" label="Ref. Fabricante" />
                <Th field="nom_art" label="Descripción Comercial ERP" />
                <Th field="nom_mar" label="Marca" />
                <Th field="empresa_nombre" label="Empresa" />
                <Th field="delegacion_nombre" label="Delegación" />
                <Th field="unidades_pedidas" label="Pedidas" align="right" />
                <Th field="unidades_servidas" label="Servidas" align="right" />
                <Th field="unidades_pendientes" label="Pendientes" align="right" />
                <Th field="unidad_medida" label="Ud." align="center" />
                <Th field="precio_unitario" label="Precio Tarifa" align="right" />
                <Th field="descuento_pct" label="Dto %" align="right" />
                <Th field="importe_linea_total" label="Neto Línea Total" align="right" />
                <Th field="importe_pendiente" label="Importe Pendiente Recepcionar (€)" align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={18} className="text-center py-12 text-slate-400 text-sm">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                    No se encontraron pedidos pendientes de recepcionar con los filtros activos.
                  </td>
                </tr>
              ) : (
                paginated.map((r, idx) => (
                  <tr key={`${r.pedido_id}-${r.linea_num}-${r.cod_art}-${idx}`} className="hover:bg-slate-800/50 transition-colors text-xs">
                    <td className="px-3 py-2 font-mono font-bold text-amber-400 whitespace-nowrap">{r.pedido_id}</td>
                    <td className="px-3 py-2 font-mono text-center text-slate-400 whitespace-nowrap">{r.linea_num}</td>
                    <td className="px-3 py-2 font-mono text-slate-400 whitespace-nowrap">{r.fecha_pedido || '—'}</td>
                    <td className="px-3 py-2 text-slate-300 font-medium max-w-xs truncate" title={r.razon_social}>
                      <span className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-amber-400/70 flex-shrink-0" />
                        <span className="truncate">{r.razon_social || '—'}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-300 font-semibold whitespace-nowrap">{r.cod_art}</td>
                    <td className="px-3 py-2 font-mono text-sky-400 font-bold whitespace-nowrap">{r.ref_art || '—'}</td>
                    <td className="px-3 py-2 text-slate-200 font-medium max-w-xs truncate" title={r.nom_art}>
                      {r.nom_art}
                    </td>
                    <td className="px-3 py-2 font-semibold text-purple-300 whitespace-nowrap">{r.nom_mar || '—'}</td>
                    <td className="px-3 py-2 text-indigo-300 font-medium whitespace-nowrap">{r.empresa_nombre || r.empresa_id}</td>
                    <td className="px-3 py-2 text-emerald-400 whitespace-nowrap">{r.delegacion_nombre || r.delegacion_id}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-400 whitespace-nowrap">{fmtNumber(r.unidades_pedidas)}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-400 whitespace-nowrap">{fmtNumber(r.unidades_servidas)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">{fmtNumber(r.unidades_pendientes)}</td>
                    <td className="px-3 py-2 text-center font-mono text-slate-400 whitespace-nowrap">{r.unidad_medida || 'UN'}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300 whitespace-nowrap">{fmt(r.precio_unitario)}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-400 whitespace-nowrap">{r.descuento_pct ? `${r.descuento_pct}%` : '0%'}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300 whitespace-nowrap">{fmt(r.importe_linea_total)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-amber-400 text-sm whitespace-nowrap bg-amber-500/10 border-l border-amber-500/20">
                      {fmt(r.importe_pendiente)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Sticky Table Footer with Totals */}
            {sorted.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 font-bold text-xs text-slate-300 border-t-2 border-slate-700 sticky bottom-0">
                  <td colSpan={12} className="px-3 py-3">
                    Selección: {sorted.length.toLocaleString('es-ES')} líneas pendientes ({uniqueOrdersCount} pedidos)
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-emerald-400 text-sm whitespace-nowrap">
                    {fmtNumber(totalPendingUnits)}
                  </td>
                  <td colSpan={4} className="px-3 py-3 text-right text-slate-400">Total Importe Pendiente:</td>
                  <td className="px-3 py-3 text-right font-mono text-amber-400 text-base font-extrabold whitespace-nowrap bg-amber-500/20 border-l border-amber-500/30">
                    {fmt(totalPendingImp)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

      </div>
    </div>
  );
}
