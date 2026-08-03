import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Building2 } from 'lucide-react';

const euro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const compactEuro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 });
const number = new Intl.NumberFormat('es-ES');

function aggregate(rows, keyFor, labelFor) {
  const values = new Map();
  rows.forEach((row) => {
    const key = keyFor(row);
    if (!key) return;
    const current = values.get(key) || { name: labelFor(row), valoracion: 0, stock: 0 };
    current.valoracion += Number(row.valoracion) || 0;
    current.stock += Number(row.stock_disp) || 0;
    values.set(key, current);
  });
  return [...values.values()].sort((a, b) => b.valoracion - a.valoracion);
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return <div className="chart-tooltip"><strong>{label}</strong><span>{euro.format(row.valoracion)}</span><small>{number.format(row.stock)} uds. de stock</small></div>;
}

const EmptyChart = () => <div className="chart-empty">No hay valoración disponible con los filtros actuales.</div>;

export default function DashboardCharts({ rows }) {
  const { delegations, groups } = useMemo(() => ({
    delegations: aggregate(rows, (r) => `${r.empresa_id || ''}|${r.delegacion_id || ''}`, (r) => r.delegacion_nombre || r.delegacion_id || 'Sin delegación').slice(0, 8),
    groups: aggregate(rows, (r) => r.cod_grc || r.nom_grc, (r) => r.nom_grc || r.cod_grc || 'Sin grupo').slice(0, 7),
  }), [rows]);
  const maxGroup = groups[0]?.valoracion || 0;

  return (
    <section className="dashboard-charts" aria-label="Resumen visual de costes y stock">
      <article className="chart-panel">
        <div className="chart-heading"><div><h2><Building2 aria-hidden="true" /> Valoración por delegación</h2><p>Comparativa del inventario valorado con los filtros aplicados</p></div><span className="chart-unit">EUR</span></div>
        {delegations.length === 0 ? <EmptyChart /> : <div className="chart-canvas" role="img" aria-label="Gráfico de barras de valoración por delegación">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={delegations} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <YAxis tickFormatter={(v) => compactEuro.format(v)} tickLine={false} axisLine={false} width={64} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--chart-hover)' }} />
            <Bar dataKey="valoracion" radius={[5, 5, 0, 0]} maxBarSize={44} fill="var(--accent-blue)" />
          </BarChart></ResponsiveContainer>
        </div>}
      </article>
      <article className="chart-panel">
        <div className="chart-heading"><div><h2><BarChart3 aria-hidden="true" /> Grupos con mayor valoración</h2><p>Concentración del valor para priorizar revisión y compras</p></div><span className="chart-unit">TOP {groups.length}</span></div>
        {groups.length === 0 ? <EmptyChart /> : <div className="ranking-list" aria-label="Ranking de grupos por valoración">
          {groups.map((group, index) => <div className="ranking-row" key={group.name}>
            <span className="ranking-position">{index + 1}</span><div className="ranking-main"><div className="ranking-label"><span title={group.name}>{group.name}</span><strong>{compactEuro.format(group.valoracion)}</strong></div><div className="ranking-track" aria-hidden="true"><span style={{ width: `${maxGroup ? (group.valoracion / maxGroup) * 100 : 0}%` }} /></div></div>
          </div>)}
        </div>}
      </article>
    </section>
  );
}
