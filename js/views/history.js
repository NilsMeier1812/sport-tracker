// views/history.js – Verlauf aller Aktivitaeten, gruppiert nach Tag.
import { el, clear, toast, confirmDialog, openModal } from '../ui.js';
import { calcPoints, formatPoints } from '../points.js';
import { relativeDay, formatDuration } from '../format.js';
import { isoToday } from '../streak.js';
import {
  state,
  players,
  profileById,
  activeTypes,
  updateActivity,
  deleteActivity,
} from '../store.js';

export function historyView() {
  const [me, partner] = players();
  let filter = 'all'; // 'all' | userId

  const list = el('div', { class: 'history-list' });

  const filters = el('div', { class: 'filter-row' });
  const addFilter = (key, label, color) => {
    const btn = el(
      'button',
      {
        class: 'pill' + (filter === key ? ' active' : ''),
        dataset: { key },
        style: color ? { '--p-color': color } : null,
        onClick: () => {
          filter = key;
          filters.querySelectorAll('.pill').forEach((p) => p.classList.toggle('active', p.dataset.key === key));
          renderList();
        },
      },
      label,
    );
    filters.appendChild(btn);
  };
  addFilter('all', 'Alle');
  if (me) addFilter(me.id, me.display_name, me.color);
  if (partner) addFilter(partner.id, partner.display_name, partner.color);

  function renderList() {
    clear(list);
    const items = state.activities.filter((a) => filter === 'all' || a.user_id === filter);
    if (items.length === 0) {
      list.appendChild(el('p', { class: 'muted pad' }, 'Keine Einträge.'));
      return;
    }
    let currentDate = null;
    for (const act of items) {
      if (act.activity_date !== currentDate) {
        currentDate = act.activity_date;
        list.appendChild(el('h3', { class: 'day-head' }, relativeDay(currentDate)));
      }
      list.appendChild(historyItem(act, renderList));
    }
  }

  renderList();

  return el('section', { class: 'view view-history' }, filters, list);
}

function historyItem(act, refresh) {
  const p = profileById(act.user_id);
  const type = act.activity_type;
  const mine = state.user && act.user_id === state.user.id;

  const actions = mine
    ? el(
        'div',
        { class: 'item-actions' },
        el('button', { class: 'icon-btn sm', title: 'Bearbeiten', onClick: () => openEdit(act, refresh) }, '✏️'),
        el(
          'button',
          {
            class: 'icon-btn sm',
            title: 'Löschen',
            onClick: async () => {
              const ok = await confirmDialog({
                title: 'Eintrag löschen?',
                message: 'Das kann nicht rückgängig gemacht werden.',
                confirmText: 'Löschen',
                danger: true,
              });
              if (!ok) return;
              try {
                await deleteActivity(act.id);
                toast('Gelöscht', 'success', 1500);
              } catch {
                toast('Löschen fehlgeschlagen', 'error');
              }
            },
          },
          '🗑️',
        ),
      )
    : null;

  return el(
    'div',
    { class: 'history-item', style: { '--p-color': (p && p.color) || '#6c5ce7' } },
    el('span', { class: 'hi-avatar' }, (type && type.emoji) || '🏅'),
    el(
      'div',
      { class: 'hi-main' },
      el(
        'div',
        { class: 'hi-line' },
        el('strong', {}, (type && type.name) || 'Aktivität'),
        el('span', { class: 'hi-who muted' }, ' · ' + ((p && p.display_name) || 'Spieler')),
      ),
      el(
        'div',
        { class: 'hi-sub muted' },
        formatDuration(act.duration_minutes) + (act.note ? ' · ' + act.note : ''),
      ),
    ),
    el('span', { class: 'hi-points' }, '+' + formatPoints(act.points)),
    actions,
  );
}

function openEdit(act, refresh) {
  openModal(
    (close) => {
      const types = activeTypes();
      // Falls der urspruengliche Typ deaktiviert wurde, trotzdem anbieten.
      if (act.activity_type && !types.some((t) => t.id === act.activity_type.id)) {
        types.unshift(act.activity_type);
      }
      const sel = {
        typeId: act.activity_type_id || (types[0] && types[0].id),
        duration: act.duration_minutes,
        date: act.activity_date,
        note: act.note || '',
      };

      const typeSelect = el(
        'select',
        { class: 'input' },
        ...types.map((t) =>
          el('option', { value: t.id, selected: t.id === sel.typeId ? '' : null }, `${t.emoji || '🏅'} ${t.name}`),
        ),
      );
      typeSelect.addEventListener('change', () => {
        sel.typeId = typeSelect.value;
        updatePreview();
      });

      const durationInput = el('input', { class: 'input', type: 'number', min: '1', max: '600', value: String(sel.duration) });
      durationInput.addEventListener('input', () => {
        sel.duration = parseInt(durationInput.value, 10) || 0;
        updatePreview();
      });

      const dateInput = el('input', { class: 'input', type: 'date', value: sel.date, max: isoToday() });
      dateInput.addEventListener('input', () => {
        sel.date = dateInput.value || sel.date;
      });

      const noteInput = el('textarea', { class: 'input', rows: '2', placeholder: 'Notiz (optional)' }, sel.note);
      noteInput.addEventListener('input', () => {
        sel.note = noteInput.value;
      });

      const preview = el('span', { class: 'muted' });
      function typeFactor() {
        const t = types.find((x) => x.id === sel.typeId);
        return t ? t.points_per_minute : 0;
      }
      function updatePreview() {
        preview.textContent = `= ${formatPoints(calcPoints(sel.duration, typeFactor()))} Punkte`;
      }
      updatePreview();

      const save = el('button', { class: 'btn btn-primary btn-block', type: 'button' }, 'Speichern');
      save.addEventListener('click', async () => {
        const pts = calcPoints(sel.duration, typeFactor());
        if (pts <= 0) {
          toast('Bitte gültige Dauer eingeben.', 'error');
          return;
        }
        save.disabled = true;
        try {
          await updateActivity(act.id, {
            activity_type_id: sel.typeId,
            duration_minutes: sel.duration,
            activity_date: sel.date,
            note: sel.note.trim() || null,
            points: pts,
          });
          toast('Aktualisiert', 'success', 1500);
          close();
          if (refresh) refresh();
        } catch {
          toast('Speichern fehlgeschlagen', 'error');
          save.disabled = false;
        }
      });

      return el(
        'div',
        { class: 'edit-form' },
        labeled('Sportart', typeSelect),
        labeled('Dauer (Minuten)', durationInput),
        labeled('Datum', dateInput),
        labeled('Notiz', noteInput),
        el('div', { class: 'preview-line' }, preview),
        save,
      );
    },
    { title: 'Eintrag bearbeiten' },
  );
}

function labeled(text, control) {
  return el('label', { class: 'field' }, el('span', { class: 'field-label' }, text), control);
}
