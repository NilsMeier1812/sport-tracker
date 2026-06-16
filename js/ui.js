// ui.js – kleine DOM-Helfer ohne Framework (sicheres Erzeugen von Elementen,
// Toasts, Bestaetigungsdialog, Fehler-/Konfig-Screens).

/**
 * Erzeugt ein Element. Kindelemente, die als String/Zahl uebergeben werden,
 * landen als Textknoten (kein HTML-Injection-Risiko bei Nutzerinhalten).
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style' && typeof value === 'object') {
      for (const [prop, val] of Object.entries(value)) {
        if (val == null) continue;
        // Custom Properties (--x) brauchen setProperty, normale gehen direkt.
        if (prop.startsWith('--')) node.style.setProperty(prop, val);
        else node.style[prop] = val;
      }
    }
    else if (key === 'html') node.innerHTML = value; // nur fuer vertrauenswuerdige Inhalte
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    node.appendChild(
      child instanceof Node ? child : document.createTextNode(String(child)),
    );
  }
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function mount(node) {
  const root = document.getElementById('root');
  clear(root);
  root.appendChild(node);
  return root;
}

// ------------------------------ Toasts -------------------------------
function toastLayer() {
  let layer = document.getElementById('toast-layer');
  if (!layer) {
    layer = el('div', { id: 'toast-layer', class: 'toast-layer' });
    document.body.appendChild(layer);
  }
  return layer;
}

export function toast(message, type = 'info', timeout = 3200) {
  const node = el('div', { class: `toast toast-${type}`, role: 'status' }, message);
  toastLayer().appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 250);
  }, timeout);
}

// -------------------------- Bestaetigung -----------------------------
export function confirmDialog({
  title = 'Bist du sicher?',
  message = '',
  confirmText = 'OK',
  cancelText = 'Abbrechen',
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const overlay = el('div', { class: 'overlay' });
    const close = (result) => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 200);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
    };
    const card = el(
      'div',
      { class: 'dialog' },
      el('h3', {}, title),
      message ? el('p', { class: 'dialog-msg' }, message) : null,
      el(
        'div',
        { class: 'dialog-actions' },
        el('button', { class: 'btn btn-ghost', onClick: () => close(false) }, cancelText),
        el(
          'button',
          { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, onClick: () => close(true) },
          confirmText,
        ),
      ),
    );
    overlay.appendChild(card);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
  });
}

// ------------------------- Generisches Modal -------------------------
export function openModal(contentBuilder, { title = '' } = {}) {
  const overlay = el('div', { class: 'overlay' });
  const close = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 200);
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  const body = el('div', { class: 'modal-body' });
  const card = el(
    'div',
    { class: 'dialog dialog-modal' },
    el(
      'div',
      { class: 'modal-head' },
      el('h3', {}, title),
      el('button', { class: 'icon-btn', 'aria-label': 'Schliessen', onClick: close }, '✕'),
    ),
    body,
  );
  body.appendChild(contentBuilder(close));
  overlay.appendChild(card);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  return close;
}

// --------------------- Spezial-Screens (Root) ------------------------
export function showFatal(message, detail = '') {
  mount(
    el(
      'div',
      { class: 'screen center' },
      el('div', { class: 'flame-lg' }, '⚠️'),
      el('h1', {}, 'Ups'),
      el('p', { class: 'muted' }, message),
      detail ? el('pre', { class: 'errbox' }, detail) : null,
      el('button', { class: 'btn btn-primary', onClick: () => location.reload() }, 'Neu laden'),
    ),
  );
}

export function showConfigScreen() {
  mount(
    el(
      'div',
      { class: 'screen center' },
      el('div', { class: 'flame-lg' }, '🛠️'),
      el('h1', {}, 'Fast fertig!'),
      el(
        'p',
        { class: 'muted' },
        'Trage deine Supabase-Zugangsdaten in ',
        el('code', {}, 'js/config.js'),
        ' ein, dann ist die App startklar.',
      ),
      el(
        'ol',
        { class: 'steps' },
        el('li', {}, 'Supabase-Projekt erstellen (supabase.com).'),
        el('li', {}, 'Im SQL-Editor das Skript aus supabase/schema.sql ausfuehren.'),
        el(
          'li',
          {},
          'Project Settings → API: ',
          el('code', {}, 'Project URL'),
          ' und ',
          el('code', {}, 'anon public'),
          ' Key kopieren.',
        ),
        el('li', {}, 'Beides in js/config.js eintragen und neu laden.'),
      ),
    ),
  );
}
