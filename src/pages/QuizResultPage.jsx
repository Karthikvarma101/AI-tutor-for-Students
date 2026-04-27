import React from 'react';

const GRADE = (s) => s >= 90 ? { grade: 'A+', emoji: '🏆', msg: 'Outstanding! You nailed it!' }
  : s >= 80 ? { grade: 'A',  emoji: '🌟', msg: 'Excellent work! Keep it up!' }
  : s >= 70 ? { grade: 'B+', emoji: '😊', msg: 'Good job! A bit more practice and you\'ll ace it.' }
  : s >= 60 ? { grade: 'B',  emoji: '👍', msg: 'Not bad! Review the wrong answers and try again.' }
  : s >= 50 ? { grade: 'C',  emoji: '📚', msg: 'Keep studying! You\'ll improve with practice.' }
  :           { grade: 'D',  emoji: '💪', msg: 'Don\'t give up! Review the material and try again.' };

export default function QuizResultPage({ result, quiz, onBack }) {
  const { score, correctCount, questions, userAnswers } = result;
  const total    = questions.length;
  const wrong    = total - correctCount;
  const g        = GRADE(score);
  const ringColor = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="quiz-result-page">
      {/* Score Card */}
      <div className="result-card">
        <div className="result-grade-emoji">{g.emoji}</div>
        <div className="result-score-ring" style={{ '--ring-color': ringColor }}>
          <div className="ring-inner">
            <div className="ring-grade">{g.grade}</div>
            <div className="ring-pct">{score}%</div>
          </div>
        </div>
        <h2 className="result-title">Quiz Complete!</h2>
        <p className="result-message">{g.msg}</p>

        <div className="result-stats">
          <div className="stat-chip green">✅ {correctCount} Correct</div>
          <div className="stat-chip red">❌ {wrong} Wrong</div>
          <div className="stat-chip blue">📊 {total} Total</div>
        </div>
      </div>

      {/* Per-Question Breakdown */}
      <div className="breakdown-section">
        <h3 className="breakdown-title">Question Review</h3>
        {questions.map((q, i) => {
          const userAns = userAnswers[i] ?? -1;
          const isCorrect = userAns === q.correct;
          return (
            <div key={i} className={`breakdown-item ${isCorrect ? 'correct-item' : 'wrong-item'}`}>
              <div className="breakdown-num">{isCorrect ? '✅' : '❌'} Q{i + 1}</div>
              <div className="breakdown-content">
                <p className="breakdown-q">{q.question}</p>
                {!isCorrect && userAns >= 0 && (
                  <p className="breakdown-yours">You answered: <span className="wrong-ans">{q.options[userAns]}</span></p>
                )}
                <p className="breakdown-correct">Correct: <span className="right-ans">{q.options[q.correct]}</span></p>
                {q.explanation && <p className="breakdown-exp">💡 {q.explanation}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="result-actions">
        <button className="btn-primary-full" onClick={onBack}>← Back to Quizzes</button>
      </div>
    </div>
  );
}
