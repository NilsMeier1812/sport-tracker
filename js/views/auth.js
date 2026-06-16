// views/auth.js – Login / Registrierung (E-Mail + Passwort).
import { el, toast } from '../ui.js';
import { signIn, signUp } from '../auth.js';
import { APP_TITLE } from '../config.js';

export function renderAuth() {
  let mode = 'login'; // 'login' | 'register'

  const email = el('input', {
    class: 'input',
    type: 'email',
    autocomplete: 'email',
    placeholder: 'du@beispiel.de',
    required: true,
  });
  const password = el('input', {
    class: 'input',
    type: 'password',
    autocomplete: 'current-password',
    placeholder: 'Passwort',
    minlength: '6',
    required: true,
  });

  const submitBtn = el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Anmelden');
  const toggleLink = el('button', { class: 'link-btn', type: 'button' });
  const toggleText = el('p', { class: 'muted center small' });
  const title = el('h1', { class: 'auth-title' });
  const subtitle = el('p', { class: 'muted center' }, 'Euer Sport-Wettbewerb – nur für euch zwei. 💪');

  function applyMode() {
    const isLogin = mode === 'login';
    title.textContent = isLogin ? 'Willkommen zurück' : 'Konto erstellen';
    submitBtn.textContent = isLogin ? 'Anmelden' : 'Registrieren';
    password.setAttribute('autocomplete', isLogin ? 'current-password' : 'new-password');
    toggleText.textContent = isLogin ? 'Noch kein Konto?' : 'Schon registriert?';
    toggleLink.textContent = isLogin ? 'Jetzt registrieren' : 'Hier anmelden';
  }

  toggleLink.addEventListener('click', () => {
    mode = mode === 'login' ? 'register' : 'login';
    applyMode();
  });

  const form = el(
    'form',
    { class: 'auth-form' },
    el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'E-Mail'), email),
    el('label', { class: 'field' }, el('span', { class: 'field-label' }, 'Passwort'), password),
    submitBtn,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mail = email.value.trim();
    const pass = password.value;
    if (!mail || pass.length < 6) {
      toast('Bitte E-Mail und ein Passwort (min. 6 Zeichen) eingeben.', 'error');
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Bitte warten …';
    try {
      if (mode === 'login') {
        await signIn(mail, pass);
        // Weiterleitung uebernimmt der Auth-Listener in main.js.
      } else {
        const data = await signUp(mail, pass);
        if (!data.session) {
          toast('Fast geschafft! Bestätige den Link in deiner E-Mail und melde dich dann an.', 'info', 6000);
          mode = 'login';
          applyMode();
        }
      }
    } catch (err) {
      console.error(err);
      toast(translateAuthError(err), 'error', 5000);
    } finally {
      submitBtn.disabled = false;
      applyMode();
    }
  });

  applyMode();

  return el(
    'div',
    { class: 'screen auth-screen' },
    el(
      'div',
      { class: 'auth-card' },
      el('div', { class: 'auth-logo' }, '🏆'),
      el('div', { class: 'auth-brand' }, APP_TITLE),
      title,
      subtitle,
      form,
      el('div', { class: 'auth-toggle' }, toggleText, toggleLink),
    ),
  );
}

function translateAuthError(err) {
  const msg = String((err && err.message) || err).toLowerCase();
  if (msg.includes('invalid login')) return 'E-Mail oder Passwort stimmt nicht.';
  if (msg.includes('already registered') || msg.includes('already been registered'))
    return 'Diese E-Mail ist bereits registriert. Melde dich an.';
  if (msg.includes('email not confirmed')) return 'Bitte bestätige zuerst den Link in deiner E-Mail.';
  if (msg.includes('signups not allowed') || msg.includes('signup is disabled'))
    return 'Registrierung ist deaktiviert. Frag deinen Mitspieler / aktiviere Signups in Supabase.';
  if (msg.includes('rate limit')) return 'Zu viele Versuche – kurz warten und erneut probieren.';
  return 'Hat nicht geklappt: ' + ((err && err.message) || 'Unbekannter Fehler');
}
