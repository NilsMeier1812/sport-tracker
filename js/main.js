// main.js – App-Controller: Auth-Status, Grundgeruest und Routing.
import { APP_TITLE } from './config.js';
import { el, clear, mount, toast } from './ui.js';
import { getSession, onAuthChange, signOut } from './auth.js';
import { state, onChange, loadAll, ensureMyProfile } from './store.js';
import { renderAuth } from './views/auth.js';
import { dashboardView } from './views/dashboard.js';
import { logView } from './views/log.js';
import { historyView } from './views/history.js';
import { settingsView } from './views/settings.js';

const ROUTES = {
  dashboard: { label: 'Duell', icon: '🏆', view: dashboardView },
  log: { label: 'Eintragen', icon: '➕', view: logView },
  history: { label: 'Verlauf', icon: '📜', view: historyView },
  settings: { label: 'Profil', icon: '⚙️', view: settingsView },
};

let currentUserId = null;
let appBuilt = false;
let mainEl = null;

export async function initApp() {
  const session = await getSession();
  applySession(session);

  onAuthChange(async (event, newSession) => {
    const newId = newSession?.user?.id || null;
    // Nur auf echte Wechsel reagieren (Token-Refresh ignorieren).
    if (newId === currentUserId && event !== 'SIGNED_OUT') return;
    applySession(newSession);
    if (newSession) await afterLogin();
    else showAuth();
  });

  onChange(() => {
    if (appBuilt) renderMain();
  });

  window.addEventListener('hashchange', () => {
    if (appBuilt) renderMain();
  });

  if (session) await afterLogin();
  else showAuth();
}

function applySession(session) {
  state.user = session?.user || null;
  currentUserId = session?.user?.id || null;
}

function showAuth() {
  appBuilt = false;
  mainEl = null;
  mount(renderAuth());
}

async function afterLogin() {
  try {
    await ensureMyProfile();
    await loadAll();
  } catch (err) {
    console.error(err);
    toast('Daten konnten nicht geladen werden.', 'error');
  }
  buildAppShell();
}

function buildAppShell() {
  const header = el(
    'header',
    { class: 'app-header' },
    el(
      'div',
      { class: 'brand' },
      el('span', { class: 'brand-emoji' }, '🔥'),
      el('span', { class: 'brand-name' }, APP_TITLE),
    ),
    el('button', { class: 'icon-btn', title: 'Aktualisieren', 'aria-label': 'Aktualisieren', onClick: refresh }, '⟳'),
  );

  mainEl = el('main', { class: 'app-main', id: 'main' });

  const nav = el(
    'nav',
    { class: 'tabbar' },
    ...Object.entries(ROUTES).map(([key, def]) =>
      el(
        'button',
        { class: 'tab', dataset: { route: key }, onClick: () => navigate(key) },
        el('span', { class: 'tab-icon' }, def.icon),
        el('span', { class: 'tab-label' }, def.label),
      ),
    ),
  );

  appBuilt = true;
  mount(el('div', { class: 'app-shell' }, header, mainEl, nav));
  renderMain();
}

function currentRoute() {
  const key = location.hash.replace('#', '');
  return ROUTES[key] ? key : 'dashboard';
}

export function navigate(route) {
  if (location.hash === '#' + route) renderMain();
  else location.hash = route;
}

function renderMain() {
  if (!mainEl) return;
  const route = currentRoute();
  document
    .querySelectorAll('.tab')
    .forEach((tab) => tab.classList.toggle('active', tab.dataset.route === route));

  clear(mainEl);
  const ctx = { state, navigate, refresh, signOut: doSignOut };
  try {
    mainEl.appendChild(ROUTES[route].view(ctx));
  } catch (err) {
    console.error(err);
    mainEl.appendChild(el('p', { class: 'muted pad' }, 'Diese Ansicht konnte nicht geladen werden.'));
  }
  mainEl.scrollTop = 0;
}

async function refresh() {
  try {
    await loadAll();
  } catch {
    toast('Aktualisieren fehlgeschlagen', 'error');
  }
}

async function doSignOut() {
  try {
    await signOut();
  } catch {
    toast('Abmelden fehlgeschlagen', 'error');
  }
}
