import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import QuizResultPage from './QuizResultPage';

export default function QuizTakePage({ quiz, onBack }) {
  const { currentUser } = useAuth();
  const { completeQuiz, addQuiz } = useAppData();
  const [currentQ,   setCurrentQ]   = useState(0);
  const [answers,    setAnswers]     = useState({});
  const [selected,   setSelected]    = useState(null);
  const [result,     setResult]      = useState(null);
  const [submitting, setSubmitting]  = useState(false);

  const questions = quiz.questions || [];
  const q         = questions[currentQ];
  const total     = questions.length;
  const progress  = Math.round((currentQ / total) * 100);

  const handleSelect = (idx) => { if (selected !== null) return; setSelected(idx); };

  const handleNext = async () => {
    const updatedAnswers = { ...answers, [currentQ]: selected };
    setAnswers(updatedAnswers);

    if (currentQ < total - 1) {
      setCurrentQ(i => i + 1);
      setSelected(null);
    } else {
      // Submit quiz
      setSubmitting(true);
      try {
        let quizToComplete = quiz;
        // If this is a daily quiz, add it first so it can be completed
        if (quiz.source === 'daily') {
          const dailyQuiz = {
            ...quiz,
            id: `daily_taken_${Date.now()}`,
            userId: currentUser.id,
            status: 'pending',
          };
          await addQuiz(dailyQuiz);
          quizToComplete = dailyQuiz;
        }
        const res = await completeQuiz(quizToComplete.id, updatedAnswers, questions);
        setResult({ ...res, quizTitle: quiz.title });
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (result) {
    return <QuizResultPage result={result} quiz={quiz} onBack={onBack} />;
  }

  return (
    <div className="quiz-take-page">
      {/* Header */}
      <div className="quiz-take-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="quiz-take-title">{quiz.title}</div>
        <div className="q-counter">{currentQ + 1}/{total}</div>
      </div>

      {/* Progress Bar */}
      <div className="q-progress-bar">
        <div className="q-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="q-dots">
        {questions.map((_, i) => (
          <div key={i} className={`q-dot ${i < currentQ ? 'done' : i === currentQ ? 'current' : ''}`} />
        ))}
      </div>

      {/* Question */}
      <div className="question-card animate-in" key={currentQ}>
        <div className="question-num">Question {currentQ + 1} of {total}</div>
        <div className="question-text">{q.question}</div>

        <div className="options-list">
          {q.options.map((opt, i) => {
            let cls = 'option-btn';
            if (selected !== null) {
              if (i === q.correct) cls += ' correct';
              else if (i === selected && selected !== q.correct) cls += ' wrong';
            }
            return (
              <button key={i} className={cls} onClick={() => handleSelect(i)} disabled={selected !== null}>
                <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <div className={`feedback-box ${selected === q.correct ? 'correct-fb' : 'wrong-fb'} animate-in`}>
            {selected === q.correct
              ? '✅ Correct!'
              : `❌ Correct answer: "${q.options[q.correct]}"`}
            {q.explanation && <p className="fb-explanation">{q.explanation}</p>}
          </div>
        )}

        {selected !== null && (
          <button className="btn-primary-full animate-in" onClick={handleNext} disabled={submitting}>
            {submitting
              ? <><span className="spinner-sm" /> Submitting...</>
              : currentQ < total - 1 ? 'Next Question →' : 'See My Results 🎉'
            }
          </button>
        )}
      </div>
    </div>
  );
}
