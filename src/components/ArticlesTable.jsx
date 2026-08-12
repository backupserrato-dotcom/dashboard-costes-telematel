import React, { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, Eye, Package, Search, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const fmt = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v || 0);
const fmtCompact = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);

const SortIcon = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <span style={{ width: 14, height: 14, color: '#334155' }}>↕</span>;
  return sortDir === 'asc'
    ? <ArrowUp style={{ width: 12, height: 12, color: '#38bdf8' }} />
    : <ArrowDown style={{ width: 12, height: 12, color: '#38bdf8' }} />;
};

export default function ArticlesTable({ rows, totals, onSelectArticle }) {
  const [sortField, setSortField] = useState('nom_art');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const getCoste = (r) => r.sin_coste ? null : (r.cos_art || 0);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let vA, vB;
      if (sortField === 'valoracion') { vA = a.valoracion || 0; vB = b.valoracion || 0; }
      else if (sortField === 'cos_art') { vA = getCoste(a) ?? -1; vB = getCoste(b) ?? -1; }
      else if (sortField === 'stock_disp') { vA = a.stock_disp || 0; vB = b.stock_disp || 0; }
      else { vA = a[sortField] || ''; vB = b[sortField] || ''; }
      if (typeof vA === 'string') return sortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      return sortDir === 'asc' ? (vA || 0) - (vB || 0) : (vB || 0) - (vA || 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const totalStock = totals?.stock_disp || sorted.reduce((s, r) => s + (r.stock_disp || 0), 0);
  const totalVal = totals?.valoracion || sorted.reduce((s, r) => s + (r.valoracion || 0), 0);
  const sinCosteCount = sorted.filter(r => r.sin_coste).length;

  const Th = ({ field, label, align = 'left' }) => (
    <th className="art-th" style={{ textAlign: align }} aria-sort={sortField === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => handleSort(field)} className="art-sort-btn" style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {label} <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
      </button>
    </th>
  );

  return (
    <div style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(51,65,85,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package style={{ width: 17, height: 17, color: '#818cf8' }} />
            Detalle por artículo, empresa y delegación
          </h2>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>{sorted.length.toLocaleString('es-ES')}</span> filas
            &nbsp;•&nbsp; Stock disponible: <span style={{ color: '#34d399', fontWeight: 700 }}>{totalStock.toLocaleString('es-ES')} uds</span>
            &nbsp;•&nbsp; Valoración: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{fmtCompact(totalVal)}</span>
            {sinCosteCount > 0 && <>&nbsp;•&nbsp; <span style={{ color: '#fbbf24' }}>{sinCosteCount.toLocaleString('es-ES')} sin coste</span></>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#64748b' }}>Filas:</label>
          <select value={pageSize} onChange={e => { setPageSize(+e.target.value); setPage(1); }}
            style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}>
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
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

      <div style={{ overflowX: 'auto', maxHeight: '62vh', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <Th field="cod_art" label="Código" />
              <Th field="ref_art" label="Ref." />
              <Th field="nom_art" label="Descripción oficial" />
              <Th field="nom_mar" label="Marca" />
              <Th field="nom_grc" label="Grupo" />
              <Th field="nom_gru" label="Subgrupo" />
              <Th field="empresa_id" label="Empresa" />
              <Th field="delegacion_id" label="Delegación" />
              <Th field="cos_art" label="Coste ficha (cos_art)" align="right" />
              <Th field="stock_disp" label="Stock disp." align="right" />
              <Th field="valoracion" label="Valoración" align="right" />
              <th className="art-th" style={{ textAlign: 'center' }}>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: 'center', padding: 40, color: '#475569', fontSize: 14 }}>
                  <Search style={{ width: 32, height: 32, marginBottom: 8, display: 'block', margin: '0 auto 10px' }} />
                  No se encontraron filas con los filtros aplicados.
                </td>
              </tr>
            ) : paginated.map((r, idx) => {
              const coste = getCoste(r);
              const isEven = idx % 2 === 0;
              return (
                <tr key={r.cod_art + r.empresa_id + r.delegacion_id + idx} className="art-row"
                  style={{ background: isEven ? 'rgba(15,23,42,0.3)' : 'transparent' }}>
                  <td className="art-td" style={{ fontFamily: 'monospace', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>{r.cod_art}</td>
                  <td className="art-td">
                    <span style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 9999, padding: '2px 6px', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {r.ref_art || '—'}
                    </span>
                  </td>
                  <td className="art-td" style={{ color: '#e2e8f0', fontSize: 13, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.nom_art || <span style={{ color: '#fbbf24' }}>Sin descripción</span>}
                  </td>
                  <td className="art-td"><span style={{ color: '#c084fc', fontSize: 12, fontWeight: 600 }}>{r.nom_mar || '—'}</span></td>
                  <td className="art-td"><span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>{r.nom_grc || '—'}</span></td>
                  <td className="art-td"><span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>{r.nom_gru || '—'}</span></td>
                  <td className="art-td"><span style={{ color: '#818cf8', fontSize: 11, fontWeight: 600 }}>{r.empresa_nombre || r.empresa_id || '—'}</span></td>
                  <td className="art-td"><span style={{ color: '#34d399', fontSize: 11 }}>{r.delegacion_nombre || r.delegacion_id || '—'}</span></td>
                  <td className="art-td" style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                    {r.sin_coste
                      ? <span style={{ color: '#fbbf24', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}><AlertTriangle style={{ width: 11, height: 11 }} /> Sin coste</span>
                      : <span style={{ color: '#34d399' }}>{fmt(coste)}</span>}
                  </td>
                  <td className="art-td" style={{ textAlign: 'right' }}>
                    <span style={{
                      background: r.stock_disp > 15 ? 'rgba(52,211,153,0.12)' : r.stock_disp > 0 ? 'rgba(251,191,36,0.12)' : 'rgba(244,63,94,0.1)',
                      color: r.stock_disp > 15 ? '#34d399' : r.stock_disp > 0 ? '#fbbf24' : '#f43f5e',
                      border: `1px solid ${r.stock_disp > 15 ? 'rgba(52,211,153,0.3)' : r.stock_disp > 0 ? 'rgba(251,191,36,0.3)' : 'rgba(244,63,94,0.25)'}`,
                      borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap'
                    }}>
                      {r.stock_disp} uds
                    </span>
                  </td>
                  <td className="art-td" style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: (r.valoracion || 0) > 0 ? '#e2e8f0' : '#334155', whiteSpace: 'nowrap' }}>
                    {r.sin_coste ? '—' : fmtCompact(r.valoracion)}
                  </td>
                  <td className="art-td" style={{ textAlign: 'center' }}>
                    <button onClick={() => onSelectArticle(r.cod_art)} className="art-detail-btn" title="Ver ficha del artículo" aria-label={`Ver ficha del artículo ${r.cod_art}`}>
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
                <td colSpan={8} style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', fontWeight: 600, borderTop: '1px solid #334155' }}>
                  Total: {sorted.length.toLocaleString('es-ES')} filas (página {page} de {totalPages})
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', borderTop: '1px solid #334155' }} />
                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#34d399', borderTop: '1px solid #334155', whiteSpace: 'nowrap' }}>
                  {totalStock.toLocaleString('es-ES')} uds
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24', borderTop: '1px solid #334155', whiteSpace: 'nowrap' }}>
                  {fmtCompact(totalVal)}
                </td>
                <td style={{ borderTop: '1px solid #334155' }} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
