import React, { useEffect, useState } from 'react';
import { Database, RefreshCw, Download, Server, ShieldCheck, Layers, Activity, Clock, ShoppingBag, ListFilter } from 'lucide-react';
import { SERVER_CONFIG, fetchCalidad } from '../services/liveDbClient';

export default function Navbar({
  connectionStatus,
  onRefreshCache,
  onRefreshLive,
  onExportExcel,
  activeTab,
  setActiveTab,
  loading
}) {
  const [calidad, setCalidad] = useState(null);

  useEffect(() => {
    fetchCalidad().then(c => { if (c) setCalidad(c); });
  }, [connectionStatus]);

  const isLive = connectionStatus?.mode === 'ERP_LIVE';
  const isStale = connectionStatus?.cacheStale;
  const fechaCorta = connectionStatus?.extractedAt
    ? new Date(connectionStatus.extractedAt).toLocaleString('es-ES')
    : '—';

  return (
    <header className="header-glow sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Dashboard Costes Medios & Compras</h1>
                <span className="badge badge-purple text-xs">
                  {isLive ? 'ERP en vivo' : 'Caché'}
                </span>
                {isStale && <span className="badge badge-amber text-xs">Caché antigua</span>}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Server className="w-3.5 h-3.5 text-sky-400" />
                <span>Host: <strong className="text-slate-200">{SERVER_CONFIG.hostName} ({SERVER_CONFIG.ip})</strong></span>
                <span className="text-slate-600">•</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Credenciales solo en servidor</span>
              </p>
            </div>
          </div>

          {/* Estado de frescura + acciones */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${isStale ? 'bg-amber-950/40 border-amber-500/30 text-amber-300' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'}`}>
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-medium">
                {loading ? 'Sincronizando…' : `Última lectura: ${fechaCorta}`}
              </span>
            </div>

            {calidad?.quality && (
              <div className="px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 bg-indigo-950/40 border-indigo-500/30 text-indigo-300">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Con coste: <strong className="text-white">{calidad.quality.porcentaje_con_coste}%</strong></span>
                <span>Con stock: <strong className="text-white">{calidad.quality.porcentaje_con_stock}%</strong></span>
              </div>
            )}

            <button
              onClick={onRefreshCache}
              disabled={loading}
              className="btn-secondary text-xs"
              title="Servir la última caché sin tocar el ERP"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Ver caché</span>
            </button>

            <button
              onClick={onRefreshLive}
              disabled={loading}
              className="btn-primary text-xs"
              title="Ejecutar el extractor unificado contra Telematel ERP"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{loading ? 'Consultando…' : 'Consultar ERP ahora'}</span>
            </button>

            <button onClick={onExportExcel} className="btn-secondary text-xs" title="Exportar las filas filtradas a Excel">
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex items-center gap-2 mt-4 border-t border-slate-800 pt-3 overflow-x-auto">
          <TabButton active={activeTab === 'tabla'} onClick={() => setActiveTab('tabla')} icon={Layers} label="Maestro de artículos" />
          <TabButton active={activeTab === 'compras'} onClick={() => setActiveTab('compras')} icon={ShoppingBag} label="Gestión de Compras (Pedidos)" />
          <TabButton active={activeTab === 'listin11'} onClick={() => setActiveTab('listin11')} icon={ListFilter} label="LISTIN 11" />
          <TabButton active={activeTab === 'delegaciones'} onClick={() => setActiveTab('delegaciones')} icon={Server} label="Desglose por delegaciones" />
          <TabButton active={activeTab === 'api'} onClick={() => setActiveTab('api')} icon={ShieldCheck} label="Conector ODBC" />
        </div>
      </div>
    </header>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
        active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
