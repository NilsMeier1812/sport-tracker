// =====================================================================
//  KONFIGURATION – hier deine Supabase-Zugangsdaten eintragen.
//  Zu finden im Supabase-Dashboard unter:  Project Settings -> API
//
//  Der "anon / public" Key ist absichtlich oeffentlich. Die Daten sind
//  durch Row Level Security (siehe supabase/schema.sql) geschuetzt,
//  daher darf dieser Key im Code stehen und deployed werden.
// =====================================================================

export const SUPABASE_URL = 'https://lboxlxzivkburggucknf.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxib3hseHppdmtidXJnZ3Vja25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2Mzc2OTgsImV4cCI6MjA5NzIxMzY5OH0.89Prjmdil84MPelq-SQutz2mSbSrB3h4PFeMpuhn1Zg';

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
