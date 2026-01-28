const EVT = 'announcements:unread';

function keyForUser(userKey) {
  return `announcements:unread:${String(userKey || 'anon')}`;
}

export function getAnnouncementsUnread(userKey) {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(keyForUser(userKey));
    const n = Number(raw || 0);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function setAnnouncementsUnread(userKey, count) {
  if (typeof window === 'undefined') return;
  const next = Math.max(0, Number(count || 0));
  try {
    window.localStorage.setItem(keyForUser(userKey), String(next));
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new CustomEvent(EVT, { detail: { userKey, count: next } }));
  } catch {
    // ignore
  }
}

export function incrementAnnouncementsUnread(userKey, delta = 1) {
  const cur = getAnnouncementsUnread(userKey);
  setAnnouncementsUnread(userKey, cur + Number(delta || 1));
}

export function clearAnnouncementsUnread(userKey) {
  setAnnouncementsUnread(userKey, 0);
}

export function subscribeAnnouncementsUnread(callback) {
  if (typeof window === 'undefined') return () => {};

  const onCustom = () => callback();
  const onStorage = (e) => {
    if (!e?.key) return;
    if (String(e.key).startsWith('announcements:unread:')) callback();
  };

  window.addEventListener(EVT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
