import React, { useEffect, useRef, useState } from 'react';
import { Euro, TrendingUp, Layers, AlertTriangle, XCircle, FileText } from 'lucide-react';

const KpiCard = ({ icon: Icon, iconColor, bgColor, label, rawValue, formatter, sub, subColor, barPct }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    let start;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimatedValue(rawValue);
      return undefined;
    }
    const duration = 1200;
    
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const pct = Math.min(progress / duration, 1);
      // easeOut function
      const easePct = 1 - Math.pow(1 - pct, 3);
      setAnimatedValue(rawValue * easePct);
      
      if (progress < duration) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        setAnimatedValue(rawValue);
      }
    };
    
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [rawValue]);

  return (
    <div className="kpi-card" style={{ '--kpi-accent': iconColor }}>
      <div className="kpi-glow" style={{ background: `linear-gradient(90deg, transparent, ${iconColor}80, transparent)` }} />
      <div>
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{formatter(animatedValue)}</p>
        {sub && <p className="kpi-sub" style={{ color: subColor || '#64748b' }}>{sub}</p>}
        {barPct !== undefined && (
          <div className="kpi-bar-track">
            <div className="kpi-bar-fill" style={{ width: `${Math.min(100, Math.max(0, barPct))}%`, background: iconColor }} />
          </div>
        )}
      </div>
      <div className="kpi-icon" style={{ background: bgColor, border: `1px solid ${iconColor}30` }}>
        <Icon style={{ width: 22, height: 22, color: iconColor }} />
      </div>
    </div>
  );
};

export default function KpiCards({ kpis }) {
  const fmt = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v || 0);
  const fmtN = (v) => new Intl.NumberFormat('es-ES').format(v || 0);
  const fmtC = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);

  const total = kpis.totalFilas || 1;

  const cards = [
    {
      icon: FileText, iconColor: '#38bdf8', bgColor: 'rgba(14,165,233,0.1)',
      label: 'Filas de detalle', rawValue: kpis.totalFilas || 0, formatter: fmtN,
      sub: `${kpis.totalArticles || 0} artículos únicos`, subColor: '#38bdf8'
    },
    {
      icon: Euro, iconColor: '#34d399', bgColor: 'rgba(52,211,153,0.1)',
      label: 'Valoración', rawValue: kpis.totalValuation || 0, formatter: fmtC,
      sub: 'Σ coste × stock disponible', subColor: '#34d399'
    },
    {
      icon: TrendingUp, iconColor: '#818cf8', bgColor: 'rgba(99,102,241,0.1)',
      label: 'Coste medio (aritm.)', rawValue: kpis.averageCost || 0, formatter: fmt,
      sub: 'Solo filas con coste', subColor: '#818cf8'
    },
    {
      icon: Layers, iconColor: '#c084fc', bgColor: 'rgba(168,85,247,0.1)',
      label: 'Stock disponible', rawValue: kpis.totalStockUnits || 0, formatter: fmtN,
      sub: 'Total en las filas filtradas', subColor: '#c084fc'
    },
    {
      icon: AlertTriangle, iconColor: '#fbbf24', bgColor: 'rgba(251,191,36,0.1)',
      label: 'Sin coste', rawValue: kpis.sinCoste || 0, formatter: fmtN,
      sub: `de ${kpis.totalFilas || 0} filas`, subColor: '#fbbf24', barPct: ((kpis.sinCoste || 0) / total) * 100
    },
    {
      icon: XCircle, iconColor: '#f43f5e', bgColor: 'rgba(244,63,94,0.1)',
      label: 'Sin existencias', rawValue: kpis.sinStock || 0, formatter: fmtN,
      sub: `de ${kpis.totalFilas || 0} filas`, subColor: '#f43f5e', barPct: ((kpis.sinStock || 0) / total) * 100
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map(c => <KpiCard key={c.label} {...c} />)}
    </div>
  );
}
