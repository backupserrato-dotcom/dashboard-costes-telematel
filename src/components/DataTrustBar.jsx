import React from 'react';
import { Database, Clock, AlertTriangle, RefreshCw, Package } from 'lucide-react';

// Franja de confianza de datos (Fase 2): fuente, última actualización,
// número de artículos, botón "Actualizar ahora" y aviso de caché.
export default function DataTrustBar({ status, onRefreshLive }) {
  if (!status) return null;

  const isLive = status.mode === 'ERP_LIVE';
  const isStale = status.cacheStale;
  const calidad = status.quality;
  const fechaCorta = status.extractedAt
    ? new Date(status.extractedAt).toLocaleString('es-ES')
    : '—';

  return (
    <div
      className="data-trust-bar mb-6 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs"
      style={{
        background: isStale ? 'rgba(120,53,15,0.18)' : 'rgba(15,23,42,0.7)',
        border: `1px solid ${isStale ? 'rgba(245,158,11,0.45)' : 'rgba(56,189,248,0.25)'}`,
      }}
    >
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4" style={{ color: isLive ? '#34d399' : '#38bdf8' }} />
        <span style={{ color: '#e2e8f0', fontWeight: 700 }}>
          {isLive ? 'Consultar ERP ahora' : 'Ver última caché'}
        </span>
        <span
          className="badge"
          style={{
            background: isLive ? 'rgba(52,211,153,0.15)' : 'rgba(56,189,248,0.15)',
            color: isLive ? '#34d399' : '#38bdf8',
            border: `1px solid ${isLive ? 'rgba(52,211,153,0.3)' : 'rgba(56,189,248,0.3)'}`
          }}
        >
          {status.mode}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-slate-400">
        <Clock className="w-3.5 h-3.5" />
        <span>Última lectura: <strong className="text-slate-200">{fechaCorta}</strong></span>
        {status.cacheAgeHours != null && (
          <span className="text-slate-500">({Math.round(status.cacheAgeHours * 10) / 10} h)</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-slate-400">
        <Package className="w-3.5 h-3.5" />
        <span>
          <strong className="text-slate-200">{(status.filteredRecords ?? status.totalRecords ?? 0).toLocaleString('es-ES')}</strong>
          {' '}de{' '}
          <strong className="text-slate-200">{(status.totalRecords ?? 0).toLocaleString('es-ES')}</strong>
          {' '}artículos
        </span>
      </div>

      {calidad && (
        <div className="flex items-center gap-3 text-slate-400">
          <span>Con coste: <strong className="text-emerald-400">{calidad.porcentaje_con_coste}%</strong></span>
          <span>Con stock: <strong className="text-sky-400">{calidad.porcentaje_con_stock}%</strong></span>
          {(calidad.unidades_no_mapeadas > 0 || calidad.ubicacion_no_mapeada) && (
            <span style={{ color: '#fbbf24' }}>No mapeadas: {calidad.unidades_no_mapeadas || 0} uds</span>
          )}
        </div>
      )}

      {isStale && (
        <div className="flex items-center gap-1.5" style={{ color: '#fbbf24' }}>
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Caché con más de {status.cacheMaxAgeHours} h. Se recomienda consultar el ERP.</span>
        </div>
      )}

      <div className="trust-action ml-auto">
        <button
          onClick={onRefreshLive}
          className="btn-primary text-xs"
          title="Ejecutar el extractor unificado contra Telematel ERP"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Consultar ERP ahora
        </button>
      </div>
    </div>
  );
}
