import React, { useState, useMemo, useEffect } from 'react';
import { Layers, Zap, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight, AlertCircle, Calculator, CheckCircle2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { parseCableSectionAndColor } from '../utils/cableParser';

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
function legacyParseCableSectionAndColor(desc = '') {
  if (!desc) return { section: "OTRA", color: "OTRO", family: "GENERAL" };
  const d = desc.toString().toLowerCase();

  // Family match
  let family = "H07Z1-K";
  if (d.includes("es05z1-k")) family = "ES05Z1-K";
  else if (d.includes("h07z-r")) family = "H07Z-R";
  else if (d.includes("h07v-k")) family = "H07V-K";

  // Section match
  let section = "OTRA";
  const match = d.match(/(?:1x|\b)(1[.,]5|2[.,]5|1|4|6|10|16|25|32|35)(?:\s*cpr|\s*mm2|\s*mm|\s*azul|\s*marr|\s*negr|\s*gris|\s*amar|\s*rojo|\s*blan|\s*viol|\s*naran|\s*verde|\s*\(bob|\s*\(rol|\b)/);
  if (match) {
    let secRaw = match[1].replace(',', '.');
    if (secRaw === "32") secRaw = "35";
    if (TARGET_SECTIONS.includes(secRaw)) {
      section = secRaw;
    }
  }

  // Color match with encoding resiliency
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

  return { section, color, family };
}

// Conservado temporalmente para compatibilidad durante la migración del parser.
void legacyParseCableSectionAndColor;

const SectionChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(10,14,30,0.97)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: '#fbbf24', fontWeight: 700, marginBottom: 6 }}>{label}</p>
      <p style={{ color: '#34d399' }}>Coste: <strong>{payload[0]?.value?.toFixed(4)} €/m</strong></p>
      <p style={{ color: '#38bdf8' }}>Stock: <strong>{payload[0]?.payload?.stock?.toLocaleString('es-ES')} m</strong></p>
      <p style={{ color: '#c084fc' }}>Referencias: <strong>{payload[0]?.payload?.refs}</strong></p>
    </div>
  );
};

export default function Listin11View({ unifiedRows = [] }) {
  // Calculation Mode State: 'WEIGHTED' (Media Ponderada por Stock) vs 'ARITHMETIC' (Media Aritmética Simple de Ficha)
  const [calcMode, setCalcMode] = useState('WEIGHTED');

  // Table 1 State — ahora muestra cableRowsUnified con sección + coste unificado
  const [t1SortField, setT1SortField] = useState('section');
  const [t1SortDir, setT1SortDir] = useState('asc');
  const [t1Page, setT1Page] = useState(1);
  const [t1PageSize, setT1PageSize] = useState(50);
  const [t1Search, setT1Search] = useState('');
  const [t1SectionFilter, setT1SectionFilter] = useState('ALL');

  // Table 2 State (Cable Section Unification for Grupo 1L & Subgrupo 11)
  const [t2SortField, setT2SortField] = useState('section');
  const [t2SortDir, setT2SortDir] = useState('asc');
  const [t2Page, setT2Page] = useState(1);
  const [t2PageSize, setT2PageSize] = useState(25);
  const [t2Search, setT2Search] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('ALL');

  const [directRows, setDirectRows] = useState([]);

  // Auto-fetch fallback: If unifiedRows has no 1L/11 articles (e.g. while allRows is loading or if FilterBar filtered them out),
  // fetch 1L/11 data directly from the server so LISTIN 11 is ALWAYS populated.
  useEffect(() => {
    const has1L11 = (unifiedRows || []).some(r => {
      const grc = (r.cod_grc || r.nom_grc || '').toString().trim().toUpperCase();
      const gru = (r.cod_gru || r.nom_gru || '').toString().trim().replace(/^0+/, '');
      return (grc === '1L' || grc.startsWith('1L')) && (gru === '11' || gru === '011' || gru.endsWith('11'));
    });

    if (!has1L11 && directRows.length === 0) {
      fetch('/api/incremental-sync?grupoMarca=1L&subgrupo=11')
        .then(res => res.json())
        .then(data => {
          if (data && data.success && Array.isArray(data.data)) {
            const map = new Map();
            for (const r of data.data) {
              const cos = Number(r.cos_art || 0) || 0;
              const sinCoste = !!r.sin_coste || cos <= 0;
              const stock = Number(r.stock_disp || 0) || 0;
              const val = Number(r.valoracion || 0) || (cos * stock);

              if (!map.has(r.cod_art)) {
                map.set(r.cod_art, {
                  cod_art: r.cod_art || '',
                  ref_art: r.ref_art || '',
                  nom_art: r.nom_art || '',
                  cod_mar: r.cod_mar || '',
                  nom_mar: r.nom_mar || '',
                  cod_grc: r.cod_grc || '1L',
                  nom_grc: r.nom_grc || r.cod_grc || '1L',
                  cod_gru: r.cod_gru || '11',
                  nom_gru: r.nom_gru || r.cod_gru || '11',
                  stock_unificado: 0,
                  valoracion_unificada: 0,
                  costes: []
                });
              }
              const u = map.get(r.cod_art);
              u.stock_unificado += stock;
              u.valoracion_unificada += val;
              if (!sinCoste) u.costes.push(cos);
            }

            const unif = [];
            for (const u of map.values()) {
              const costes = u.costes;
              const costeMedio = u.stock_unificado > 0 ? u.valoracion_unificada / u.stock_unificado : null;
              unif.push({
                cod_art: u.cod_art,
                ref_art: u.ref_art,
                nom_art: u.nom_art,
                cod_mar: u.cod_mar,
                nom_mar: u.nom_mar,
                cod_grc: u.cod_grc,
                nom_grc: u.nom_grc,
                cod_gru: u.cod_gru,
                nom_gru: u.nom_gru,
                stock_unificado: u.stock_unificado,
                valoracion_unificada: u.valoracion_unificada,
                coste_medio_unificado: costeMedio,
                diferencia_coste: costes.length > 1 ? 'Sí' : 'No'
              });
            }
            setDirectRows(unif);
          }
        })
        .catch(err => console.warn('Direct 1L11 fetch error:', err));
    }
  }, [unifiedRows, directRows.length]);

  // Combined Rows for Listin 11
  const effectiveUnifiedRows = useMemo(() => {
    const fromProps = (unifiedRows || []).filter(r => {
      const grc = (r.cod_grc || r.nom_grc || '').toString().trim().toUpperCase();
      const gru = (r.cod_gru || r.nom_gru || '').toString().trim().replace(/^0+/, '');
      return (grc === '1L' || grc.startsWith('1L')) && (gru === '11' || gru === '011' || gru.endsWith('11'));
    });
    return fromProps.length > 0 ? fromProps : directRows;
  }, [unifiedRows, directRows]);

  const listin11BaseRows = effectiveUnifiedRows;

  // --- TABLA 2: Cable Section Unification (Grupo 1L / Subgrupo 11) ---
  // 1. Attach parsed section, color and family
  const cableArticles = useMemo(() => {
    return listin11BaseRows.map(r => {
      const parsed = parseCableSectionAndColor(r.nom_art);
      return {
        ...r,
        section: parsed.section,
        color: parsed.color,
        family: parsed.family,
        coste_individual: r.coste_medio_unificado || 0
      };
    });
  }, [listin11BaseRows]);

  // 2. Compute BOTH Section Statistics:
  // - Weighted Average Cost: sum(stock * cost) / sum(stock)
  // - Simple Arithmetic Mean: avg(coste_individual) across all section references
  const sectionStats = useMemo(() => {
    const stats = {};
    for (const sec of TARGET_SECTIONS) {
      stats[sec] = {
        section: sec,
        articlesCount: 0,
        totalStock: 0,
        totalValuation: 0,
        weightedCost: 0,
        arithmeticCost: 0,
        costsList: []
      };
    }

    for (const c of cableArticles) {
      const sec = c.section;
      if (stats[sec]) {
        stats[sec].articlesCount++;
        stats[sec].totalStock += c.stock_unificado || 0;
        stats[sec].totalValuation += c.valoracion_unificada || 0;
        if (c.coste_individual > 0) {
          stats[sec].costsList.push(c.coste_individual);
        }
      }
    }

    for (const sec of TARGET_SECTIONS) {
      const s = stats[sec];
      s.weightedCost = s.totalStock > 0 ? s.totalValuation / s.totalStock : (s.costsList.length > 0 ? s.costsList[0] : 0);
      s.arithmeticCost = s.costsList.length > 0
        ? s.costsList.reduce((a, b) => a + b, 0) / s.costsList.length
        : 0;
    }

    return stats;
  }, [cableArticles]);

  // 3. Attach unified section cost according to active calcMode
  const cableRowsUnified = useMemo(() => {
    return cableArticles.map(c => {
      const secStat = sectionStats[c.section];
      const costeWeighted = secStat ? secStat.weightedCost : c.coste_individual;
      const costeArithmetic = secStat ? secStat.arithmeticCost : c.coste_individual;
      const costeUnificado = calcMode === 'WEIGHTED' ? costeWeighted : costeArithmetic;

      const valoracionUnificadaSeccion = (c.stock_unificado || 0) * costeUnificado;
      const diferenciaImporte = valoracionUnificadaSeccion - (c.valoracion_unificada || 0);

      return {
        ...c,
        coste_weighted: costeWeighted,
        coste_arithmetic: costeArithmetic,
        coste_unificado_seccion: costeUnificado,
        valoracion_unificada_seccion: valoracionUnificadaSeccion,
        diferencia_importe: diferenciaImporte
      };
    });
  }, [cableArticles, sectionStats, calcMode]);

  // --- TABLA 1 FINAL: filtra y ordena cableRowsUnified ---
  const t1FilteredFinal = useMemo(() => {
    let result = cableRowsUnified;
    if (t1SectionFilter !== 'ALL') {
      result = result.filter(r => r.section === t1SectionFilter);
    }
    if (t1Search.trim()) {
      const term = t1Search.toLowerCase().trim();
      result = result.filter(r =>
        ((r.cod_art || '') + ' ' + (r.ref_art || '') + ' ' + (r.nom_art || '') + ' ' +
         (r.nom_mar || '') + ' ' + (r.section || '') + ' ' + (r.color || '')).toLowerCase().includes(term)
      );
    }
    return result;
  }, [cableRowsUnified, t1SectionFilter, t1Search]);

  const t1SortedFinal = useMemo(() => {
    return [...t1FilteredFinal].sort((a, b) => {
      let vA = a[t1SortField];
      let vB = b[t1SortField];
      if (t1SortField === 'section') {
        vA = parseFloat(a.section) || 999;
        vB = parseFloat(b.section) || 999;
        // secondary sort: color dentro de la misma sección
        if (vA === vB) return (a.color || '').localeCompare(b.color || '');
      } else {
        if (vA === undefined || vA === null) vA = '';
        if (vB === undefined || vB === null) vB = '';
      }
      if (typeof vA === 'string') return t1SortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      return t1SortDir === 'asc' ? (vA || 0) - (vB || 0) : (vB || 0) - (vA || 0);
    });
  }, [t1FilteredFinal, t1SortField, t1SortDir]);

  const t1TotalPages = Math.ceil(t1SortedFinal.length / t1PageSize) || 1;
  const t1Paginated = t1SortedFinal.slice((t1Page - 1) * t1PageSize, t1Page * t1PageSize);
  const t1TotalStock = t1SortedFinal.reduce((sum, r) => sum + (r.stock_unificado || 0), 0);
  const t1TotalVal   = t1SortedFinal.reduce((sum, r) => sum + (r.valoracion_unificada_seccion || 0), 0);
  const t1TotalValOrig = t1SortedFinal.reduce((sum, r) => sum + (r.valoracion_unificada || 0), 0);

  // 4. Filter Table 2 by section pill and local search
  const t2Filtered = useMemo(() => {
    let result = cableRowsUnified;
    if (selectedSectionFilter !== 'ALL') {
      result = result.filter(r => r.section === selectedSectionFilter);
    }
    if (t2Search.trim()) {
      const term = t2Search.toLowerCase().trim();
      result = result.filter(r =>
        ((r.cod_art || '') + ' ' + (r.ref_art || '') + ' ' + (r.nom_art || '') + ' ' + (r.section || '') + ' ' + (r.color || '') + ' ' + (r.family || '')).toLowerCase().includes(term)
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

  const sectionChartData = TARGET_SECTIONS.map(sec => {
    const stat = sectionStats[sec] || { weightedCost: 0, arithmeticCost: 0, totalStock: 0, articlesCount: 0 };
    const rawVal = calcMode === 'WEIGHTED' ? stat.weightedCost : stat.arithmeticCost;
    const numVal = Number(rawVal) || 0;
    return {
      section: `${sec} mm²`,
      coste: parseFloat(numVal.toFixed(4)),
      stock: stat.totalStock || 0,
      refs: stat.articlesCount || 0
    };
  });

  const handleT1Sort = (field) => {
    if (t1SortField === field) setT1SortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setT1SortField(field); setT1SortDir(field === 'section' ? 'asc' : 'desc'); }
    setT1Page(1);
  };

  const handleT2Sort = (field) => {
    if (t2SortField === field) setT2SortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setT2SortField(field); setT2SortDir(field === 'section' ? 'asc' : 'desc'); }  // BUG FIX: era setT2SortDir(field)
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

      {/* Banner Superior LISTIN 11 con Selector de Modo de Cálculo */}
      <div className="glass-panel p-5 border-l-4 border-l-amber-500 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-purple text-xs font-bold font-mono">Grupo 1L</span>
            <span className="badge badge-blue text-xs font-bold font-mono">Subgrupo 11</span>
            <span className="badge badge-amber text-xs font-bold font-mono">Conductores Unipolares</span>
          </div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-amber-400" />
            <span>LISTIN 11 — Unificación de Costes Medios por Sección</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Filtro exclusivo para el grupo <strong>1L</strong> y subgrupo <strong>11</strong>. Todos los colores de la misma sección (1, 1.5, 2.5, 4, 6, 10, 16, 25, 35 mm²) comparten un <strong>único coste unificado por metro</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Switcher de Modo de Cálculo */}
          <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setCalcMode('WEIGHTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                calcMode === 'WEIGHTED' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Media ponderada considerando el stock en metros de cada color"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Media Ponderada por Stock</span>
            </button>

            <button
              onClick={() => setCalcMode('ARITHMETIC')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                calcMode === 'ARITHMETIC' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Media aritmética simple de los costes ficha de catálogo de los artículos de la sección"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Media Aritmética Simple</span>
            </button>
          </div>

          <div className="px-3 py-2 bg-slate-900/80 border border-slate-700/70 rounded-xl text-xs">
            <span className="text-slate-400 block font-semibold">Artículos</span>
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
      {/* SECCIÓN VISUALIZADORA EN BARRA: COMPARATIVA DE SECCIONES (INSPIRACIÓN GITHUB) */}
      {/* =================================================================== */}
      <div className="glass-panel p-5 border border-slate-800 rounded-2xl bg-slate-900/40">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>Visualizador de Costes Unificados por Sección (1 mm² a 35 mm²)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Modo Activo: <strong className="text-amber-400">{calcMode === 'WEIGHTED' ? 'Media Ponderada por Stock' : 'Media Aritmética de Ficha'}</strong></span>
        </div>

        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectionChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="section" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => v.toFixed(2) + ' €'} />
              <Tooltip content={<SectionChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
              <Bar dataKey="coste" name="Coste Unificado (€/m)" radius={[6, 6, 0, 0]}>
                {sectionChartData.map((entry, index) => {
                  const ratio = sectionChartData.length > 1 ? index / (sectionChartData.length - 1) : 0;
                  const r = Math.round(245 + ratio * (16 - 245));
                  const g = Math.round(158 + ratio * (185 - 158));
                  const b = Math.round(11 + ratio * (129 - 11));
                  const fill = `rgb(${r},${g},${b})`;
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECCIÓN 1: TABLA 1 — TODOS LOS ARTÍCULOS 1L/11 CON COSTE UNIFICADO POR SECCIÓN */}
      {/* Todos los cables de la misma sección mm² comparten EL MISMO coste unificado   */}
      {/* =================================================================== */}
      <div className="space-y-4">
        <div className="glass-panel overflow-hidden border border-slate-700/80 rounded-xl">

          {/* Header banner explicativo */}
          <div className="px-5 py-3 bg-gradient-to-r from-amber-950/40 to-slate-900/60 border-b border-amber-500/20 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <span className="text-sm font-bold text-white">Listado Unificado de Cables — Coste por Sección</span>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Todos los conductores del Grupo <strong className="text-amber-400">1L</strong> / Subgrupo <strong className="text-amber-400">11</strong>.
                Los cables de la <strong>misma sección mm²</strong> (independientemente del color) comparten
                un <strong className="text-amber-300">coste único recalculado</strong> ({calcMode === 'WEIGHTED' ? 'Media Ponderada por Stock' : 'Media Aritmética Simple'}).
              </p>
            </div>
          </div>

          {/* Filtros por sección + búsqueda */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3 bg-slate-900/80">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-semibold mr-1">Sección:</span>
              <button
                onClick={() => { setT1SectionFilter('ALL'); setT1Page(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  t1SectionFilter === 'ALL' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Todas ({cableArticles.length})
              </button>
              {TARGET_SECTIONS.map(sec => {
                const cnt = cableArticles.filter(c => c.section === sec).length;
                if (cnt === 0) return null;
                return (
                  <button
                    key={sec}
                    onClick={() => { setT1SectionFilter(sec); setT1Page(1); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      t1SectionFilter === sec ? 'bg-amber-400 text-slate-950' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {sec} mm² <span className="opacity-60">({cnt})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar código, descripción, color..."
                  value={t1Search}
                  onChange={e => { setT1Search(e.target.value); setT1Page(1); }}
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-950 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 w-64"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Filas:</span>
                <select
                  value={t1PageSize}
                  onChange={e => { setT1PageSize(Number(e.target.value)); setT1Page(1); }}
                  className="bg-slate-950 text-slate-200 border border-slate-700 rounded-md px-2 py-1 text-xs focus:outline-none"
                >
                  {[25, 50, 100, 200].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setT1Page(p => Math.max(p - 1, 1))} disabled={t1Page === 1} className="p-1 rounded-md bg-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-700">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-400 px-2 min-w-[80px] text-center font-mono">Pág. {t1Page} / {t1TotalPages}</span>
                <button onClick={() => setT1Page(p => Math.min(p + 1, t1TotalPages))} disabled={t1Page === t1TotalPages} className="p-1 rounded-md bg-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-700">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Table 1 con coste unificado por sección */}
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th1 field="section"   label="Sección mm²"   align="center" />
                  <Th1 field="color"     label="Color"         align="center" />
                  <Th1 field="cod_art"   label="Código / Ref." />
                  <Th1 field="nom_art"   label="Descripción Comercial" />
                  <Th1 field="nom_mar"   label="Marca" />
                  <Th1 field="stock_unificado"          label="Stock (m)"             align="right" />
                  <Th1 field="coste_individual"         label="Coste ERP Original (€/m)" align="right" />
                  <Th1 field="coste_unificado_seccion"  label={`Coste Unificado Sección (€/m) [${calcMode === 'WEIGHTED' ? 'Ponderado' : 'Aritmético'}]`} align="right" />
                  <Th1 field="valoracion_unificada_seccion" label="Valoración Unificada (€)" align="right" />
                  <Th1 field="diferencia_importe"       label="Diferencia (€)"         align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {t1Paginated.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400 text-sm">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                      No hay artículos del Grupo 1L / Subgrupo 11 con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    let lastSection = null;
                    return t1Paginated.map((r, idx) => {
                      const isNewSection = r.section !== lastSection;
                      lastSection = r.section;
                      return (
                        <React.Fragment key={`${r.cod_art}-${idx}`}>
                          {/* Fila separadora de sección */}
                          {isNewSection && (
                            <tr style={{ background: 'rgba(245,158,11,0.08)' }}>
                              <td colSpan={10} className="px-4 py-1.5 border-t border-amber-500/30">
                                <span className="text-[11px] font-extrabold text-amber-400 font-mono tracking-wider">
                                  ━━ SECCIÓN {r.section !== 'OTRA' ? `${r.section} mm²` : 'SIN CLASIFICAR'}
                                  {' — '}
                                  Coste unificado: <span className="text-white">{fmt(r.coste_unificado_seccion)} / m</span>
                                  {' · '}
                                  {sectionStats[r.section]?.articlesCount || 0} referencias
                                  {' · '}
                                  Stock total: {fmtN(sectionStats[r.section]?.totalStock || 0)} m
                                </span>
                              </td>
                            </tr>
                          )}
                          <tr className="hover:bg-slate-800/50 transition-colors">
                            {/* Sección */}
                            <td className="px-3 py-2 text-center">
                              {isNewSection ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono">
                                  {r.section !== 'OTRA' ? `${r.section} mm²` : '—'}
                                </span>
                              ) : (
                                <span className="text-slate-600 text-[10px] font-mono">↳ {r.section !== 'OTRA' ? `${r.section} mm²` : '—'}</span>
                              )}
                            </td>
                            {/* Color */}
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                r.color === 'AZUL'   ? 'bg-blue-900/40 border-blue-500/40 text-blue-300' :
                                r.color === 'MARRÓN' ? 'bg-amber-900/40 border-amber-500/40 text-amber-300' :
                                r.color === 'NEGRO'  ? 'bg-slate-800 border-slate-600 text-slate-200' :
                                r.color === 'GRIS'   ? 'bg-slate-700/60 border-slate-500 text-slate-300' :
                                r.color === 'AMARILLO/VERDE' ? 'bg-yellow-900/40 border-yellow-500/30 text-yellow-300' :
                                r.color === 'AMARILLO' ? 'bg-yellow-900/40 border-yellow-400/40 text-yellow-300' :
                                r.color === 'ROJO'   ? 'bg-rose-900/40 border-rose-500/40 text-rose-300' :
                                r.color === 'VERDE'  ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-300' :
                                r.color === 'BLANCO' ? 'bg-slate-100/10 border-slate-400/30 text-slate-200' :
                                'bg-slate-800 border-slate-700 text-slate-400'
                              }`}>
                                {r.color}
                              </span>
                            </td>
                            {/* Código */}
                            <td className="px-3 py-2 font-mono font-bold text-sky-400 whitespace-nowrap">
                              <div>{r.cod_art}</div>
                              <div className="text-[10px] text-slate-500 font-normal">{r.ref_art || '—'}</div>
                            </td>
                            {/* Descripción */}
                            <td className="px-3 py-2 text-slate-200 max-w-xs truncate" title={r.nom_art}>{r.nom_art}</td>
                            {/* Marca */}
                            <td className="px-3 py-2 text-purple-300 whitespace-nowrap font-semibold">{r.nom_mar || '—'}</td>
                            {/* Stock */}
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">{fmtN(r.stock_unificado)} m</td>
                            {/* Coste ERP original (individual) */}
                            <td className="px-3 py-2 text-right font-mono text-slate-400 whitespace-nowrap">{fmt(r.coste_individual)}</td>
                            {/* ★ COSTE UNIFICADO SECCIÓN — mismo para todos los colores de esa sección ★ */}
                            <td className="px-3 py-2 text-right font-mono font-bold text-amber-400 text-sm whitespace-nowrap bg-amber-500/10 border-l border-amber-500/20">
                              {fmt(r.coste_unificado_seccion)}
                            </td>
                            {/* Valoración con nuevo coste */}
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-100 whitespace-nowrap">{fmtC(r.valoracion_unificada_seccion)}</td>
                            {/* Diferencia */}
                            <td className="px-3 py-2 text-right font-mono font-bold whitespace-nowrap">
                              <span className={r.diferencia_importe > 0 ? 'text-emerald-400' : r.diferencia_importe < 0 ? 'text-rose-400' : 'text-slate-500'}>
                                {r.diferencia_importe > 0 ? `+${fmtC(r.diferencia_importe)}` : fmtC(r.diferencia_importe)}
                              </span>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    });
                  })()
                )}
              </tbody>
              {t1SortedFinal.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 font-bold text-xs text-slate-300 border-t-2 border-amber-500/40 sticky bottom-0">
                    <td colSpan={5} className="px-3 py-3">TOTAL: {fmtN(t1SortedFinal.length)} artículos · Grupo 1L / Subgrupo 11</td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-400 text-sm whitespace-nowrap">{fmtN(t1TotalStock)} m</td>
                    <td className="px-3 py-3 text-right text-slate-500 font-mono">{fmtC(t1TotalValOrig)}</td>
                    <td className="px-3 py-3 text-right text-amber-400 text-xs">Coste unificado →</td>
                    <td className="px-3 py-3 text-right font-mono text-amber-400 text-base font-extrabold whitespace-nowrap bg-amber-500/20">{fmtC(t1TotalVal)}</td>
                    <td className="px-3 py-3 text-right font-mono">
                      <span className={t1TotalVal - t1TotalValOrig > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {t1TotalVal - t1TotalValOrig > 0 ? '+' : ''}{fmtC(t1TotalVal - t1TotalValOrig)}
                      </span>
                    </td>
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
                Media de costes unificando colores: Para el subgrupo 11, todos los colores de la misma sección (ej. 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35 mm²) comparten el <strong>mismo coste unificado por metro</strong> ({calcMode === 'WEIGHTED' ? 'Media Ponderada por Stock' : 'Media Aritmética Simple de Ficha'}).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-amber text-xs font-mono">{cableArticles.length} artículos unipolares</span>
            </div>
          </div>
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
                  <Th2 field="family" label="Familia" align="center" />
                  <Th2 field="section" label="Sección mm²" align="center" />
                  <Th2 field="color" label="Color Conductor" align="center" />
                  <Th2 field="stock_unificado" label="Stock (m)" align="right" />
                  <Th2 field="coste_individual" label="Coste Original ERP (€/m)" align="right" />
                  <Th2 field="coste_unificado_seccion" label={`Coste Unificado Sección (€/m) [${calcMode === 'WEIGHTED' ? 'Ponderado' : 'Aritmético'}]`} align="right" />
                  <Th2 field="valoracion_unificada_seccion" label="Valoración Unificada (€)" align="right" />
                  <Th2 field="diferencia_importe" label="Dif. Valoración (€)" align="right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {t2Paginated.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-slate-400 text-sm">
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
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 border border-slate-700 text-purple-300">
                          {r.family}
                        </span>
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
                    <td colSpan={6} className="px-3 py-3">Selección: {fmtN(t2Sorted.length)} artículos de cable (Grupo 1L / Subgrupo 11)</td>
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
