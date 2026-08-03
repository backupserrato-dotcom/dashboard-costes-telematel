import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Tag, FolderTree, Award, BarChart2, PieChart as PieIcon, Euro } from 'lucide-react';

const PALETTE = [
  '#6366f1','#38bdf8','#34d399','#fbbf24','#a855f7',
  '#f43f5e','#fb923c','#2dd4bf','#e879f9','#facc15',
  '#4ade80','#60a5fa','#f87171','#c084fc','#34d399',
  '#fde047','#a78bfa','#fb7185','#22d3ee','#86efac'
];

const fmtC = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
const fmtFull = (v) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v || 0);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
        <p style={{ color: '#a5b4fc', fontWeight: 700, marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || '#34d399', marginBottom: 2 }}>
            <strong>{p.name}:</strong> {p.name?.includes('Valor') ? fmtFull(p.value) : p.value?.toLocaleString('es-ES')}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div style={{ background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
        <p style={{ color: '#a5b4fc', fontWeight: 700, marginBottom: 4 }}>{d.name}</p>
        <p style={{ color: '#34d399' }}>Valoración: <strong>{fmtFull(d.value)}</strong></p>
        {d.payload.count !== undefined && <p style={{ color: '#38bdf8' }}>Filas: <strong>{d.payload.count}</strong></p>}
      </div>
    );
  }
  return null;
};

const SectionHeader = ({ icon: Icon, iconColor, title, subtitle }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 16, borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon style={{ width: 18, height: 18, color: iconColor }} />
      {title}
    </h2>
    {subtitle && <span style={{ fontSize: 12, color: '#64748b' }}>{subtitle}</span>}
  </div>
);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Marcas', value: brandStats.length, color: '#a855f7' },
          { label: 'Grupos', value: groupStats.length, color: '#38bdf8' },
          { label: 'Valoración total', value: fmtC(totalValuation), color: '#34d399' },
        ].map(k => (
          <div key={k.label} style={{ background: 'rgba(30,41,59,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{k.label}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: k.color, marginTop: 4, fontFamily: 'monospace' }}>{k.value}</p>
            </div>
            <BarChart2 style={{ width: 28, height: 28, color: k.color, opacity: 0.4 }} />
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(30,41,59,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
        <SectionHeader icon={Award} iconColor="#fbbf24" title="Top 15 Marcas — Valoración" subtitle={`${rows.length.toLocaleString('es-ES')} filas`} />
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={top15Brands} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k€`} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="valuation" name="Valoración €" radius={[4, 4, 0, 0]}>
              {top15Brands.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'rgba(30,41,59,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
          <SectionHeader icon={PieIcon} iconColor="#a855f7" title="Por marca (Top 10)" />
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={top10BrandsPie} dataKey="valuation" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2}>
                {top10BrandsPie.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: 'rgba(30,41,59,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
          <SectionHeader icon={FolderTree} iconColor="#38bdf8" title="Por grupo (Top 10)" />
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={top10Groups} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2}>
                {top10Groups.map((_, i) => <Cell key={i} fill={PALETTE[(i + 5) % PALETTE.length]} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: 'rgba(30,41,59,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
        <SectionHeader icon={Euro} iconColor="#34d399" title="Distribución por coste de ficha (cos_art)" />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={costDistribution} margin={{ top: 5, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Filas" radius={[4, 4, 0, 0]} fill="#34d399" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: 'rgba(30,41,59,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
        <SectionHeader icon={Tag} iconColor="#fbbf24" title="Ranking de marcas" subtitle={`${brandStats.length} marcas`} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                {['#', 'Marca', 'Filas', 'Stock (uds)', 'Coste medio', 'Valoración', '% total'].map(h => (
                  <th key={h} style={{ background: '#1e293b', color: '#94a3b8', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 12px', borderBottom: '1px solid #334155', textAlign: h === '#' || h === 'Filas' || h === 'Stock (uds)' || h === 'Coste medio' || h === 'Valoración' || h === '% total' ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brandStats.map((b, i) => {
                const pct = totalValuation > 0 ? ((b.valuation / totalValuation) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={b.name} style={{ borderBottom: '1px solid rgba(51,65,85,0.4)' }}>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#475569', fontSize: 12, fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                        {b.name}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#a5b4fc', fontFamily: 'monospace', fontSize: 13 }}>{b.count.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#94a3b8', fontFamily: 'monospace', fontSize: 13 }}>{b.stock.toLocaleString('es-ES')}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#fbbf24', fontFamily: 'monospace', fontSize: 13 }}>{fmtFull(b.avgCost)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#34d399', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{fmtC(b.valuation)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#64748b', fontSize: 11 }}>{pct}%</td>
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
