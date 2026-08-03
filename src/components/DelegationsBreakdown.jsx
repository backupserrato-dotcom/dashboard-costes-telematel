import React from 'react';
import { Building2, MapPin } from 'lucide-react';
import { EMPRESAS_DELEGACIONES } from '../services/liveDbClient';

export default function DelegationsBreakdown({ rows }) {
  const fmt = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v || 0);

  const stats = (empresaId, delegacionId) => {
    let totalStock = 0, totalVal = 0, refs = new Set();
    for (const r of rows) {
      if (r.empresa_id !== empresaId) continue;
      if (delegacionId && r.delegacion_id !== delegacionId) continue;
      totalStock += r.stock_disp || 0;
      totalVal += r.valoracion || 0;
      refs.add(r.cod_art);
    }
    return { totalStock, totalVal, refs: refs.size };
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-400" />
            <span>Stock y valoración por empresa y delegación</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Una línea por combinación artículo–empresa–delegación (sin heurísticas)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {EMPRESAS_DELEGACIONES.map(emp => (
          <div key={emp.empresaId} className="glass-panel p-5 relative">
            <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-800">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400 font-bold font-mono">
                {emp.empresaId}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{emp.empresaNombre}</h3>
                <p className="text-xs text-slate-400">{emp.delegaciones.length} delegaciones</p>
              </div>
            </div>

            <div className="space-y-4">
              {emp.delegaciones.map(del => {
                const s = stats(emp.empresaId, del.id);
                return (
                  <div key={del.id} className="glass-card p-4 space-y-2 border-l-4 border-l-sky-500">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <span>{del.nombre}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
                      <div>
                        <p className="text-slate-400">Stock disp.</p>
                        <p className="font-bold text-white mt-0.5 font-mono">{s.totalStock} uds</p>
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
          </div>
        ))}
      </div>
    </div>
  );
}
