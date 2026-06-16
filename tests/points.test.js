import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcPoints } from '../js/points.js';

test('Standardfall: 30 min x 1.0 = 30', () => {
  assert.equal(calcPoints(30, 1.0), 30);
});

test('niedriger Faktor: 50 min x 0.4 = 20', () => {
  assert.equal(calcPoints(50, 0.4), 20);
});

test('rundet kaufmaennisch: 25 min x 0.5 = 13', () => {
  assert.equal(calcPoints(25, 0.5), 13);
});

test('echte Einheit gibt mindestens 1 Punkt', () => {
  assert.equal(calcPoints(1, 0.4), 1);
});

test('keine Dauer -> 0 Punkte', () => {
  assert.equal(calcPoints(0, 1.0), 0);
});

test('Faktor 0 -> 0 Punkte', () => {
  assert.equal(calcPoints(30, 0), 0);
});

test('ungueltige Eingaben -> 0', () => {
  assert.equal(calcPoints('abc', 1.0), 0);
  assert.equal(calcPoints(30, null), 0);
});
