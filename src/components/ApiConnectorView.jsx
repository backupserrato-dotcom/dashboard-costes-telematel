import React, { useState } from 'react';
import { Server, Shield, Database, RefreshCw, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { SERVER_CONFIG, SCHEMA_MAPPINGS } from '../services/liveDbClient';

export default function ApiConnectorView({ connectionStatus, onRefreshLive }) {
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), type: 'success', msg: 'Conector ODBC activo en el servidor.' },
    { time: new Date().toLocaleTimeString(), type: 'info', msg: `Driver: ${SERVER_CONFIG.driver} | Host: ${SERVER_CONFIG.hostName} (${SERVER_CONFIG.ip})` },
    { time: new Date().toLocaleTimeString(), type: 'info', msg: 'Las credenciales ODBC se cargan solo en el servidor desde .env (no viajan al cliente).' },
    { time: new Date().toLocaleTimeString(), type: 'success', msg: 'Extractor unificado disponible: galartic + galmarca + galartal.' }
  ]);
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    setTesting(true);
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'info', msg: 'Ejecutando extractor unificado contra Telematel ERP…' }]);
    await onRefreshLive();
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), type: connectionStatus?.mode === 'ERP_LIVE' ? 'success' : 'warning', msg: connectionStatus?.mode === 'ERP_LIVE' ? 'Lectura ERP completada.' : 'Revisar estado del servidor.' }]);
    setTesting(false);
  };

  return (
    <div className="space-y-6">

      <div className="glass-panel p-5 grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm border-b border-slate-800 pb-2">
            <Server className="w-4 h-4" />
            <span>Conexión ODBC Telematel</span>
          </div>
          <div className="space-y-1-5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Driver:</span>
              <span className="font-mono text-emerald-400">{SERVER_CONFIG.driver}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Host / IP:</span>
              <span className="font-mono text-white">{SERVER_CONFIG.hostName} ({SERVER_CONFIG.ip})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">DSN / Usuario:</span>
              <span className="font-mono text-slate-500">Solo en servidor (.env)</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm border-b border-slate-800 pb-2">
            <Database className="w-4 h-4" />
            <span>Alcance de delegaciones</span>
          </div>
          <div className="space-y-1-5 text-xs text-slate-300">
            <div><span className="font-semibold text-white">03 San Pedro:</span> 00 Elec / 10 Font</div>
            <div><span className="font-semibold text-white">04 Estepona:</span> 00 Elec / 10 Font</div>
            <div><span className="font-semibold text-white">05 Marbella:</span> 00 Marbella</div>
            <p className="text-11 text-slate-400 pt-1 border-t border-slate-800">
              Ubicaciones reales (sin heurísticas %3/%5).
            </p>
          </div>
        </div>

        <div className="glass-card p-4 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-sm font-bold text-white flex items-center gap-1-5">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Estado del conector</span>
            </span>
            <span className={`badge ${connectionStatus?.success !== false ? 'badge-green' : 'badge-rose'}`}>
              {connectionStatus?.mode || '—'}
            </span>
          </div>
          <button onClick={runTest} disabled={testing} className="btn-primary w-full justify-center text-xs py-2">
            <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Consultando ERP…' : 'Consultar ERP ahora'}</span>
          </button>
        </div>
      </div>

      <div className="glass-panel p-5">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Tablas del ERP consultadas (esquema PUB)</span>
          </h2>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3-5 h-3-5 text-emerald-400" /> Sin credenciales en el cliente
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Tabla (Progress OpenEdge)</th>
                <th>Tag API</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {SCHEMA_MAPPINGS.map(map => (
                <tr key={map.tablaBD}>
                  <td className="font-mono font-semibold text-sky-400">{map.tablaBD}</td>
                  <td><span className="badge badge-blue font-mono">{map.tagAPI}</span></td>
                  <td className="text-slate-300">{map.descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel p-4 font-mono text-xs">
        <div className="text-slate-400 pb-2 mb-2 border-b border-slate-800 flex items-center justify-between">
          <span>Consola del extractor</span>
          <span className="text-10 text-slate-500">Credenciales en .env del servidor</span>
        </div>
        <div className="space-y-1-5 max-h-48 overflow-y-auto pr-2">
          {logs.map((l, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-slate-500">[{l.time}]</span>
              <span className={l.type === 'success' ? 'text-emerald-400' : l.type === 'warning' ? 'text-amber-300' : 'text-sky-300'}>
                {l.msg}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
