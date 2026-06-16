// streak.js – reine, testbare Streak-Logik (keine DOM/Netzwerk-Abhaengigkeiten).
//
// Regel (vom Nutzer festgelegt):
//   - Jeder Tag mit mindestens einer Aktivitaet erhoeht die Streak um 1.
//   - Ein einzelner ausgelassener Tag ist erlaubt: die Streak bleibt erhalten,
//     steigt aber an diesem Tag nicht.
//   - Zwei (oder mehr) ausgelassene Tage hintereinander setzen die Streak zurueck.
//
// Technisch: aufeinanderfolgende aktive Tage gehoeren zur selben Kette, solange
// der Abstand zwischen zwei aktiven Tagen <= 2 Tage ist (also hoechstens ein
// freier Tag dazwischen liegt). Die Streak zaehlt die aktiven Tage der Kette.

const MS_PER_DAY = 86400000;

/** Wandelt 'YYYY-MM-DD' in eine fortlaufende Tagesnummer (UTC) um. */
export function dayNumberFromISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

/** Lokales Datum als 'YYYY-MM-DD'. */
export function isoToday(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Tagesnummer fuer "heute" (lokal). */
export function todayDayNumber(now = new Date()) {
  return dayNumberFromISO(isoToday(now));
}

/**
 * Berechnet die Streak aus einer Liste von Aktivitaets-Daten.
 * @param {string[]} dates  ISO-Daten ('YYYY-MM-DD'), Reihenfolge/Duplikate egal.
 * @param {number} todayNum Tagesnummer von heute (Standard: heute).
 * @returns {{current:number, longest:number, lastActive:(number|null),
 *            trainedToday:boolean, status:('none'|'today'|'safe'|'risk'|'broken')}}
 *   status:
 *     'none'   – noch keine Aktivitaet
 *     'today'  – heute bereits trainiert
 *     'safe'   – gestern trainiert, heute noch offen (Streak haelt locker)
 *     'risk'   – Joker-Tag bereits verbraucht, heute ist Pflicht
 *     'broken' – Streak gerissen (>= 2 freie Tage in Folge)
 */
export function computeStreak(dates, todayNum = todayDayNumber()) {
  const days = [...new Set((dates || []).map(dayNumberFromISO))]
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  const result = {
    current: 0,
    longest: 0,
    lastActive: null,
    trainedToday: false,
    status: 'none',
  };
  if (days.length === 0) return result;

  // Laengste Kette ueber die gesamte Historie.
  let run = 1;
  let longest = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] - days[i - 1] <= 2 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  result.longest = longest;

  const last = days[days.length - 1];
  result.lastActive = last;
  result.trainedToday = last === todayNum;

  const gap = todayNum - last;
  if (gap > 2) {
    // Mindestens zwei freie Tage bis heute -> gerissen.
    result.current = 0;
    result.status = 'broken';
    return result;
  }

  // Aktuelle Kette, die beim letzten aktiven Tag endet.
  let cur = 1;
  let i = days.length - 1;
  while (i > 0 && days[i] - days[i - 1] <= 2) {
    cur++;
    i--;
  }
  result.current = cur;
  result.status = gap === 0 ? 'today' : gap === 1 ? 'safe' : 'risk';
  return result;
}
