import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { sendMessage, detectSubject, generateQuizQuestions } from '../services/aiService';
import { scheduleQuizNotification, requestPermission } from '../services/notificationService';
import { SUBJECTS } from '../data/subjects';

function TypingIndicator() {
  return (
    <div className="chat-msg">
      <div className="chat-avatar bot-av">🤖</div>
      <div className="chat-bubble bot-bubble">
        <div className="typing-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
}

const STARTER_QUESTIONS = [
  'Explain photosynthesis step by step',
  "What are Newton's laws of motion?",
  'How do I solve quadratic equations?',
  'Explain DNA and RNA with examples',
  'What is the difference between AC and DC current?',
  'Explain binary search algorithm',
];

export default function AITutorPage() {
  const { currentUser } = useAuth();
  const { saveChat, getChatsForUser, addQuiz } = useAppData();
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState('');
  const [isTyping,       setIsTyping]       = useState(false);
  const [detectedSubject, setDetectedSubject] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load chat history — with timeout so Firestore never hangs forever
  useEffect(() => {
    if (!currentUser) { setLoadingHistory(false); return; }
    requestPermission();
    const timer = setTimeout(() => setLoadingHistory(false), 3000); // safety timeout
    (async () => {
      try {
        const history = await getChatsForUser(currentUser.id, 'general');
        setMessages(Array.isArray(history) ? history : []);
      } catch { setMessages([]); }
      finally { clearTimeout(timer); setLoadingHistory(false); }
    })();
    return () => clearTimeout(timer);
  }, [currentUser?.id]);


  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;
    const userText = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg = { role: 'user', content: userText, id: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsTyping(true);

    const subject = detectSubject(userText);
    setDetectedSubject(subject);

    try {
      const response = await sendMessage(messages, userText);

      const botMsg = { role: 'bot', content: response, id: Date.now() + 1, subject };
      const finalMessages = [...updatedMessages, botMsg];
      setMessages(finalMessages);

      // Persist chat
      await saveChat(currentUser.id, 'general', [userMsg]);
      await saveChat(currentUser.id, 'general', [botMsg]);
      if (subject !== 'general') {
        await saveChat(currentUser.id, subject, [userMsg]);
        await saveChat(currentUser.id, subject, [botMsg]);
      }

      // Generate quiz in background
      (async () => {
        try {
          const questions = await generateQuizQuestions(userText, subject);
          if (questions?.length > 0) {
            const quiz = {
              id: `quiz_${Date.now()}`,
              title: userText.length > 60 ? userText.substring(0, 57) + '...' : userText,
              subject: subject === 'general' ? 'general' : subject,
              questions,
              difficulty: 'mixed',
              status: 'pending',
              createdAt: new Date().toISOString(),
              userId: currentUser.id,
              source: 'ai-tutor',
            };
            await addQuiz(quiz);
          }
        } catch (err) { console.warn('Quiz gen failed:', err.message); }
      })();

      // Schedule notification
      scheduleQuizNotification(userText.substring(0, 50), subject, () => {});

    } catch (err) {
      const errMsg = { role: 'bot', content: err.message || '⚠️ Something went wrong. Please try again!', id: Date.now() + 2, isError: true };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [input, messages, isTyping, currentUser, saveChat, addQuiz]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const msg = {
      role: 'user',
      content: `📎 I have uploaded a file: **${file.name}**\n\nPlease help me understand its content and explain any important concepts or topics from it.`,
      id: Date.now(),
    };
    setMessages(prev => [...prev, msg]);
    saveChat(currentUser.id, 'general', [msg]);
    e.target.value = '';
    // Auto-send to AI
    setTimeout(() => { setInput(msg.content); }, 50);
  };

  const subjectInfo   = SUBJECTS.find(s => s.id === detectedSubject);
  const geminiKey     = import.meta.env.VITE_GEMINI_API_KEY || '';
  const hasGeminiKey  = geminiKey.startsWith('AIza');

  return (
    <div className="tutor-page">
      {/* Header */}
      <div className="tutor-header">
        <div className="tutor-header-left">
          <div className="tutor-avatar">🤖</div>
          <div>
            <div className="tutor-name">EduBot AI Tutor</div>
            <div className={`tutor-status ${hasGeminiKey ? 'online' : 'demo'}`}>
              <span className="status-dot" />
              {hasGeminiKey ? 'Gemini AI Connected ✨' : 'Demo Mode — Add VITE_GEMINI_API_KEY'}
            </div>
          </div>
        </div>
        {detectedSubject && detectedSubject !== 'general' && subjectInfo && (
          <div className="subject-detected-chip"
            style={{ background: subjectInfo.color + '22', borderColor: subjectInfo.color + '44', color: subjectInfo.color }}>
            {subjectInfo.icon} {subjectInfo.label}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {loadingHistory ? (
          <div className="chat-loading">
            <div className="spinner-lg" />
            <p>Loading conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="welcome-icon">🤖</div>
            <h3>Hi! I'm EduBot 👋</h3>
            <p>I'm powered by <strong>Gemini AI</strong>. Ask me anything about your subjects — I explain concepts clearly, step by step!</p>
            <div className="starter-chips">
              {STARTER_QUESTIONS.map(q => (
                <button key={q} className="starter-chip" onClick={() => setInput(q)}>{q}</button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={msg.id || idx} className={`chat-msg ${msg.role === 'user' ? 'user-msg' : ''}`}>
              <div className={`chat-avatar ${msg.role === 'user' ? 'user-av' : 'bot-av'}`}>
                {msg.role === 'user' ? (currentUser?.name?.[0]?.toUpperCase() || '👤') : '🤖'}
              </div>
              <div className={`chat-bubble ${msg.role === 'user' ? 'user-bubble' : msg.isError ? 'error-bubble' : 'bot-bubble'}`}>
                {msg.role === 'bot'
                  ? <ReactMarkdown>{msg.content}</ReactMarkdown>
                  : msg.content
                }
                {msg.subject && msg.subject !== 'general' && !msg.isError && (
                  <div className="msg-subject-tag">
                    {SUBJECTS.find(s => s.id === msg.subject)?.icon} {msg.subject}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="chat-input-box">
          <textarea
            ref={textareaRef}
            id="chat-input"
            className="chat-textarea"
            placeholder="Ask any question about your subjects... (Shift+Enter for new line)"
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <div className="chat-actions">
            <input ref={fileInputRef} type="file" id="file-upload" style={{ display: 'none' }}
              onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.txt" />
            <button className="action-btn" title="Upload image"
              onClick={() => { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click(); }}>🖼️</button>
            <button className="action-btn" title="Upload file"
              onClick={() => { fileInputRef.current.accept = '.pdf,.doc,.docx,.txt'; fileInputRef.current.click(); }}>📎</button>
            <button id="send-btn" className="send-btn" onClick={handleSend} disabled={!input.trim() || isTyping}>
              {isTyping ? <span className="spinner-sm" /> : '➤'}
            </button>
          </div>
        </div>
        <p className="chat-footer-note">EduBot may make mistakes. Always verify with your textbook.</p>
      </div>
    </div>
  );
}
