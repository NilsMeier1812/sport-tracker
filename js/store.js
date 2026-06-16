// store.js – zentraler Zustand + Datenzugriff auf Supabase.
import { supabase } from './supabaseClient.js';
import { computeStreak } from './streak.js';
import { isThisWeek } from './format.js';

export const state = {
  user: null, // Supabase Auth User (von main.js gesetzt)
  me: null, // eigenes Profil
  profiles: [],
  types: [],
  activities: [],
};

const listeners = new Set();
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  for (const fn of listeners) fn();
}

function check(error, msg) {
  if (error) {
    console.error(msg, error);
    throw new Error(error.message || msg);
  }
}

// ------------------------------ Laden --------------------------------
export async function loadAll() {
  const [profilesRes, typesRes, activitiesRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: true }),
    supabase.from('activity_types').select('*').order('sort_order', { ascending: true }),
    supabase
      .from('activities')
      .select('*, activity_type:activity_types(id,name,emoji,points_per_minute)')
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);
  check(profilesRes.error, 'Profile laden fehlgeschlagen');
  check(typesRes.error, 'Sportarten laden fehlgeschlagen');
  check(activitiesRes.error, 'Aktivitaeten laden fehlgeschlagen');

  state.profiles = profilesRes.data || [];
  state.types = typesRes.data || [];
  state.activities = activitiesRes.data || [];
  if (state.user) state.me = state.profiles.find((p) => p.id === state.user.id) || null;
  emit();
}

/** Stellt sicher, dass fuer den eingeloggten User ein Profil existiert. */
export async function ensureMyProfile() {
  if (!state.user) return;
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', state.user.id)
    .maybeSingle();
  check(error, 'Profil pruefen fehlgeschlagen');
  if (!data) {
    const fallbackName = (state.user.email || 'Spieler').split('@')[0];
    const { error: insErr } = await supabase
      .from('profiles')
      .insert({ id: state.user.id, display_name: fallbackName });
    check(insErr, 'Profil anlegen fehlgeschlagen');
  }
}

// ---------------------------- Mutationen -----------------------------
export async function saveMyProfile({ display_name, emoji, color }) {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name, emoji, color })
    .eq('id', state.user.id);
  check(error, 'Profil speichern fehlgeschlagen');
  await loadAll();
}

export async function addActivity({ activity_type_id, activity_date, duration_minutes, points, note }) {
  const { error } = await supabase.from('activities').insert({
    user_id: state.user.id,
    activity_type_id,
    activity_date,
    duration_minutes,
    points,
    note: note || null,
  });
  check(error, 'Eintrag speichern fehlgeschlagen');
  await loadAll();
}

export async function updateActivity(id, patch) {
  const { error } = await supabase.from('activities').update(patch).eq('id', id);
  check(error, 'Eintrag aendern fehlgeschlagen');
  await loadAll();
}

export async function deleteActivity(id) {
  const { error } = await supabase.from('activities').delete().eq('id', id);
  check(error, 'Eintrag loeschen fehlgeschlagen');
  await loadAll();
}

export async function addType({ name, emoji, points_per_minute }) {
  const maxSort = state.types.reduce((m, t) => Math.max(m, t.sort_order || 0), 0);
  const { error } = await supabase
    .from('activity_types')
    .insert({ name, emoji, points_per_minute, sort_order: maxSort + 10 });
  check(error, 'Sportart anlegen fehlgeschlagen');
  await loadAll();
}

export async function updateType(id, patch) {
  const { error } = await supabase.from('activity_types').update(patch).eq('id', id);
  check(error, 'Sportart aendern fehlgeschlagen');
  await loadAll();
}

// ----------------------------- Selektoren ----------------------------
export function activitiesOf(userId) {
  return state.activities.filter((a) => a.user_id === userId);
}

export function pointsTotal(userId) {
  return activitiesOf(userId).reduce((sum, a) => sum + Number(a.points || 0), 0);
}

export function pointsThisWeek(userId, now = new Date()) {
  return activitiesOf(userId)
    .filter((a) => isThisWeek(a.activity_date, now))
    .reduce((sum, a) => sum + Number(a.points || 0), 0);
}

export function activeDatesOf(userId) {
  return activitiesOf(userId).map((a) => a.activity_date);
}

export function streakOf(userId) {
  return computeStreak(activeDatesOf(userId));
}

export function activeTypes() {
  return state.types.filter((t) => t.is_active);
}

export function profileById(id) {
  return state.profiles.find((p) => p.id === id) || null;
}

/** Die beiden "Spieler" – ich zuerst, dann die andere Person. */
export function players() {
  const me = state.me;
  const others = state.profiles.filter((p) => !me || p.id !== me.id);
  return me ? [me, others[0] || null] : [state.profiles[0] || null, state.profiles[1] || null];
}
