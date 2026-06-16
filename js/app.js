// app.js – Einstiegspunkt. Prueft die Konfiguration und laedt erst danach
// den Rest der App (so koennen wir CDN-/Ladefehler sauber abfangen).
import { isConfigured } from './config.js';
import { showConfigScreen, showFatal } from './ui.js';

async function boot() {
  if (!isConfigured()) {
    showConfigScreen();
    return;
  }

  let main;
  try {
    main = await import('./main.js');
  } catch (err) {
    console.error(err);
    showFatal(
      'Die App-Module bzw. die Supabase-Bibliothek konnten nicht geladen werden. Bist du online?',
      String((err && err.message) || err),
    );
    return;
  }

  try {
    await main.initApp();
  } catch (err) {
    console.error(err);
    showFatal('Beim Start ist etwas schiefgelaufen.', String((err && err.message) || err));
  }
}

boot();
