import React, { useMemo } from 'react';
import { Building2, MapPin } from 'lucide-react';
import { EMPRESAS_DELEGACIONES } from '../services/liveDbClient';

export default function DelegationsBreakdown({ rows }) {
  const fmt = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v || 0);
  const fmtNumber = (v) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(v || 0);

  const summary = useMemo(() => {
    const locations = new Map();
    const allRefs = new Set();
    let totalStock = 0;
    let totalVal = 0;
    for (const r of rows) {
      const key = `${r.empresa_id || ''}-${r.delegacion_id || ''}`;
      const current = locations.get(key) || { totalStock: 0, totalVal: 0, refs: new Set() };
      current.totalStock += Number(r.stock_disp) || 0;
      current.totalVal += Number(r.valoracion) || 0;
      if (r.cod_art) {
        current.refs.add(r.cod_art);
        allRefs.add(r.cod_art);
      }
      locations.set(key, current);
      totalStock += Number(r.stock_disp) || 0;
      totalVal += Number(r.valoracion) || 0;
    }
    const values = [...locations.values()];
    return {
      locations,
      totalStock,
      totalVal,
      refs: allRefs.size,
      maxLocationVal: Math.max(...values.map((item) => item.totalVal), 0),
    };
  }, [rows]);

  const stats = (empresaId, delegacionId) => {
    const value = summary.locations.get(`${empresaId}-${delegacionId}`);
    return value ? { ...value, refs: value.refs.size } : { totalStock: 0, totalVal: 0, refs: 0 };
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-4 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-400" />
            <span>Stock y valoración por empresa y delegación</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Una línea por combinación artículo–empresa–delegación (sin heurísticas)
          </p>
        </div>
        <div className="flex items-center gap-5 text-right">
          <div><span className="block text-[10px] uppercase tracking-wider text-slate-500">Stock</span><strong className="text-sm text-sky-300 font-mono">{fmtNumber(summary.totalStock)} uds</strong></div>
          <div><span className="block text-[10px] uppercase tracking-wider text-slate-500">Referencias</span><strong className="text-sm text-indigo-300 font-mono">{fmtNumber(summary.refs)}</strong></div>
          <div><span className="block text-[10px] uppercase tracking-wider text-slate-500">Valoración</span><strong className="text-sm text-emerald-400 font-mono">{fmt(summary.totalVal)}</strong></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {EMPRESAS_DELEGACIONES.map(emp => {
          const companyStats = emp.delegaciones.reduce((total, del) => {
            const value = stats(emp.empresaId, del.id);
            total.stock += value.totalStock;
            total.value += value.totalVal;
            return total;
          }, { stock: 0, value: 0 });
          return <div key={emp.empresaId} className="glass-panel p-5 relative">
            <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-800">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400 font-bold font-mono">
                {emp.empresaId}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{emp.empresaNombre}</h3>
                <p className="text-xs text-slate-400">{fmt(companyStats.value)} · {fmtNumber(companyStats.stock)} uds</p>
              </div>
            </div>

            <div className="space-y-4">
              {emp.delegaciones.map(del => {
                const s = stats(emp.empresaId, del.id);
                const share = summary.totalVal > 0 ? (s.totalVal / summary.totalVal) * 100 : 0;
                const relativeWidth = summary.maxLocationVal > 0 ? (s.totalVal / summary.maxLocationVal) * 100 : 0;
                return (
                  <div key={del.id} className="glass-card p-4 space-y-2 border-l-4 border-l-sky-500">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <span>{del.nombre}</span>
                      </span>
                      <span className="text-[10px] font-bold font-mono text-sky-300">{share.toLocaleString('es-ES', { maximumFractionDigits: 1 })}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800" aria-label={`${share.toLocaleString('es-ES', { maximumFractionDigits: 1 })}% de la valoración total`}>
                      <span className="block h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400" style={{ width: `${relativeWidth}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
                      <div>
                        <p className="text-slate-400">Stock disp.</p>
                        <p className="font-bold text-white mt-0.5 font-mono">{fmtNumber(s.totalStock)} uds</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Referencias</p>
                        <p className="font-bold text-indigo-300 mt-0.5 font-mono">{s.refs}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Valoración</p>
                        <p className="font-bold text-emerald-400 mt-0.5 font-mono">{fmt(s.totalVal)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>;
        })}
      </div>
    </div>
  );
}
