import React from 'react';
import { Euro, TrendingUp, Layers, AlertTriangle, XCircle, FileText } from 'lucide-react';

const KpiCard = ({ icon: Icon, iconColor, bgColor, label, value, sub, subColor }) => (
  <div className="kpi-card">
    <div className="kpi-glow" style={{ background: `linear-gradient(90deg, transparent, ${iconColor}80, transparent)` }} />
    <div>
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{value}</p>
      {sub && <p className="kpi-sub" style={{ color: subColor || '#64748b' }}>{sub}</p>}
    </div>
    <div className="kpi-icon" style={{ background: bgColor, border: `1px solid ${iconColor}30` }}>
      <Icon style={{ width: 22, height: 22, color: iconColor }} />
    </div>
  </div>
);

export default function KpiCards({ kpis }) {
  const fmt = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v || 0);
  const fmtN = (v) => new Intl.NumberFormat('es-ES').format(v || 0);
  const fmtC = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);

  const cards = [
    {
      icon: FileText, iconColor: '#38bdf8', bgColor: 'rgba(14,165,233,0.1)',
      label: 'Filas de detalle', value: fmtN(kpis.totalFilas),
      sub: `${kpis.totalArticles} artículos únicos`, subColor: '#38bdf8'
    },
    {
      icon: Euro, iconColor: '#34d399', bgColor: 'rgba(52,211,153,0.1)',
      label: 'Valoración', value: fmtC(kpis.totalValuation),
      sub: 'Σ cos_art × stock_disp', subColor: '#34d399'
    },
    {
      icon: TrendingUp, iconColor: '#818cf8', bgColor: 'rgba(99,102,241,0.1)',
      label: 'Coste medio (aritm.)', value: fmt(kpis.averageCost),
      sub: 'Solo filas con coste', subColor: '#818cf8'
    },
    {
      icon: Layers, iconColor: '#c084fc', bgColor: 'rgba(168,85,247,0.1)',
      label: 'Stock disponible', value: fmtN(kpis.totalStockUnits),
      sub: 'Σ stock_disp de las filas', subColor: '#c084fc'
    },
    {
      icon: AlertTriangle, iconColor: '#fbbf24', bgColor: 'rgba(251,191,36,0.1)',
      label: 'Sin coste', value: fmtN(kpis.sinCoste),
      sub: `de ${kpis.totalFilas} filas`, subColor: '#fbbf24'
    },
    {
      icon: XCircle, iconColor: '#f43f5e', bgColor: 'rgba(244,63,94,0.1)',
      label: 'Sin existencias', value: fmtN(kpis.sinStock),
      sub: `de ${kpis.totalFilas} filas`, subColor: '#f43f5e'
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map(c => <KpiCard key={c.label} {...c} />)}
    </div>
  );
}
