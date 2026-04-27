export const KEYS = {
  USERS:        'edubot_users',
  CURRENT_USER: 'edubot_current_user',
  QUIZZES:      'edubot_quizzes',
  CHATS:        'edubot_chats',
  ANALYTICS:    'edubot_analytics',
};

export const storage = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },
};
