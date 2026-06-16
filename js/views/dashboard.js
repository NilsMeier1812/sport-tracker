// views/dashboard.js – Head-to-Head Uebersicht der beiden Spieler.
import { el } from '../ui.js';
import { formatPoints } from '../points.js';
import { relativeDay, formatDuration } from '../format.js';
import {
  state,
  players,
  pointsTotal,
  pointsThisWeek,
  streakOf,
  profileById,
} from '../store.js';

export function dashboardView(ctx) {
  const [a, b] = players();
  const container = el('section', { class: 'view view-dashboard' });

  // --- VS-Duell -------------------------------------------------------
  const totalA = a ? pointsTotal(a.id) : 0;
  const totalB = b ? pointsTotal(b.id) : 0;
  const leaderId = !a || !b || totalA === totalB ? null : totalA > totalB ? a.id : b.id;

  container.appendChild(
    el(
      'div',
      { class: 'versus' },
      playerCard(a, { total: totalA, leader: leaderId === (a && a.id) }),
      el('div', { class: 'vs-badge' }, 'VS'),
      playerCard(b, { total: totalB, leader: leaderId === (b && b.id) }),
    ),
  );

  // --- Punkte-Balken --------------------------------------------------
  container.appendChild(standingsBar(a, b, totalA, totalB));

  // --- Diese Woche ----------------------------------------------------
  if (a && b) {
    container.appendChild(
      el(
        'div',
        { class: 'card week-card' },
        el('h2', { class: 'card-title' }, '📅 Diese Woche'),
        el(
          'div',
          { class: 'week-grid' },
          weekStat(a, pointsThisWeek(a.id)),
          weekStat(b, pointsThisWeek(b.id)),
        ),
      ),
    );
  }

  // --- Streak-Status --------------------------------------------------
  if (a) container.appendChild(streakDetail(a));
  if (b) container.appendChild(streakDetail(b));

  // --- CTA ------------------------------------------------------------
  container.appendChild(
    el(
      'button',
      { class: 'btn btn-primary btn-block btn-cta', onClick: () => ctx.navigate('log') },
      '➕  Aktivität eintragen',
    ),
  );

  // --- Letzte Aktivitaeten -------------------------------------------
  container.appendChild(recentFeed(ctx));

  return container;
}

function playerCard(profile, { total, leader }) {
  if (!profile) {
    return el(
      'div',
      { class: 'player-card empty' },
      el('div', { class: 'avatar', style: { background: '#2a2c44' } }, '➕'),
      el('div', { class: 'player-name' }, 'Frei'),
      el('div', { class: 'player-sub muted' }, 'Wartet auf zweite Person'),
    );
  }
  const streak = streakOf(profile.id);
  const color = profile.color || '#6c5ce7';
  return el(
    'div',
    { class: `player-card${leader ? ' leader' : ''}`, style: { '--p-color': color } },
    leader ? el('div', { class: 'crown' }, '👑') : null,
    el('div', { class: 'avatar', style: { background: color } }, profile.emoji || '🦊'),
    el('div', { class: 'player-name' }, profile.display_name || 'Spieler'),
    el(
      'div',
      { class: 'player-points' },
      el('span', { class: 'pp-num' }, formatPoints(total)),
      el('span', { class: 'pp-unit' }, 'Punkte'),
    ),
    el(
      'div',
      { class: `streak-chip s-${streak.status}` },
      el('span', { class: 'fire' }, '🔥'),
      el('span', {}, String(streak.current)),
    ),
  );
}

function standingsBar(a, b, totalA, totalB) {
  const sum = totalA + totalB;
  const pctA = sum > 0 ? Math.round((totalA / sum) * 100) : 50;
  const colorA = (a && a.color) || '#6c5ce7';
  const colorB = (b && b.color) || '#e84393';
  const bar = el(
    'div',
    { class: 'bar' },
    el('div', { class: 'bar-fill', style: { width: pctA + '%', background: colorA } }),
    el('div', { class: 'bar-fill-b', style: { background: colorB } }),
  );
  let label;
  if (!a || !b) label = 'Sobald beide dabei sind, geht das Duell los.';
  else if (totalA === totalB) label = sum === 0 ? 'Noch keine Punkte – los geht’s!' : 'Gleichstand!';
  else {
    const leader = totalA > totalB ? a : b;
    const diff = Math.abs(totalA - totalB);
    label = `${leader.display_name} führt mit ${formatPoints(diff)} Punkten`;
  }
  return el('div', { class: 'card standings' }, bar, el('div', { class: 'standings-label' }, label));
}

function weekStat(profile, pts) {
  return el(
    'div',
    { class: 'week-stat', style: { '--p-color': profile.color || '#6c5ce7' } },
    el('span', { class: 'ws-emoji' }, profile.emoji || '🦊'),
    el('span', { class: 'ws-num' }, formatPoints(pts)),
    el('span', { class: 'ws-name muted' }, profile.display_name),
  );
}

function streakDetail(profile) {
  const s = streakOf(profile.id);
  const map = {
    today: { cls: 'ok', text: `🔥 ${s.current} Tage – heute schon erledigt!` },
    safe: { cls: 'ok', text: `🔥 ${s.current} Tage – heute noch dranbleiben` },
    risk: { cls: 'warn', text: `🔥 ${s.current} Tage – heute trainieren, sonst reißt sie!` },
    broken: { cls: 'bad', text: '💤 Streak gerissen – heute neu starten' },
    none: { cls: 'bad', text: '✨ Noch keine Streak – heute starten!' },
  };
  const info = map[s.status] || map.none;
  return el(
    'div',
    { class: `card streak-row ${info.cls}`, style: { '--p-color': profile.color || '#6c5ce7' } },
    el('span', { class: 'sr-emoji' }, profile.emoji || '🦊'),
    el(
      'div',
      { class: 'sr-text' },
      el('div', { class: 'sr-name' }, profile.display_name),
      el('div', { class: 'sr-status muted' }, info.text),
    ),
    el('div', { class: 'sr-best muted' }, `Rekord: ${s.longest}`),
  );
}

function recentFeed(ctx) {
  const recent = state.activities.slice(0, 8);
  const card = el('div', { class: 'card' }, el('h2', { class: 'card-title' }, '🕑 Zuletzt'));
  if (recent.length === 0) {
    card.appendChild(el('p', { class: 'muted' }, 'Noch nichts eingetragen.'));
    return card;
  }
  const list = el('ul', { class: 'feed' });
  for (const act of recent) {
    const p = profileById(act.user_id);
    const type = act.activity_type;
    list.appendChild(
      el(
        'li',
        { class: 'feed-item' },
        el(
          'span',
          { class: 'feed-avatar', style: { background: (p && p.color) || '#2a2c44' } },
          (type && type.emoji) || '🏅',
        ),
        el(
          'div',
          { class: 'feed-main' },
          el(
            'div',
            { class: 'feed-line' },
            el('strong', {}, (p && p.display_name) || 'Spieler'),
            ' · ',
            (type && type.name) || 'Aktivität',
          ),
          el(
            'div',
            { class: 'feed-sub muted' },
            `${formatDuration(act.duration_minutes)} · ${relativeDay(act.activity_date)}`,
          ),
        ),
        el('span', { class: 'feed-points' }, '+' + formatPoints(act.points)),
      ),
    );
  }
  card.appendChild(list);
  card.appendChild(
    el('button', { class: 'link-btn block', onClick: () => ctx.navigate('history') }, 'Ganzen Verlauf ansehen →'),
  );
  return card;
}
