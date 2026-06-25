// views/log.js – Aktivitaet eintragen (dauer-basierte Punkte).
import { el, toast, toggleSwitch } from '../ui.js';
import { calcPoints, formatPoints } from '../points.js';
import { isoToday } from '../streak.js';
import { state, players, activeTypes, addActivity } from '../store.js';

const QUICK_MINUTES = [15, 30, 45, 60, 90];

export function logView(ctx) {
  const types = activeTypes();
  const me = state.me;

  const form = el('form', { class: 'view view-log' });

  form.appendChild(
    el(
      'div',
      { class: 'log-head' },
      el('span', { class: 'avatar sm', style: { background: (me && me.color) || '#1f4d3a' } }, (me && me.emoji) || '🦊'),
      el('div', {}, el('div', { class: 'log-for' }, 'Eintrag für'), el('div', { class: 'log-name' }, (me && me.display_name) || 'dich')),
    ),
  );

  if (types.length === 0) {
    form.appendChild(
      el(
        'div',
        { class: 'card' },
        el('p', { class: 'muted' }, 'Es gibt noch keine Sportarten.'),
        el('button', { class: 'btn btn-primary', type: 'button', onClick: () => ctx.navigate('settings') }, 'Sportart anlegen'),
      ),
    );
    return form;
  }

  const sel = { typeId: types[0].id, duration: 30, date: isoToday(), note: '' };

  // --- Sportart -------------------------------------------------------
  const chips = el('div', { class: 'chip-grid' });
  types.forEach((t) => {
    const chip = el(
      'button',
      {
        type: 'button',
        class: 'chip' + (t.id === sel.typeId ? ' active' : ''),
        dataset: { id: t.id },
        onClick: () => {
          sel.typeId = t.id;
          chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.id === t.id));
          update();
        },
      },
      el('span', { class: 'chip-emoji' }, t.emoji || '🏅'),
      el('span', { class: 'chip-name' }, t.name),
    );
    chips.appendChild(chip);
  });

  // --- Dauer ----------------------------------------------------------
  const durationInput = el('input', {
    class: 'input',
    type: 'number',
    min: '1',
    max: '600',
    inputmode: 'numeric',
    value: String(sel.duration),
  });
  durationInput.addEventListener('input', () => {
    sel.duration = parseInt(durationInput.value, 10) || 0;
    update();
  });
  const quick = el(
    'div',
    { class: 'quick-row' },
    ...QUICK_MINUTES.map((m) =>
      el(
        'button',
        {
          type: 'button',
          class: 'pill',
          onClick: () => {
            sel.duration = m;
            durationInput.value = String(m);
            update();
          },
        },
        m + '′',
      ),
    ),
  );

  // --- Datum ----------------------------------------------------------
  const dateInput = el('input', { class: 'input', type: 'date', value: sel.date, max: isoToday() });
  dateInput.addEventListener('input', () => {
    sel.date = dateInput.value || isoToday();
  });

  // --- Notiz ----------------------------------------------------------
  const noteInput = el('textarea', { class: 'input', rows: '2', placeholder: 'Notiz (optional)' });
  noteInput.addEventListener('input', () => {
    sel.note = noteInput.value;
  });

  // --- Vorschau / Speichern ------------------------------------------
  const preview = el('div', { class: 'points-preview' });
  const submit = el('button', { class: 'btn btn-primary btn-block btn-cta', type: 'submit' });

  function currentType() {
    return types.find((t) => t.id === sel.typeId) || types[0];
  }
  function currentPoints() {
    return calcPoints(sel.duration, currentType().points_per_minute);
  }
  function update() {
    const pts = currentPoints();
    preview.textContent = '';
    preview.append(
      el('span', { class: 'pv-num' }, formatPoints(pts)),
      el('span', { class: 'pv-unit' }, ' Punkte'),
    );
    submit.textContent = pts > 0 ? `Speichern  ·  +${formatPoints(pts)}` : 'Dauer eingeben';
    submit.disabled = pts <= 0;
  }

  // --- Fuer beide eintragen (gemeinsame Einheit) ----------------------
  const partner = players()[1];
  let forBoth = false;
  const bothRow = partner
    ? el(
        'div',
        { class: 'card both-row' },
        el(
          'div',
          { class: 'both-text' },
          el('span', { class: 'both-emoji' }, '🤝'),
          el(
            'div',
            {},
            el('div', { class: 'both-title' }, 'Zusammen gemacht?'),
            el('div', { class: 'both-sub muted' }, `Zählt auch für ${partner.display_name}`),
          ),
        ),
        toggleSwitch(false, (on) => {
          forBoth = on;
        }),
      )
    : null;

  form.append(
    field('Sportart', chips),
    field('Dauer (Minuten)', el('div', {}, durationInput, quick)),
    field('Wann?', dateInput),
    field('Notiz', noteInput),
    ...(bothRow ? [bothRow] : []),
    el('div', { class: 'card preview-card' }, el('span', { class: 'muted' }, 'Das gibt'), preview),
    submit,
  );

  update();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pts = currentPoints();
    if (pts <= 0) {
      toast('Bitte eine gültige Dauer eingeben.', 'error');
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Speichern …';
    try {
      const created = await addActivity({
        activity_type_id: sel.typeId,
        activity_date: sel.date,
        duration_minutes: sel.duration,
        points: pts,
        note: sel.note.trim(),
        forBoth,
      });
      toast(
        forBoth && created > 1
          ? `Für beide eingetragen! +${formatPoints(pts)} 🔥`
          : `Stark! +${formatPoints(pts)} Punkte 🔥`,
        'success',
      );
      ctx.navigate('dashboard');
    } catch (err) {
      console.error(err);
      toast('Speichern fehlgeschlagen.', 'error');
      submit.disabled = false;
      update();
    }
  });

  return form;
}

function field(labelText, control) {
  return el('label', { class: 'field' }, el('span', { class: 'field-label' }, labelText), control);
}
