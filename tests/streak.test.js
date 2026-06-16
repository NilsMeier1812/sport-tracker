import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak, dayNumberFromISO } from '../js/streak.js';

const TODAY = '2026-06-16';
const todayNum = dayNumberFromISO(TODAY);

// Hilfsfunktion: ISO-Datum mit Versatz in Tagen relativ zu heute (negativ = Vergangenheit).
function d(offset) {
  return new Date((todayNum + offset) * 86400000).toISOString().slice(0, 10);
}

test('keine Aktivitaeten -> Streak 0', () => {
  const s = computeStreak([], todayNum);
  assert.equal(s.current, 0);
  assert.equal(s.longest, 0);
  assert.equal(s.status, 'none');
  assert.equal(s.trainedToday, false);
});

test('nur heute trainiert -> Streak 1, status today', () => {
  const s = computeStreak([d(0)], todayNum);
  assert.equal(s.current, 1);
  assert.equal(s.longest, 1);
  assert.equal(s.status, 'today');
  assert.equal(s.trainedToday, true);
});

test('drei Tage am Stueck inkl. heute -> Streak 3', () => {
  const s = computeStreak([d(-2), d(-1), d(0)], todayNum);
  assert.equal(s.current, 3);
  assert.equal(s.longest, 3);
  assert.equal(s.status, 'today');
});

test('Duplikate am selben Tag zaehlen nur einmal', () => {
  const s = computeStreak([d(0), d(0), d(-1)], todayNum);
  assert.equal(s.current, 2);
});

test('gestern trainiert, heute offen -> Streak haelt (safe)', () => {
  const s = computeStreak([d(-2), d(-1)], todayNum);
  assert.equal(s.current, 2);
  assert.equal(s.status, 'safe');
  assert.equal(s.trainedToday, false);
});

test('ein freier Tag mittendrin ist erlaubt (Abstand 2)', () => {
  // heute und vorgestern trainiert, gestern ausgelassen
  const s = computeStreak([d(-2), d(0)], todayNum);
  assert.equal(s.current, 2);
  assert.equal(s.status, 'today');
});

test('Joker verbraucht: vorgestern zuletzt, heute Pflicht (risk)', () => {
  const s = computeStreak([d(-4), d(-3), d(-2)], todayNum);
  assert.equal(s.current, 3);
  assert.equal(s.status, 'risk');
});

test('zwei freie Tage in Folge reissen die Streak', () => {
  // zuletzt vor 3 Tagen aktiv -> gestern und vorgestern fehlen
  const s = computeStreak([d(-5), d(-4), d(-3)], todayNum);
  assert.equal(s.current, 0);
  assert.equal(s.status, 'broken');
  assert.equal(s.longest, 3);
});

test('Bruch in der Historie: longest bleibt erhalten, current neu', () => {
  // Block A: d-10..d-8 (3), Luecke von 3 Tagen, Block B: d-4,d-3, dann heute
  const s = computeStreak([d(-10), d(-9), d(-8), d(-4), d(-3), d(0)], todayNum);
  assert.equal(s.longest, 3);
  // current: heute(-0) zurueck zu d-3? Abstand 3 -> Bruch. Also nur heute.
  assert.equal(s.current, 1);
  assert.equal(s.status, 'today');
});

test('lange Kette mit erlaubten Einzel-Luecken', () => {
  // jeweils ein Tag Pause: d-8, d-6, d-4, d-2, d0 -> Abstaende alle 2 -> Kette 5
  const s = computeStreak([d(-8), d(-6), d(-4), d(-2), d(0)], todayNum);
  assert.equal(s.current, 5);
  assert.equal(s.longest, 5);
});
