import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, Layers, AlertTriangle, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 4 }).format(v || 0);
const fmtC = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
const fmtN = (v) => new Intl.NumberFormat('es-ES').format(v || 0);

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <span style={{ width: 14, height: 14, color: '#334155' }}>↕</span>;
  return sortDir === 'asc' ? <ArrowUp style={{ width: 12, height: 12, color: '#38bdf8' }} /> : <ArrowDown style={{ width: 12, height: 12, color: '#38bdf8' }} />;
};

export default function UnifiedCostTable({ unifiedRows, onSeeDetail }) {
  const [sortField, setSortField] = useState('valoracion_unificada');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [localSearch, setLocalSearch] = useState('');

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    if (!localSearch.trim()) return unifiedRows;
    const t = localSearch.toLowerCase().trim();
    return unifiedRows.filter(r =>
      ((r.cod_art || '') + ' ' + (r.ref_art || '') + ' ' + (r.nom_art || '') + ' ' + (r.nom_mar || '')).toLowerCase().includes(t)
    );
  }, [unifiedRows, localSearch]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let vA, vB;
      if (sortField === 'stock_unificado') { vA = a.stock_unificado || 0; vB = b.stock_unificado || 0; }
      else if (sortField === 'valoracion_unificada') { vA = a.valoracion_unificada || 0; vB = b.valoracion_unificada || 0; }
      else if (sortField === 'coste_medio_unificado') { vA = a.coste_medio_unificado ?? -1; vB = b.coste_medio_unificado ?? -1; }
      else { vA = a[sortField] || ''; vB = b[sortField] || ''; }
      if (typeof vA === 'string') return sortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      return sortDir === 'asc' ? (vA || 0) - (vB || 0) : (vB || 0) - (vA || 0);
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const totalStock = sorted.reduce((s, r) => s + (r.stock_unificado || 0), 0);
  const totalVal = sorted.reduce((s, r) => s + (r.valoracion_unificada || 0), 0);
  const costeMedioGeneral = totalStock > 0 ? totalVal / totalStock : 0;
  const conDiferencia = sorted.filter(r => r.diferencia_coste === 'Sí').length;

  const Th = ({ field, label, align = 'left' }) => (
    <th onClick={() => handleSort(field)} className="art-th" style={{ textAlign: align, cursor: 'pointer' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label} <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', marginTop: 20 }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(51,65,85,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers style={{ width: 17, height: 17, color: '#a855f7' }} />
            Coste medio unificado por referencia
          </h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
            <span style={{ color: '#a855f7', fontWeight: 700 }}>{sorted.length.toLocaleString('es-ES')}</span> referencias
            &nbsp;•&nbsp; Stock unificado: <span style={{ color: '#34d399', fontWeight: 700 }}>{fmtN(totalStock)} uds</span>
            &nbsp;•&nbsp; Valoración: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{fmtC(totalVal)}</span>
            &nbsp;•&nbsp; <span style={{ color: '#fbbf24' }}>{conDiferencia} con diferencia de coste</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#475569' }} />
            <input
              type="text" placeholder="Filtrar en tabla 2..." value={localSearch}
              onChange={e => { setLocalSearch(e.target.value); setPage(1); }}
              style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: 6, padding: '5px 8px 5px 26px', fontSize: 12, width: 180 }}
            />
          </div>
          <label style={{ fontSize: 12, color: '#64748b' }}>Filas:</label>
          <select value={pageSize} onChange={e => { setPageSize(+e.target.value); setPage(1); }}
            style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}>
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1} className="page-btn" style={{ color: page === 1 ? '#334155' : '#94a3b8', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
              <ChevronLeft style={{ width: 14, height: 14 }} />
            </button>
            <span style={{ fontSize: 12, color: '#64748b', minWidth: 80, textAlign: 'center' }}>Pág. {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="page-btn" style={{ color: page === totalPages ? '#334155' : '#94a3b8', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '52vh', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <Th field="cod_art" label="Código / Ref." />
              <Th field="nom_art" label="Descripción oficial" />
              <Th field="nom_mar" label="Marca" />
              <Th field="empresas" label="Empresas incluidas" />
              <Th field="stock_unificado" label="Stock unificado" align="right" />
              <Th field="coste_medio_unificado" label="Coste medio unificado" align="right" />
              <Th field="valoracion_unificada" label="Valoración unificada" align="right" />
              <Th field="diferencia_coste" label="Dif. coste" align="center" />
              <th className="art-th" style={{ textAlign: 'center' }}>Ver detalle</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#475569', fontSize: 14 }}>
                  <Search style={{ width: 32, height: 32, marginBottom: 8, display: 'block', margin: '0 auto 10px' }} />
                  No hay referencias que consolidar con los filtros actuales.
                </td>
              </tr>
            ) : paginated.map((r, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <tr key={r.cod_art} className="art-row" style={{ background: isEven ? 'rgba(15,23,42,0.3)' : 'transparent' }}>
                  <td className="art-td font-mono font-bold text-sky-400">
                    <div style={{ fontSize: 11, color: '#e2e8f0' }}>{r.cod_art}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{r.ref_art || '—'}</div>
                  </td>
                  <td className="art-td" style={{ color: '#e2e8f0', fontSize: 13, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.nom_art || <span style={{ color: '#fbbf24' }}>Sin descripción</span>}
                  </td>
                  <td className="art-td"><span style={{ color: '#c084fc', fontSize: 12, fontWeight: 600 }}>{r.nom_mar || '—'}</span></td>
                  <td className="art-td" style={{ fontSize: 10, color: '#94a3b8', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.empresas || '—'}</td>
                  <td className="art-td" style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
                    <span style={{ color: r.stock_unificado > 0 ? '#34d399' : '#64748b' }}>{fmtN(r.stock_unificado)} uds</span>
                  </td>
                  <td className="art-td" style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                    {r.coste_medio_unificado === null
                      ? <span style={{ color: '#fbbf24', fontSize: 11 }}>Sin stock</span>
                      : <span style={{ color: '#38bdf8' }}>{fmt(r.coste_medio_unificado)}</span>}
                  </td>
                  <td className="art-td" style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: (r.valoracion_unificada || 0) > 0 ? '#e2e8f0' : '#334155', whiteSpace: 'nowrap' }}>
                    {fmtC(r.valoracion_unificada)}
                  </td>
                  <td className="art-td" style={{ textAlign: 'center' }}>
                    {r.diferencia_coste === 'Sí'
                      ? <span title={`Mín ${fmt(r.coste_min)} / Máx ${fmt(r.coste_max)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#fbbf24', fontSize: 11, fontWeight: 600 }}>
                          <AlertTriangle style={{ width: 12, height: 12 }} /> Sí
                        </span>
                      : <span style={{ color: '#475569', fontSize: 11 }}>No</span>}
                  </td>
                  <td className="art-td" style={{ textAlign: 'center' }}>
                    <button onClick={() => onSeeDetail(r.cod_art)} className="art-detail-btn" title="Ver ficha completa del artículo" aria-label={`Ver ficha completa del artículo ${r.cod_art}`}>
                      <Eye style={{ width: 14, height: 14 }} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {sorted.length > 0 && (
            <tfoot>
              <tr style={{ background: '#1a2540', position: 'sticky', bottom: 0 }}>
                <td colSpan={4} style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', fontWeight: 600, borderTop: '1px solid #334155' }}>
                  Total: {sorted.length.toLocaleString('es-ES')} referencias (página {page} de {totalPages})
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#34d399', borderTop: '1px solid #334155', whiteSpace: 'nowrap' }}>
                  {fmtN(totalStock)} uds
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8', borderTop: '1px solid #334155', whiteSpace: 'nowrap' }}>
                  {fmt(costeMedioGeneral)}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24', borderTop: '1px solid #334155', whiteSpace: 'nowrap' }}>
                  {fmtC(totalVal)}
                </td>
                <td colSpan={2} style={{ borderTop: '1px solid #334155' }} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
