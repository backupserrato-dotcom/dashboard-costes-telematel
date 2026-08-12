import { useEffect, useRef } from 'react';
import { Euro, PackageCheck, Warehouse, X } from 'lucide-react';
import { buildStockMatrix, EMPRESAS_DELEGACIONES } from '../services/liveDbClient';

const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

function selectArticleRows(allRows, visibleRows, codArt) {
  const code = String(codArt ?? '').trim();
  const matches = (row) => String(row.cod_art ?? '').trim() === code;
  const completeRows = allRows.filter(matches);
  return completeRows.length > 0 ? completeRows : visibleRows.filter(matches);
}

export default function ArticleDetailModal({ codArt, allRows = [], visibleRows = [], onClose, status }) {
  const closeButtonRef = useRef(null);
  const artRows = selectArticleRows(allRows, visibleRows, codArt);
  const first = artRows[0] || {};
  const totalStock = artRows.reduce((sum, row) => sum + Number(row.stock_disp || 0), 0);
  const matrix = buildStockMatrix(artRows, codArt);
  const locations = EMPRESAS_DELEGACIONES.flatMap((company) => company.delegaciones.map((delegation) => ({
    key: `${company.empresaId}-${delegation.id}`,
    company: company.empresaNombre,
    delegation: delegation.nombre,
    stock: Number(matrix[`${company.empresaId}-${delegation.id}`] || 0)
  })));
  const locationsWithStock = locations.filter((location) => location.stock > 0).length;
  const maxStock = Math.max(...locations.map((location) => location.stock), 1);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => event.key === 'Escape' && onClose();
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="article-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="article-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="article-detail-title">
        <button ref={closeButtonRef} onClick={onClose} className="article-modal-close" aria-label="Cerrar ficha"><X aria-hidden="true" /></button>

        {artRows.length === 0 ? (
          <div className="article-modal-empty">
            <Warehouse aria-hidden="true" />
            <h3 id="article-detail-title">No hay datos para el artículo {codArt}</h3>
            <p>La ficha no está disponible en la carga actual. Cierra esta ventana y actualiza los datos.</p>
            <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">Cerrar</button>
          </div>
        ) : (<>
          <header className="article-modal-header">
            <div className="article-code">{codArt}</div>
            <div>
              <span className="badge badge-blue font-mono text-xs">Ref: {first.ref_art || '—'}</span>
              <h3 id="article-detail-title">{first.nom_art || 'Sin descripción'}</h3>
              <p>{first.nom_mar || '—'} · {first.nom_grc || 'Sin grupo'} · {first.nom_gru || 'Sin subgrupo'}</p>
            </div>
          </header>

          <div className="article-summary-grid">
            <div className="article-summary-card"><Euro aria-hidden="true" /><div><span>Coste de ficha</span><strong className={first.sin_coste ? 'is-warning' : 'is-positive'}>{first.sin_coste ? 'Sin informar' : currency.format(first.cos_art || 0)}</strong></div></div>
            <div className="article-summary-card"><PackageCheck aria-hidden="true" /><div><span>Stock disponible</span><strong className={totalStock > 0 ? 'is-info' : 'is-danger'}>{number.format(totalStock)} uds</strong></div></div>
            <div className="article-summary-card"><Warehouse aria-hidden="true" /><div><span>Centros con stock</span><strong>{locationsWithStock} de {locations.length}</strong></div></div>
          </div>

          <div className="article-stock-section">
            <div className="article-section-heading"><div><h4>Distribución de stock</h4><p>Comparativa por empresa y delegación</p></div><span>{number.format(totalStock)} uds</span></div>
            <div className="article-stock-list">
              {locations.map((location) => (
                <div key={location.key} className="article-stock-row">
                  <div className="article-stock-label"><strong>{location.delegation}</strong><span>{location.company}</span></div>
                  <div className="article-stock-track" aria-hidden="true"><span style={{ width: `${(location.stock / maxStock) * 100}%` }} /></div>
                  <span className={`badge font-mono ${location.stock > 0 ? 'badge-green' : 'badge-rose'}`}>{number.format(location.stock)} uds</span>
                </div>
              ))}
            </div>
          </div>

          <footer className="article-modal-footer">
            <div>Datos: {first.fecha_actualizacion || status?.extractedAt || '—'} · Fuente: {status?.source || '—'}</div>
            <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">Cerrar</button>
          </footer>
        </>)}
      </section>
    </div>
  );
}
