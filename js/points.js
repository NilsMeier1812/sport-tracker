// points.js – reine Punkte-Logik (dauer-basiert).
//
// Punkte = Dauer (Minuten) x Faktor der Sportart (points_per_minute).
// Auf ganze Punkte gerundet; eine echte Einheit gibt mindestens 1 Punkt.

export function calcPoints(durationMinutes, pointsPerMinute) {
  const minutes = Number(durationMinutes) || 0;
  const factor = Number(pointsPerMinute) || 0;
  if (minutes <= 0 || factor <= 0) return 0;
  return Math.max(1, Math.round(minutes * factor));
}

/** Punkte als String fuer die Anzeige. */
export function formatPoints(n) {
  return new Intl.NumberFormat('de-DE').format(Math.round(Number(n) || 0));
}
