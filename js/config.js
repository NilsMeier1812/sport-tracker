// =====================================================================
//  KONFIGURATION – hier deine Supabase-Zugangsdaten eintragen.
//  Zu finden im Supabase-Dashboard unter:  Project Settings -> API
//
//  Der "anon / public" Key ist absichtlich oeffentlich. Die Daten sind
//  durch Row Level Security (siehe supabase/schema.sql) geschuetzt,
//  daher darf dieser Key im Code stehen und deployed werden.
// =====================================================================

export const SUPABASE_URL = 'https://DEIN-PROJEKT.supabase.co';
export const SUPABASE_ANON_KEY = 'DEIN-ANON-PUBLIC-KEY';

// Optionaler Name fuer den Wettbewerb (erscheint in der Kopfzeile).
export const APP_TITLE = 'Sport-Duell';

/** Prueft, ob die Platzhalter oben ersetzt wurden. */
export function isConfigured() {
  return (
    /^https:\/\/[a-z0-9-]+\.supabase\.co/i.test(SUPABASE_URL) &&
    typeof SUPABASE_ANON_KEY === 'string' &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_ANON_KEY.includes('DEIN')
  );
}
