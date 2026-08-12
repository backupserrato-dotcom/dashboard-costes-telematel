export function parsePowerShellJson(stdout) {
  const clean = String(stdout || '').replace(/^\uFEFF/, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('El script no devolvió JSON');
  return JSON.parse(clean.slice(start, end + 1));
}

export function calculateOrderSummary(orders = []) {
  let totalImportePendiente = 0;
  let totalUnidadesPendientes = 0;
  const pedidosUnicos = new Set();
  const articulosUnicos = new Set();

  for (const order of orders) {
    totalImportePendiente += Number(order.importe_pendiente) || 0;
    totalUnidadesPendientes += Number(order.unidades_pendientes) || 0;
    if (order.pedido_id) pedidosUnicos.add(order.pedido_id);
    if (order.cod_art) articulosUnicos.add(order.cod_art);
  }

  return {
    totalLineas: orders.length,
    totalPedidosUnicos: pedidosUnicos.size,
    totalArticulosUnicos: articulosUnicos.size,
    totalUnidadesPendientes: Math.round(totalUnidadesPendientes * 100) / 100,
    totalImportePendiente: Math.round(totalImportePendiente * 100) / 100,
  };
}

export function paginate(data, requestedPage, requestedPageSize, maxPageSize = 500) {
  const page = Math.max(Number.parseInt(requestedPage, 10) || 1, 1);
  const rawPageSize = Number.parseInt(requestedPageSize, 10) || 0;
  const pageSize = rawPageSize > 0 ? Math.min(rawPageSize, maxPageSize) : 0;
  if (pageSize === 0) return { page: 1, pageSize: 0, totalPages: 1, pageData: data };
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return { page: safePage, pageSize, totalPages, pageData: data.slice(start, start + pageSize) };
}
