export function requestPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

export function scheduleQuizNotification(topic, subject, callback) {
  const delay = 10 * 60 * 1000; // 10 minutes
  setTimeout(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('📝 Quiz Ready!', {
        body: `Your quiz on "${topic}" (${subject}) is ready and waiting for your participation!`,
        icon: '/vite.svg',
        tag: `quiz-${Date.now()}`,
      });
    }
    if (typeof callback === 'function') callback();
  }, delay);
}
