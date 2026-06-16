# 🔥 Sport-Duell

Eine kleine **PWA** für genau **zwei Personen**, die sich gegenseitig zu mehr Sport
motivieren wollen. Tragt eure Einheiten ein, sammelt **Punkte** (dauer-basiert) und
haltet eure **Streak** am Leben. Wer vorne liegt, trägt die Krone 👑.

- **Kein Framework** – reines HTML/CSS/JavaScript (ES-Module, kein Build-Schritt)
- **Datenbank:** Supabase (Postgres + Auth + Row Level Security)
- **Hosting:** Vercel (statisch, via GitHub)
- **PWA:** installierbar auf dem Homescreen, App-Shell offline verfügbar

---

## Funktionen

- **Duell-Übersicht:** beide Spieler:innen nebeneinander, Punkte, Streaks, „diese Woche", Krone für die Führung
- **Eintragen:** Sportart wählen, Dauer eingeben → Punkte werden live berechnet
- **Verlauf:** alle Einheiten nach Tagen gruppiert, eigene bearbeiten/löschen
- **Profil:** Name, Emoji und Farbe pro Person
- **Sportarten verwalten:** Sportarten und ihren Punkte-Faktor in der App anpassen

### Punkte
> **Punkte = Dauer (Minuten) × Faktor der Sportart** (auf ganze Punkte gerundet).
> Den Faktor jeder Sportart könnt ihr in den Einstellungen ändern.

### Streak-Regel
> Jeder Tag mit mindestens einer Aktivität erhöht die Streak um 1.
> **Ein** ausgelassener Tag ist erlaubt – die Streak bleibt erhalten, steigt aber nicht.
> **Zwei** freie Tage hintereinander setzen die Streak zurück.

---

## Einrichtung

### 1. Supabase-Projekt anlegen
1. Auf [supabase.com](https://supabase.com) ein kostenloses Projekt erstellen.
2. Im **SQL Editor** den Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen und ausführen.
   Das legt Tabellen, Sicherheitsregeln (RLS), einen Trigger fürs Profil und ein paar Start-Sportarten an.

### 2. Auth konfigurieren (Authentication → Providers / Settings)
- **Email** als Provider aktiviert lassen.
- Optional: „**Confirm email**" ausschalten, dann könnt ihr euch ohne Bestätigungs-Mail sofort anmelden.
- **Wichtig (2-Personen-App):** Nachdem ihr beide euch registriert habt, unter
  *Authentication → Sign In / Providers* **„Allow new users to sign up" deaktivieren**.
  So kann niemand sonst Konten anlegen.

### 3. Zugangsdaten eintragen
In Supabase unter **Project Settings → API** findest du `Project URL` und den `anon public` Key.
Beides in [`js/config.js`](js/config.js) eintragen:

```js
export const SUPABASE_URL = 'https://deinprojekt.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

> Der `anon`-Key ist **absichtlich öffentlich** und darf deployt werden – die Daten sind
> durch Row Level Security geschützt.

### 4. Lokal testen
Die App nutzt ES-Module und einen Service Worker und muss daher über HTTP laufen
(nicht per Doppelklick / `file://`):

```bash
# eine beliebige statische Server-Variante, z.B.:
npx serve .
# oder:
python3 -m http.server 8000
```

Dann `http://localhost:8000` (bzw. die angezeigte Adresse) öffnen.

### 5. Auf Vercel deployen
1. Dieses Repo zu GitHub pushen.
2. Auf [vercel.com](https://vercel.com) „**Add New → Project**" → das Repo importieren.
3. **Framework Preset: „Other"**, kein Build Command, Output = Projektwurzel.
4. Deploy. Fertig – die `vercel.json` setzt passende Header (z.B. fürs Manifest und den Service Worker).

### 6. Loslegen
Beide öffnen die Seite, **registrieren** sich einmalig, stellen unter **Profil** Name/Emoji/Farbe ein –
und das Duell beginnt. Auf dem Handy über „Zum Homescreen hinzufügen" als App installieren.

---

## Entwicklung

```bash
npm test         # Unit-Tests für Streak- und Punkte-Logik
python3 scripts/gen_icons.py   # PWA-Icons neu erzeugen (benötigt Pillow)
```

Nach Änderungen an den Dateien die `VERSION` in [`sw.js`](sw.js) erhöhen,
damit der Service Worker den Cache aktualisiert.

---

## Projektstruktur

```
index.html              App-Shell + Service-Worker-Registrierung
manifest.webmanifest    PWA-Manifest
sw.js                   Service Worker (Offline-Cache)
vercel.json             statisches Hosting + Header
css/styles.css          komplettes Styling (dunkel, mobile-first)
js/
  app.js                Einstiegspunkt (Konfig-Check, Laden)
  main.js               Controller: Auth-Status, Routing, Grundgerüst
  config.js             >>> hier Supabase-Zugang eintragen <<<
  supabaseClient.js     Supabase-Client (Bibliothek via ESM-CDN)
  auth.js               Login/Registrierung/Logout
  store.js              Zustand + Datenzugriff + Selektoren
  streak.js             reine Streak-Logik (getestet)
  points.js             reine Punkte-Logik (getestet)
  format.js             Datums-/Wochen-Helfer
  ui.js                 DOM-Helfer, Toasts, Dialoge
  views/                dashboard · log · history · settings · auth
supabase/schema.sql     Datenbank-Schema (im SQL-Editor ausführen)
tests/                  Node-Tests (node --test)
scripts/gen_icons.py    Icon-Generator
```

---

## Anpassen

- **Sportarten & Punkte-Faktoren:** direkt in der App unter *Profil → Sportarten*.
- **Name des Wettbewerbs:** `APP_TITLE` in `js/config.js`.
- **Farben/Design:** CSS-Variablen oben in `css/styles.css`.
