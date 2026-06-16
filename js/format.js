// format.js – kleine Helfer fuer Datums-/Wochenformatierung (Deutsch).

const longFmt = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
});

/** 'YYYY-MM-DD' -> Date (lokale Mitternacht). */
export function parseISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Montag der Woche von d (lokal). */
export function startOfWeek(d = new Date()) {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (dt.getDay() + 6) % 7; // Mo=0 … So=6
  dt.setDate(dt.getDate() - day);
  return dt;
}

/** Liegt das ISO-Datum in der aktuellen Kalenderwoche? */
export function isThisWeek(iso, now = new Date()) {
  const date = parseISO(iso);
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

/** Menschlich lesbarer Tag: Heute / Gestern / Vorgestern / "Mo., 12.06." */
export function relativeDay(iso, now = new Date()) {
  const date = parseISO(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today - date) / 86400000);
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  if (diff === 2) return 'Vorgestern';
  return longFmt.format(date);
}

/** Dauer in Minuten -> "45 min" / "1 h 30 min". */
export function formatDuration(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}
