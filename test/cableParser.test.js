import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCableSectionAndColor } from '../src/utils/cableParser.js';

test('devuelve valores neutros cuando no hay descripción', () => {
  assert.deepEqual(parseCableSectionAndColor(), {
    section: 'OTRA',
    color: 'OTRO',
    family: 'GENERAL',
  });
});

test('detecta sección decimal, color y familia', () => {
  assert.deepEqual(parseCableSectionAndColor('Cable H07V-K 1x2,5 mm azul'), {
    section: '2.5',
    color: 'AZUL',
    family: 'H07V-K',
  });
});

test('normaliza la sección 32 como 35', () => {
  const result = parseCableSectionAndColor('H07Z1-K 1x32 mm negro');
  assert.equal(result.section, '35');
  assert.equal(result.color, 'NEGRO');
});

test('prioriza el conductor amarillo/verde frente al color verde', () => {
  const result = parseCableSectionAndColor('ES05Z1-K 1x6 mm amarillo/verde');
  assert.equal(result.family, 'ES05Z1-K');
  assert.equal(result.section, '6');
  assert.equal(result.color, 'AMARILLO/VERDE');
});

test('conserva sección desconocida y color no informado', () => {
  assert.deepEqual(parseCableSectionAndColor('Cable especial 50 mm'), {
    section: 'OTRA',
    color: 'OTRO / SIN COLOR',
    family: 'H07Z1-K',
  });
});
