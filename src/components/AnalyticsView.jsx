import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Label
} from 'recharts';
import { Tag, FolderTree, Award, BarChart2, PieChart as PieIcon, Euro } from 'lucide-react';

const PALETTE = [
  '#6366f1','#38bdf8','#34d399','#fbbf24','#a855f7',
  '#f43f5e','#fb923c','#2dd4bf','#e879f9','#facc15',
  '#4ade80','#60a5fa','#f87171','#c084fc','#86efac',
  '#fde047','#a78bfa','#fb7185','#22d3ee','#bef264'
];

const fmtC = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
const fmtFull = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v || 0);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(15,23,42,0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 13,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        {label && <p style={{ color: '#fff', fontWeight: 600, marginBottom: 8 }}>{label}</p>}
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || p.payload?.fill || '#34d399', marginBottom: 4, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <span>{p.name || p.dataKey}:</span>
            <strong style={{ fontFamily: 'monospace' }}>
              {p.name?.includes('Valor') || p.name?.includes('€') || p.dataKey === 'valuation' ? fmtFull(p.value) : p.value?.toLocaleString('es-ES')}
            </strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const SectionHeader = ({ icon: Icon, iconColor, title, subtitle }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: '50%',
        background: `${iconColor}22`,
        boxShadow: `0 0 12px ${iconColor}44`
      }}>
        <Icon style={{ width: 18, height: 18, color: iconColor }} />
      </div>
      <span style={{
        background: `linear-gradient(90deg, #fff, ${iconColor})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        {title}
      </span>
    </h2>
    {subtitle && <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{subtitle}</span>}
  </div>
);

const CenterLabel = ({ viewBox, value, label }) => {
  const { cx, cy } = viewBox;
  return (
    <text x={cx} y={cy} fill="#fff" textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.5em" fontSize="22" fontWeight="800" fontFamily="monospace">{value}</tspan>
      <tspan x={cx} dy="1.5em" fontSize="12" fill="#94a3b8">{label}</tspan>
    </text>
  );
};

export default function AnalyticsView({ rows }) {
  // Brand stats from detail rows
  const brandStats = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      const brand = r.nom_mar || r.cod_mar || 'Sin Marca';
      const stock = r.stock_disp || 0;
      const val = r.valoracion || 0;
      const cos = r.sin_coste ? 0 : (r.cos_art || 0);
      if (!map[brand]) map[brand] = { name: brand, count: 0, stock: 0, valuation: 0, totalCost: 0, conCoste: 0 };
      map[brand].count++;
      map[brand].stock += stock;
      map[brand].valuation += val;
      if (!r.sin_coste) { map[brand].totalCost += cos; map[brand].conCoste++; }
    });
    return Object.values(map)
      .map(b => ({ ...b, avgCost: b.conCoste > 0 ? b.totalCost / b.conCoste : 0 }))
      .sort((a, b) => b.valuation - a.valuation);
  }, [rows]);

  // Group stats
  const groupStats = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      const group = r.nom_grc || r.cod_grc || 'SIN GRUPO';
      if (!map[group]) map[group] = { name: group, count: 0, stock: 0, valuation: 0 };
      map[group].count++;
      map[group].stock += r.stock_disp || 0;
      map[group].valuation += r.valoracion || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [rows]);

  // Cost distribution
  const costDistribution = useMemo(() => {
    const buckets = [
      { range: 'Sin coste', count: 0 },
      { range: '0 – 1 €', count: 0 },
      { range: '1 – 5 €', count: 0 },
      { range: '5 – 20 €', count: 0 },
      { range: '20 – 50 €', count: 0 },
      { range: '50 – 100 €', count: 0 },
      { range: '100 +', count: 0 },
    ];
    rows.forEach(r => {
      if (r.sin_coste) { buckets[0].count++; return; }
      const c = r.cos_art || 0;
      if (c < 1) buckets[1].count++;
      else if (c < 5) buckets[2].count++;
      else if (c < 20) buckets[3].count++;
      else if (c < 50) buckets[4].count++;
      else if (c < 100) buckets[5].count++;
      else buckets[6].count++;
    });
    return buckets;
  }, [rows]);

  const top15Brands = brandStats.slice(0, 15);
  const top10BrandsPie = brandStats.slice(0, 10);
  const top10Groups = groupStats.slice(0, 10);
  const totalValuation = brandStats.reduce((a, b) => a + b.valuation, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 8, color: '#f8fafc' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {[
          { label: 'Marcas', value: brandStats.length, color: '#a855f7' },
          { label: 'Grupos', value: groupStats.length, color: '#38bdf8' },
          { label: 'Valoración total', value: fmtC(totalValuation), color: '#34d399' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderLeft: `3px solid ${k.color}`,
            borderRadius: 12,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <div>
              <p style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, margin: 0 }}>{k.label}</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginTop: 8, marginBottom: 0, fontFamily: 'monospace' }}>{k.value}</p>
            </div>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: `${k.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <BarChart2 style={{ width: 24, height: 24, color: k.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Top 15 Brands Bar Chart */}
      <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <SectionHeader icon={Award} iconColor="#fbbf24" title="Top 15 Marcas — Valoración" subtitle={`${rows.length.toLocaleString('es-ES')} filas`} />
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={top15Brands} margin={{ top: 10, right: 20, left: 20, bottom: 60 }}>
            <defs>
              {top15Brands.map((b, i) => (
                <linearGradient key={`grad-${i}`} id={`colorUv-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={1} />
                  <stop offset="100%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} angle={-45} textAnchor="end" interval={0} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
            <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k€`} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="valuation" name="Valoración €" radius={[6, 6, 0, 0]}>
              {top15Brands.map((_, i) => <Cell key={i} fill={`url(#colorUv-${i})`} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Donut Charts Side by Side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <SectionHeader icon={PieIcon} iconColor="#a855f7" title="Por marca (Top 10)" />
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={top10BrandsPie} dataKey="valuation" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} stroke="none">
                {top10BrandsPie.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                <Label content={<CenterLabel value={fmtC(top10BrandsPie.reduce((a, b) => a + b.valuation, 0))} label="Total Top 10" />} position="center" />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <SectionHeader icon={FolderTree} iconColor="#38bdf8" title="Por grupo (Top 10)" />
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={top10Groups} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} stroke="none">
                {top10Groups.map((_, i) => <Cell key={i} fill={PALETTE[(i + 5) % PALETTE.length]} />)}
                <Label content={<CenterLabel value={top10Groups.reduce((a, b) => a + b.count, 0).toLocaleString('es-ES')} label="Filas Top 10" />} position="center" />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost Distribution (Horizontal Bar) */}
      <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <SectionHeader icon={Euro} iconColor="#34d399" title="Distribución por coste de ficha (cos_art)" />
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={costDistribution} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis dataKey="range" type="category" tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 500 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="count" name="Filas" radius={[0, 6, 6, 0]} label={{ position: 'right', fill: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>
              {costDistribution.map((_, i) => <Cell key={i} fill={PALETTE[(i + 8) % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Brands Ranking Table */}
      <div style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: 600, display: 'flex', flexDirection: 'column' }}>
        <SectionHeader icon={Tag} iconColor="#fbbf24" title="Ranking de marcas" subtitle={`${brandStats.length} marcas`} />
        <div style={{ overflowY: 'auto', overflowX: 'auto', flex: 1, paddingRight: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
              <tr>
                {['#', 'Marca', 'Filas', 'Stock (uds)', 'Coste medio', 'Valoración', '% total'].map((h, i) => (
                  <th key={h} style={{
                    color: '#94a3b8', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
                    padding: '16px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)',
                    textAlign: i === 0 || i > 1 ? 'right' : 'left', whiteSpace: 'nowrap'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brandStats.map((b, i) => {
                const pct = totalValuation > 0 ? ((b.valuation / totalValuation) * 100).toFixed(1) : '0.0';
                let rankColor = '#475569';
                if (i === 0) rankColor = '#fbbf24';
                else if (i === 1) rankColor = '#e2e8f0';
                else if (i === 2) rankColor = '#b45309';

                return (
                  <tr key={b.name} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px', textAlign: 'right', color: rankColor, fontSize: 14, fontWeight: 800 }}>{i + 1}</td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#f8fafc', fontSize: 14 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0, boxShadow: `0 0 8px ${PALETTE[i % PALETTE.length]}88` }} />
                        {b.name}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1', fontFamily: 'monospace', fontSize: 14 }}>{b.count.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#94a3b8', fontFamily: 'monospace', fontSize: 14 }}>{b.stock.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#fbbf24', fontFamily: 'monospace', fontSize: 14 }}>{fmtFull(b.avgCost)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#34d399', fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{fmtC(b.valuation)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>{pct}%</span>
                        <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: PALETTE[i % PALETTE.length], borderRadius: 2 }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
