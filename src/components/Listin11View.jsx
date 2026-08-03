import React, { useState, useMemo } from 'react';
import { Layers, Zap, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight, AlertCircle, Info, Calculator, CheckCircle2 } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 4 }).format(v || 0);
const fmtC = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
const fmtN = (v) => new Intl.NumberFormat('es-ES').format(v || 0);

// Target Sections for Unipolar Flexible Cables (Subgrupo 11): 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35 mm²
const TARGET_SECTIONS = ["1", "1.5", "2.5", "4", "6", "10", "16", "25", "35"];

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <span className="text-slate-600 font-mono text-xs">↕</span>;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 text-amber-400 inline" />
    : <ArrowDown className="w-3.5 h-3.5 text-amber-400 inline" />;
};

// Helper algorithm to parse cable section and color from commercial description
export function parseCableSectionAndColor(desc = '') {
  if (!desc) return { section: "OTRA", color: "OTRO" };
  const d = desc.toString().toLowerCase();

  // Section match: matches patterns like "1,5", "2.5", "1", "4", "6", "10", "16", "25", "32", "35"
  let section = "OTRA";
  const match = d.match(/(?:1x|\b)(1[.,]5|2[.,]5|1|4|6|10|16|25|32|35)(?:\s*cpr|\s*mm2|\s*mm|\s*azul|\s*marr|\s*negr|\s*gris|\s*amar|\s*rojo|\s*blan|\s*viol|\s*naran|\s*verde|\s*\(bob|\s*\(rol|\b)/);
  if (match) {
    let secRaw = match[1].replace(',', '.');
    if (secRaw === "32") secRaw = "35";
    if (TARGET_SECTIONS.includes(secRaw)) {
      section = secRaw;
    }
  }

  // Color match with encoding resiliency for Spanish accent characters
  let color = "OTRO / SIN COLOR";
  if (/\b(azul)\b/.test(d)) color = "AZUL";
  else if (/\b(marron|marrón|marrn|marr.n)\b/.test(d)) color = "MARRÓN";
  else if (/\b(negro)\b/.test(d)) color = "NEGRO";
  else if (/\b(gris)\b/.test(d)) color = "GRIS";
  else if (/\b(amarillo[/-]verde|am[/-]vd|verde[/-]amarillo)\b/.test(d)) color = "AMARILLO/VERDE";
  else if (/\b(amarillo)\b/.test(d)) color = "AMARILLO";
  else if (/\b(blanco)\b/.test(d)) color = "BLANCO";
  else if (/\b(rojo)\b/.test(d)) color = "ROJO";
  else if (/\b(verde)\b/.test(d)) color = "VERDE";

  return { section, color };
}

export default function Listin11View({ unifiedRows = [] }) {
  // Table 1 State (Unified Cost List for Grupo 1L & Subgrupo 11)
  const [t1SortField, setT1SortField] = useState('valoracion_unificada');
  const [t1SortDir, setT1SortDir] = useState('desc');
  const [t1Page, setT1Page] = useState(1);
  const [t1PageSize, setT1PageSize] = useState(25);
  const [t1Search, setT1Search] = useState('');

  // Table 2 State (Cable Section Unification for Grupo 1L & Subgrupo 11)
  const [t2SortField, setT2SortField] = useState('section');
  const [t2SortDir, setT2SortDir] = useState('asc');
  const [t2Page, setT2Page] = useState(1);
  const [t2PageSize, setT2PageSize] = useState(25);
  const [t2Search, setT2Search] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('ALL');

  // CRITICAL USER DIRECTIVE: Filter LISTIN 11 strictly to Grupo 1L (or 1l) and Subgrupo 11
  const listin11BaseRows = useMemo(() => {
    return unifiedRows.filter(r => {
      const grc = (r.cod_grc || '').toString().trim().toUpperCase();
      const gru = (r.cod_gru || '').toString().trim();
      return grc === '1L' && gru === '11';
    });
  }, [unifiedRows]);

  // --- TABLA 1: Unified Cost Rows (Grupo 1L / Subgrupo 11) ---
  const t1Filtered = useMemo(() => {
    if (!t1Search.trim()) return listin11BaseRows;
    const term = t1Search.toLowerCase().trim();
    return listin11BaseRows.filter(r =>
      ((r.cod_art || '') + ' ' + (r.ref_art || '') + ' ' + (r.nom_art || '') + ' ' + (r.nom_mar || '')).toLowerCase().includes(term)
    );
  }, [listin11BaseRows, t1Search]);

  const t1Sorted = useMemo(() => {
    return [...t1Filtered].sort((a, b) => {
      let vA = a[t1SortField];
      let vB = b[t1SortField];
      if (vA === undefined || vA === null) vA = '';
      if (vB === undefined || vB === null) vB = '';
      if (typeof vA === 'string') return t1SortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      return t1SortDir === 'asc' ? (vA || 0) - (vB || 0) : (vB || 0) - (vA || 0);
    });
  }, [t1Filtered, t1SortField, t1SortDir]);

  const t1TotalPages = Math.ceil(t1Sorted.length / t1PageSize) || 1;
  const t1Paginated = t1Sorted.slice((t1Page - 1) * t1PageSize, t1Page * t1PageSize);
  const t1TotalStock = t1Sorted.reduce((sum, r) => sum + (r.stock_unificado || 0), 0);
  const t1TotalVal = t1Sorted.reduce((sum, r) => sum + (r.valoracion_unificada || 0), 0);

  // --- TABLA 2: Cable Section Unification (Grupo 1L / Subgrupo 11) ---
  // 1. Attach parsed section and color
  const cableArticles = useMemo(() => {
    return listin11BaseRows.map(r => {
      const parsed = parseCableSectionAndColor(r.nom_art);
      return {
        ...r,
        section: parsed.section,
        color: parsed.color,
        coste_individual: r.coste_medio_unificado || 0
      };
    });
  }, [listin11BaseRows]);

  // 2. Compute Weighted Average Cost PER SECTION (across ALL colors & stocks)
  // Weighted Avg = sum(stock * cost) / sum(stock)
  const sectionStats = useMemo(() => {
    const stats = {};
    for (const sec of TARGET_SECTIONS) {
      stats[sec] = { section: sec, articlesCount: 0, totalStock: 0, totalValuation: 0, weightedCost: 0 };
    }

    for (const c of cableArticles) {
      const sec = c.section;
      if (stats[sec]) {
        stats[sec].articlesCount++;
        stats[sec].totalStock += c.stock_unificado || 0;
        stats[sec].totalValuation += c.valoracion_unificada || 0;
      }
    }

    for (const sec of TARGET_SECTIONS) {
      const s = stats[sec];
      s.weightedCost = s.totalStock > 0 ? s.totalValuation / s.totalStock : 0;
    }

    return stats;
  }, [cableArticles]);

  // 3. Attach unified section cost to each cable article
  const cableRowsUnified = useMemo(() => {
    return cableArticles.map(c => {
      const secStat = sectionStats[c.section];
      const costeUnificado = (secStat && secStat.weightedCost > 0) ? secStat.weightedCost : c.coste_individual;
      const valoracionUnificadaSeccion = (c.stock_unificado || 0) * costeUnificado;
      const diferenciaImporte = valoracionUnificadaSeccion - (c.valoracion_unificada || 0);

      return {
        ...c,
        coste_unificado_seccion: costeUnificado,
        valoracion_unificada_seccion: valoracionUnificadaSeccion,
        diferencia_importe: diferenciaImporte
      };
    });
  }, [cableArticles, sectionStats]);

  // 4. Filter Table 2 by section pill and local search
  const t2Filtered = useMemo(() => {
    let result = cableRowsUnified;
    if (selectedSectionFilter !== 'ALL') {
      result = result.filter(r => r.section === selectedSectionFilter);
    }
    if (t2Search.trim()) {
      const term = t2Search.toLowerCase().trim();
      result = result.filter(r =>
        ((r.cod_art || '') + ' ' + (r.ref_art || '') + ' ' + (r.nom_art || '') + ' ' + (r.section || '') + ' ' + (r.color || '')).toLowerCase().includes(term)
      );
    }
    return result;
  }, [cableRowsUnified, selectedSectionFilter, t2Search]);

  // 5. Sort Table 2 dynamically
  const t2Sorted = useMemo(() => {
    return [...t2Filtered].sort((a, b) => {
      let vA = a[t2SortField];
      let vB = b[t2SortField];
      if (t2SortField === 'section') {
        vA = parseFloat(a.section) || 999;
        vB = parseFloat(b.section) || 999;
      } else {
        if (vA === undefined || vA === null) vA = '';
        if (vB === undefined || vB === null) vB = '';
      }
      if (typeof vA === 'string') return t2SortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      return t2SortDir === 'asc' ? (vA || 0) - (vB || 0) : (vB || 0) - (vA || 0);
    });
  }, [t2Filtered, t2SortField, t2SortDir]);

  const t2TotalPages = Math.ceil(t2Sorted.length / t2PageSize) || 1;
  const t2Paginated = t2Sorted.slice((t2Page - 1) * t2PageSize, t2Page * t2PageSize);
  const t2TotalStock = t2Sorted.reduce((sum, r) => sum + (r.stock_unificado || 0), 0);
  const t2TotalValOrig = t2Sorted.reduce((sum, r) => sum + (r.valoracion_unificada || 0), 0);
  const t2TotalValUnif = t2Sorted.reduce((sum, r) => sum + (r.valoracion_unificada_seccion || 0), 0);

  const handleT1Sort = (field) => {
    if (t1SortField === field) setT1SortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setT1SortField(field); setT1SortDir('desc'); }
    setT1Page(1);
  };

  const handleT2Sort = (field) => {
    if (t2SortField === field) setT2SortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setT2SortDir(field); setT2SortDir('asc'); }
    setT2Page(1);
  };

  const Th1 = ({ field, label, align = 'left' }) => (
    <th onClick={() => handleT1Sort(field)} className="px-3 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider bg-slate-800/90 border-b border-slate-700/80 cursor-pointer select-none hover:bg-slate-700/80 transition-colors" style={{ textAlign: align }}>
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <span>{label}</span>
        <SortIcon field={field} sortField={t1SortField} sortDir={t1SortDir} />
      </div>
    </th>
  );

  const Th2 = ({ field, label, align = 'left' }) => (
    <th onClick={() => handleT2Sort(field)} className="px-3 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider bg-slate-800/90 border-b border-slate-700/80 cursor-pointer select-none hover:bg-slate-700/80 transition-colors" style={{ textAlign: align }}>
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        <span>{label}</span>
        <SortIcon field={field} sortField={t2SortField} sortDir={t2SortDir} />
      </div>
    </th>
  );

  return (
    <div className="space-y-10">

      {/* Banner Superior LISTIN 11 */}
      <div className="glass-panel p-5 border-l-4 border-l-amber-500 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-purple text-xs font-bold font-mono">Grupo 1L</span>
            <span className="badge badge-blue text-xs font-bold font-mono">Subgrupo 11</span>
          </div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-amber-400" />
            <span>LISTIN 11 — Conductores Unipolares (Grupo 1L / Subgrupo 11)</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Filtro exclusivo para el grupo <strong>1L</strong> y subgrupo <strong>11</strong>. Todos los colores de la misma sección (1 a 35 mm²) comparten un <strong>coste único ponderado por metro</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-2 bg-slate-900/80 border border-slate-700/70 rounded-xl text-xs">
            <span className="text-slate-400 block font-semibold">Artículos en Listín 11</span>
            <span className="text-lg font-bold text-sky-400 font-mono">{fmtN(listin11BaseRows.length)} refs</span>
          </div>
          <div className="px-3 py-2 bg-slate-900/80 border border-slate-700/70 rounded-xl text-xs">
            <span className="text-slate-400 block font-semibold">Stock Total</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{fmtN(t1TotalStock)} m</span>
          </div>
          <div className="px-3 py-2 bg-slate-900/80 border border-slate-700/70 rounded-xl text-xs">
            <span className="text-slate-400 block font-semibold">Valoración Total</span>
            <span className="text-lg font-bold text-amber-400 font-mono">{fmtC(t1TotalVal)}</span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECCIÓN 1: TABLA 1 — LISTA UNIFICADA DE COSTES (GRUPO 1L / SUBGRUPO 11) */}
      {/* =================================================================== */}
      <div className="space-y-4">
        <div className="glass-panel overflow-hidden border border-slate-700/80 rounded-xl">
          
          {/* Header Control Toolbar */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-4 bg-slate-900/80">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <span>TABLA 1: Lista Unificada de Costes (Grupo 1L / Subgrupo 11)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Costes medios unificados y existencias consolidadas entre todas las empresas para los artículos del subgrupo 11.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar en Tabla 1..."
                  value={t1Search}
                  onChange={e => { setT1Search(e.target.value); setT1Page(1); }}
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-950 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-purple-400 w-56"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Filas:</span>
                <select
                  value={t1PageSize}
                  onChange={e => { setT1PageSize(Number(e.target.value)); setT1Page(1); }}
                  className="bg-slate-950 text-slate-200 border border-slate-700 rounded-md px-2 py-1 text-xs focus:outline-none"
                >
                  {[10, 25, 50, 100].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => setT1Page(p => Math.max(p - 1, 1))} disabled={t1Page === 1} className="p-1 rounded-md bg-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-700">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400 px-2 min-w-[70px] text-center font-mono">Pág. {t1Page} / {t1TotalPages}</span>
                <button onClick={() => setT1Page(p => Math.min(p + 1, t1TotalPages))} disabled={t1Page === t1TotalPages} className="p-1 rounded-md bg-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-700">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Table 1 View */}
          <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th1 field="cod_art" label="Código / Ref." />
                  <Th1 field="nom_art" label="Descripción Oficial ERP" />
                  <Th1 field="nom_mar" label="Marca" />
                  <Th1 field="empresas" label="Empresas Incluidas" />
                  <Th1 field="stock_unificado" label="Stock Unificado" align="right" />
                  <Th1 field="coste_medio_unificado" label="Coste Medio Unificado (€/m)" align="right" />
                  <Th1 field="valoracion_unificada" label="Valoración Unificada (€)" align="right" />
                  <Th1 field="diferencia_coste" label="Dif. Coste" align="center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {t1Paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                      No hay artículos del Grupo 1L / Subgrupo 11 con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  t1Paginated.map((r, idx) => (
                    <tr key={r.cod_art} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-sky-400 whitespace-nowrap">
                        <div>{r.cod_art}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{r.ref_art || '—'}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-200 font-medium max-w-sm truncate" title={r.nom_art}>
                        {r.nom_art}
                      </td>
                      <td className="px-3 py-2 font-semibold text-purple-300 whitespace-nowrap">{r.nom_mar || '—'}</td>
                      <td className="px-3 py-2 text-slate-400 max-w-xs truncate">{r.empresas || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">{fmtN(r.stock_unificado)} m</td>
                      <td className="px-3 py-2 text-right font-mono text-sky-400 font-semibold whitespace-nowrap">
                        {r.coste_medio_unificado === null ? <span className="text-amber-400 text-[11px]">Sin stock</span> : fmt(r.coste_medio_unificado)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-200 whitespace-nowrap">{fmtC(r.valoracion_unificada)}</td>
                      <td className="px-3 py-2 text-center font-mono whitespace-nowrap">
                        {r.diferencia_coste === 'Sí'
                          ? <span className="badge badge-amber text-[10px]">Sí</span>
                          : <span className="text-slate-600 text-[10px]">No</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {t1Sorted.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 font-bold text-xs text-slate-300 border-t-2 border-slate-700 sticky bottom-0">
                    <td colSpan={4} className="px-3 py-3">Total: {fmtN(t1Sorted.length)} artículos en Grupo 1L / Subgrupo 11</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-400 text-sm whitespace-nowrap">{fmtN(t1TotalStock)} m</td>
                    <td className="px-3 py-3 text-right text-slate-400">Total Valoración:</td>
                    <td className="px-3 py-3 text-right font-mono text-amber-400 text-base font-extrabold whitespace-nowrap bg-amber-500/20">{fmtC(t1TotalVal)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

        </div>
      </div>

      {/* =================================================================== */}
      {/* SECCIÓN 2: TABLA 2 — COSTES PONDERADOS UNIFICADOS POR SECCIÓN DE CABLES */}
      {/* =================================================================== */}
      <div className="space-y-6 pt-4 border-t border-slate-800">
        
        {/* Banner Explicativo Tabla 2 */}
        <div className="glass-panel p-4 border-l-4 border-l-amber-500 bg-amber-950/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>TABLA 2: Costes Ponderados Unificados por Sección (Grupo 1L / Subgrupo 11)</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Media de costes unificando colores: Para el subgrupo 11, todos los colores de la misma sección (ej. 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35 mm²) comparten el <strong>mismo coste ponderado por metro</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-amber text-xs font-mono">{cableArticles.length} artículos unipolares</span>
            </div>
          </div>
        </div>

        {/* Target Section Cards Grid (1 a 35 mm²) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
          {TARGET_SECTIONS.map(sec => {
            const stat = sectionStats[sec] || { articlesCount: 0, totalStock: 0, weightedCost: 0 };
            const isSelected = selectedSectionFilter === sec;

            return (
              <div
                key={sec}
                onClick={() => setSelectedSectionFilter(prev => prev === sec ? 'ALL' : sec)}
                className={`glass-panel p-3 cursor-pointer transition-all border ${
                  isSelected ? 'border-amber-400 bg-amber-500/20 shadow-lg scale-105' : 'border-slate-800 hover:border-slate-600 bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-amber-400">{sec} mm²</span>
                  <span className="text-[10px] text-slate-400">{stat.articlesCount} refs</span>
                </div>
                <div className="text-sm font-extrabold text-white font-mono">{fmt(stat.weightedCost)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{fmtN(stat.totalStock)} m</div>
              </div>
            );
          })}
        </div>

        {/* Table 2 View */}
        <div className="glass-panel overflow-hidden border border-slate-700/80 rounded-xl">
          
          {/* Header Toolbar Table 2 */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-4 bg-slate-900/80">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-semibold mr-1">Filtrar por sección:</span>
              <button
                onClick={() => setSelectedSectionFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedSectionFilter === 'ALL' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Todas ({cableArticles.length})
              </button>

              {TARGET_SECTIONS.map(sec => (
                <button
                  key={sec}
                  onClick={() => setSelectedSectionFilter(sec)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    selectedSectionFilter === sec ? 'bg-amber-400 text-slate-950' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {sec} mm²
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar cable, color, ref..."
                  value={t2Search}
                  onChange={e => { setT2Search(e.target.value); setT2Page(1); }}
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-950 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 w-56"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Filas:</span>
                <select
                  value={t2PageSize}
                  onChange={e => { setT2PageSize(Number(e.target.value)); setT2Page(1); }}
                  className="bg-slate-950 text-slate-200 border border-slate-700 rounded-md px-2 py-1 text-xs focus:outline-none"
                >
                  {[10, 25, 50, 100].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => setT2Page(p => Math.max(p - 1, 1))} disabled={t2Page === 1} className="p-1 rounded-md bg-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-700">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400 px-2 min-w-[70px] text-center font-mono">Pág. {t2Page} / {t2TotalPages}</span>
                <button onClick={() => setT2Page(p => Math.min(p + 1, t2TotalPages))} disabled={t2Page === t2TotalPages} className="p-1 rounded-md bg-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-700">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th2 field="cod_art" label="Código Artículo" />
                  <Th2 field="ref_art" label="Ref. Fabricante" />
                  <Th2 field="nom_art" label="Descripción Comercial Cable" />
                  <Th2 field="section" label="Sección mm²" align="center" />
                  <Th2 field="color" label="Color Conductor" align="center" />
                  <Th2 field="stock_unificado" label="Stock (m)" align="right" />
                  <Th2 field="coste_individual" label="Coste Original ERP (€/m)" align="right" />
                  <Th2 field="coste_unificado_seccion" label="Coste Unificado Sección (€/m)" align="right" />
                  <Th2 field="valoracion_unificada_seccion" label="Valoración Unificada (€)" align="right" />
                  <Th2 field="diferencia_importe" label="Dif. Valoración (€)" align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {t2Paginated.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400 text-sm">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                      No se encontraron conductores del Grupo 1L / Subgrupo 11 con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  t2Paginated.map((r, idx) => (
                    <tr key={`${r.cod_art}-${idx}`} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-sky-400 whitespace-nowrap">{r.cod_art}</td>
                      <td className="px-3 py-2 font-mono text-slate-300 font-semibold whitespace-nowrap">{r.ref_art || '—'}</td>
                      <td className="px-3 py-2 text-slate-200 font-medium max-w-sm truncate" title={r.nom_art}>
                        {r.nom_art}
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-extrabold text-amber-400 whitespace-nowrap">
                        {r.section !== 'OTRA' ? `${r.section} mm²` : '—'}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-200">
                          {r.color}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">{fmtN(r.stock_unificado)} m</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-400 whitespace-nowrap">{fmt(r.coste_individual)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-amber-400 text-sm whitespace-nowrap bg-amber-500/10 border-l border-amber-500/20">
                        {fmt(r.coste_unificado_seccion)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-100 whitespace-nowrap">{fmtC(r.valoracion_unificada_seccion)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold whitespace-nowrap">
                        <span className={r.diferencia_importe > 0 ? 'text-emerald-400' : r.diferencia_importe < 0 ? 'text-rose-400' : 'text-slate-500'}>
                          {r.diferencia_importe > 0 ? `+${fmtC(r.diferencia_importe)}` : fmtC(r.diferencia_importe)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {t2Sorted.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 font-bold text-xs text-slate-300 border-t-2 border-slate-700 sticky bottom-0">
                    <td colSpan={5} className="px-3 py-3">Selección: {fmtN(t2Sorted.length)} artículos de cable (Grupo 1L / Subgrupo 11)</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-400 text-sm whitespace-nowrap">{fmtN(t2TotalStock)} m</td>
                    <td className="px-3 py-3 text-right text-slate-400">Total Valoración Unificada:</td>
                    <td colSpan={2} className="px-3 py-3 text-right font-mono text-amber-400 text-base font-extrabold whitespace-nowrap bg-amber-500/20">{fmtC(t2TotalValUnif)}</td>
                    <td className="px-3 py-3 text-right font-mono text-slate-300">
                      {fmtC(t2TotalValUnif - t2TotalValOrig)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

        </div>

      </div>

    </div>
  );
}
