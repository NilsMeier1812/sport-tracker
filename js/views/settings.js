// views/settings.js – Profil, Sportarten-Verwaltung, Konto, Hilfe.
import { el, toast, openModal } from '../ui.js';
import { state, saveMyProfile, addType, updateType } from '../store.js';

const EMOJI_SUGGEST = ['🦊', '🐼', '🐯', '🦁', '🐺', '🐸', '🦄', '🐵', '💪', '⚡', '🔥', '🌟'];
const COLOR_SUGGEST = ['#1f4d3a', '#c8501e', '#d99a1c', '#7c2d12', '#2f6b4f', '#0f766e', '#b3331f', '#5b7553'];

export function settingsView(ctx) {
  const view = el('section', { class: 'view view-settings' });
  view.appendChild(profileCard());
  view.appendChild(typesCard());
  view.appendChild(howItWorksCard());
  view.appendChild(accountCard(ctx));
  return view;
}

// ------------------------------ Profil -------------------------------
function profileCard() {
  const me = state.me || { display_name: '', emoji: '🦊', color: '#1f4d3a' };

  const nameInput = el('input', { class: 'input', type: 'text', maxlength: '24', value: me.display_name || '' });
  const emojiInput = el('input', { class: 'input emoji-input', type: 'text', value: me.emoji || '🦊' });
  const colorInput = el('input', { class: 'color-input', type: 'color', value: me.color || '#1f4d3a' });

  const preview = el('span', { class: 'avatar', style: { background: me.color || '#1f4d3a' } }, me.emoji || '🦊');
  const syncPreview = () => {
    preview.textContent = emojiInput.value || '🦊';
    preview.style.background = colorInput.value;
  };
  emojiInput.addEventListener('input', syncPreview);
  colorInput.addEventListener('input', syncPreview);

  const emojiRow = el(
    'div',
    { class: 'suggest-row' },
    ...EMOJI_SUGGEST.map((e) =>
      el('button', { type: 'button', class: 'suggest', onClick: () => { emojiInput.value = e; syncPreview(); } }, e),
    ),
  );
  const colorRow = el(
    'div',
    { class: 'suggest-row' },
    ...COLOR_SUGGEST.map((c) =>
      el('button', {
        type: 'button',
        class: 'swatch',
        style: { background: c },
        'aria-label': c,
        onClick: () => { colorInput.value = c; syncPreview(); },
      }),
    ),
  );

  const save = el('button', { class: 'btn btn-primary', type: 'button' }, 'Profil speichern');
  save.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
      toast('Bitte einen Namen eingeben.', 'error');
      return;
    }
    save.disabled = true;
    try {
      await saveMyProfile({
        display_name: name.slice(0, 24),
        emoji: (emojiInput.value || '🦊').slice(0, 8),
        color: colorInput.value,
      });
      toast('Profil gespeichert', 'success', 1500);
    } catch {
      toast('Speichern fehlgeschlagen', 'error');
    } finally {
      save.disabled = false;
    }
  });

  return el(
    'div',
    { class: 'card' },
    el('h2', { class: 'card-title' }, '🙂 Mein Profil'),
    el('div', { class: 'profile-head' }, preview),
    field('Name', nameInput),
    field('Emoji', el('div', {}, emojiInput, emojiRow)),
    field('Farbe', el('div', { class: 'color-line' }, colorInput, colorRow)),
    save,
  );
}

// ---------------------------- Sportarten -----------------------------
function typesCard() {
  const card = el('div', { class: 'card' }, el('h2', { class: 'card-title' }, '🏅 Sportarten'));
  const list = el('div', { class: 'type-list' });

  if (state.types.length === 0) {
    list.appendChild(el('p', { class: 'muted' }, 'Noch keine Sportarten.'));
  }

  for (const t of state.types) {
    list.appendChild(
      el(
        'div',
        { class: 'type-row' + (t.is_active ? '' : ' inactive') },
        el('span', { class: 'type-emoji' }, t.emoji || '🏅'),
        el(
          'div',
          { class: 'type-main' },
          el('div', { class: 'type-name' }, t.name),
          el('div', { class: 'type-factor muted' }, `${formatFactor(t.points_per_minute)} Punkte / Min.`),
        ),
        el('button', { class: 'icon-btn sm', title: 'Bearbeiten', onClick: () => openTypeModal(t) }, '✏️'),
        toggleSwitch(t.is_active, async (on) => {
          try {
            await updateType(t.id, { is_active: on });
          } catch {
            toast('Konnte nicht ändern', 'error');
          }
        }),
      ),
    );
  }

  card.appendChild(list);
  card.appendChild(
    el('button', { class: 'btn btn-ghost btn-block', type: 'button', onClick: () => openTypeModal(null) }, '➕ Sportart hinzufügen'),
  );
  return card;
}

function openTypeModal(type) {
  openModal(
    (close) => {
      const isNew = !type;
      const nameInput = el('input', { class: 'input', type: 'text', maxlength: '40', value: type ? type.name : '', placeholder: 'z.B. Klettern' });
      const emojiInput = el('input', { class: 'input emoji-input', type: 'text', value: type ? type.emoji : '🏅' });
      const factorInput = el('input', {
        class: 'input',
        type: 'number',
        min: '0',
        step: '0.1',
        value: type ? String(type.points_per_minute) : '1.0',
      });

      const save = el('button', { class: 'btn btn-primary btn-block', type: 'button' }, isNew ? 'Hinzufügen' : 'Speichern');
      save.addEventListener('click', async () => {
        const name = nameInput.value.trim();
        const factor = parseFloat(factorInput.value);
        if (!name) return toast('Bitte einen Namen eingeben.', 'error');
        if (!(factor >= 0)) return toast('Bitte einen gültigen Faktor eingeben.', 'error');
        save.disabled = true;
        try {
          const payload = { name, emoji: (emojiInput.value || '🏅').slice(0, 8), points_per_minute: factor };
          if (isNew) await addType(payload);
          else await updateType(type.id, payload);
          toast('Gespeichert', 'success', 1500);
          close();
        } catch {
          toast('Speichern fehlgeschlagen', 'error');
          save.disabled = false;
        }
      });

      return el(
        'div',
        { class: 'edit-form' },
        field('Name', nameInput),
        field('Emoji', emojiInput),
        field('Punkte pro Minute', factorInput),
        el('p', { class: 'muted small' }, 'Beispiel: 0.4 = 4 Punkte für 10 Minuten. Bestehende Einträge bleiben unverändert.'),
        save,
      );
    },
    { title: type ? 'Sportart bearbeiten' : 'Neue Sportart' },
  );
}

// ----------------------------- Hilfe ---------------------------------
function howItWorksCard() {
  return el(
    'div',
    { class: 'card' },
    el('h2', { class: 'card-title' }, 'ℹ️ So funktioniert’s'),
    el(
      'ul',
      { class: 'help-list' },
      el('li', {}, el('strong', {}, 'Punkte: '), 'Dauer × Faktor der Sportart. Längere und intensivere Einheiten geben mehr.'),
      el('li', {}, el('strong', {}, 'Streak: '), 'Jeder Tag mit Aktivität zählt +1. Ein Tag Pause ist erlaubt (zählt aber nicht hoch); zwei freie Tage am Stück setzen sie zurück.'),
      el('li', {}, el('strong', {}, 'Duell: '), 'Wer die meisten Punkte sammelt, führt – die Krone 👑 zeigt’s an.'),
    ),
  );
}

// ----------------------------- Konto ---------------------------------
function accountCard(ctx) {
  return el(
    'div',
    { class: 'card' },
    el('h2', { class: 'card-title' }, '🔐 Konto'),
    el('p', { class: 'muted' }, (state.user && state.user.email) || ''),
    el('button', { class: 'btn btn-danger btn-block', type: 'button', onClick: () => ctx.signOut() }, 'Abmelden'),
  );
}

// ----------------------------- Helfer --------------------------------
function field(labelText, control) {
  return el('label', { class: 'field' }, el('span', { class: 'field-label' }, labelText), control);
}

function formatFactor(n) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(Number(n) || 0);
}

function toggleSwitch(on, onChange) {
  const input = el('input', { type: 'checkbox', ...(on ? { checked: '' } : {}) });
  input.addEventListener('change', () => onChange(input.checked));
  return el('label', { class: 'switch' }, input, el('span', { class: 'slider' }));
}
