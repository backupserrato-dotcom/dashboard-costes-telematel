import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderSummary, paginate, parsePowerShellJson, repairKnownMojibake } from '../server/serverUtils.js';

test('extrae JSON aunque PowerShell incluya texto y BOM', () => {
  assert.deepEqual(parsePowerShellJson('\uFEFFaviso\n{"success":true,"count":2}\nfin'), { success: true, count: 2 });
});

test('rechaza una salida de PowerShell sin JSON', () => {
  assert.throws(() => parsePowerShellJson('solo texto'), /no devolvió JSON/);
});

test('repara la codificación dañada sin modificar otros valores', () => {
  const input = [{ delegacion_nombre: '10 FontanerÃ­a', unidades: 3 }, 'María', null];
  assert.deepEqual(repairKnownMojibake(input), [
    { delegacion_nombre: '10 Fontanería', unidades: 3 },
    'María',
    null,
  ]);
});

test('resume pedidos con números, cadenas y claves únicas', () => {
  const summary = calculateOrderSummary([
    { pedido_id: '1', cod_art: 'A', unidades_pendientes: '2.5', importe_pendiente: '10.125' },
    { pedido_id: '1', cod_art: 'B', unidades_pendientes: 1, importe_pendiente: 5.555 },
  ]);
  assert.deepEqual(summary, {
    totalLineas: 2,
    totalPedidosUnicos: 1,
    totalArticulosUnicos: 2,
    totalUnidadesPendientes: 3.5,
    totalImportePendiente: 15.68,
  });
});

test('limita la paginación y corrige páginas fuera de rango', () => {
  const rows = Array.from({ length: 12 }, (_, index) => index + 1);
  assert.deepEqual(paginate(rows, 99, 5), { page: 3, pageSize: 5, totalPages: 3, pageData: [11, 12] });
  assert.equal(paginate(rows, 1, 999).pageSize, 500);
  assert.equal(paginate(rows, 1, 0).pageData, rows);
});
