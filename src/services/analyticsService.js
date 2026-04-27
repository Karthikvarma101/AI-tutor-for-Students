export function getOverallProgress(analytics) {
  if (!analytics || !analytics.totalAnswered) return 0;
  return Math.round((analytics.totalCorrect / analytics.totalAnswered) * 100);
}

export function getSubjectStrength(analytics) {
  if (!analytics?.subjects) return [];
  return Object.entries(analytics.subjects)
    .map(([subject, data]) => ({
      subject,
      accuracy: data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0,
      quizzes: data.quizzes || 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);
}

export function getRecommendations(analytics) {
  const strengths = getSubjectStrength(analytics);
  if (strengths.length === 0) return [
    '📚 Start your learning journey! Ask the AI Tutor a question to generate your first quiz.',
    '🎯 Complete daily quizzes to build consistent learning habits.',
    '💡 Try subjects like **Mathematics**, **Physics**, or **Chemistry** to get started.',
  ];

  const recs = [];
  const weak = strengths.filter(s => s.accuracy < 60);
  const strong = strengths.filter(s => s.accuracy >= 80);

  if (weak.length > 0) {
    recs.push(`📉 You need practice in **${weak.map(s => s.subject).join(', ')}** — your accuracy is below 60%. Focus here!`);
  }
  if (strong.length > 0) {
    recs.push(`🌟 Excellent performance in **${strong.map(s => s.subject).join(', ')}**! Keep it up and push to advanced topics.`);
  }
  if (analytics.totalQuizzes >= 5) {
    recs.push(`🚀 You've completed **${analytics.totalQuizzes} quizzes**! Great consistency — aim for daily practice.`);
  }
  if (recs.length === 0) {
    recs.push('📊 Take more quizzes to unlock detailed analytics and personalized recommendations!');
  }
  return recs;
}
