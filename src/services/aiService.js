import { SUBJECT_KEYWORDS } from '../data/subjects';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// Models tried in order — gemini-flash-latest & gemini-pro-latest are stable aliases
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash-lite',
  'gemini-pro-latest',
  'gemini-1.5-pro',
];

const SYSTEM_PROMPT = `You are EduBot, a friendly and expert AI tutor for students. You help with Mathematics, Physics, Chemistry, Biology, Computer Science, English, History, and Geography.

Your response style:
- Always begin your response with: "Dear student,"
- Explain concepts clearly with examples, analogies, and step-by-step reasoning
- Use markdown formatting: **bold** for key terms, bullet points, numbered lists, \`code\` for formulas/code
- For math/science: include worked examples and equations
- For definitions: give clear explanations with real-world examples
- Keep an encouraging, supportive, and friendly tone throughout
- If a student is struggling, offer to explain differently
- Always end your response with: "I hope you understand. If you have more doubts, feel free to ask! 😊"`;

export function detectSubject(text) {
  const lower = text.toLowerCase();
  let bestMatch = null;
  let bestCount = 0;
  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    const count = keywords.filter(kw => lower.includes(kw)).length;
    if (count > bestCount) { bestCount = count; bestMatch = subject; }
  }
  return bestMatch || 'general';
}

async function callGemini(model, apiKey, history, userMessage) {
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
  const contents = [];
  const recentHistory = history.slice(-12);

  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'bot') {
      contents.push({
        role: msg.role === 'bot' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  const finalMessage = contents.length === 0
    ? `${SYSTEM_PROMPT}\n\nStudent question: ${userMessage}`
    : userMessage;
  contents.push({ role: 'user', parts: [{ text: finalMessage }] });

  const body = {
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${data?.error?.message || 'Gemini error'}`);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

export async function sendMessage(conversationHistory, userMessage) {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!geminiKey.startsWith('AIza')) {
    return getMockResponse(userMessage);
  }

  let lastError = null;
  for (const model of GEMINI_MODELS) {
    try {
      const result = await callGemini(model, geminiKey, conversationHistory, userMessage);
      if (result) return result;
    } catch (err) {
      console.warn(`Gemini ${model} failed:`, err.message);
      lastError = err;
      if (err.message.startsWith('400') || err.message.startsWith('401') || err.message.startsWith('403')) break;
    }
  }

  if (lastError) {
    const msg = lastError.message || '';
    if (msg.includes('quota') || msg.startsWith('429'))
      throw new Error('⚠️ Gemini rate limit reached. Please wait a moment and try again.');
    if (msg.startsWith('400') || msg.startsWith('401') || msg.startsWith('403'))
      throw new Error('⚠️ Invalid Gemini API key. Please check your VITE_GEMINI_API_KEY in .env');
    throw new Error(`⚠️ AI error: ${msg}`);
  }
  return getMockResponse(userMessage);
}

export async function generateQuizQuestions(topic, subject) {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  if (!geminiKey.startsWith('AIza')) return getDefaultQuestions(topic, subject);

  const prompt = `Generate exactly 5 multiple choice questions about: "${topic}" suitable for a student studying ${subject}.

Return ONLY a valid JSON array with absolutely no extra text, markdown, or explanation:
[
  {
    "question": "Clear question text ending with ?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Brief one-sentence explanation of the correct answer"
  }
]

Rules:
- correct = 0-based index of the right answer (0, 1, 2, or 3)
- All 4 options must be distinct and plausible
- Mix difficulty: 3 easier questions + 2 harder questions
- Questions should directly relate to the topic: "${topic}"`;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 2000 },
        }),
      });
      const data = await res.json();
      if (!res.ok) continue;
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) continue;
      const questions = JSON.parse(match[0]);
      if (Array.isArray(questions) && questions.length > 0) {
        const valid = questions.every(q =>
          q.question && Array.isArray(q.options) && q.options.length === 4 &&
          typeof q.correct === 'number' && q.correct >= 0 && q.correct <= 3
        );
        if (valid) return questions.slice(0, 5);
      }
    } catch (err) {
      console.warn(`Quiz gen ${model} failed:`, err.message);
    }
  }
  return getDefaultQuestions(topic, subject);
}

function getDefaultQuestions(topic, subject) {
  const t = topic.substring(0, 60);
  return [
    { question: `What is the main idea behind "${t}"?`, options: ['A fundamental principle', 'A recent discovery', 'An optional concept', 'A different subject'], correct: 0, explanation: `"${t}" is a fundamental principle in ${subject}.` },
    { question: `Which field does "${t}" primarily belong to?`, options: [subject, 'History', 'Literature', 'Commerce'], correct: 0, explanation: `"${t}" is a core topic in ${subject}.` },
    { question: `Why is understanding "${t}" important?`, options: ['It helps explain key phenomena', 'It has no practical use', 'It only applies in labs', 'It is extra content'], correct: 0, explanation: `Understanding "${t}" is essential for ${subject} mastery.` },
    { question: `A student who masters "${t}" will be able to:`, options: ['Solve related problems confidently', 'Only memorise facts', 'Skip advanced topics', 'Avoid the subject entirely'], correct: 0, explanation: 'Mastery enables confident problem-solving.' },
    { question: `Which statement about "${t}" is most accurate?`, options: ['It is well-established and applied', 'It is controversial and unproven', 'It applies only to mathematics', 'It was recently introduced'], correct: 0, explanation: `"${t}" is a well-established ${subject} concept.` },
  ];
}

function getMockResponse(question) {
  const lower = question.toLowerCase();
  if (lower.includes('photosynthesis')) {
    return `Dear student,\n\n**Photosynthesis** is the process by which green plants convert sunlight into food.\n\n**Equation:**\n> 6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ + 6O₂\n\n**Two main stages:**\n1. **Light-dependent reactions** (in thylakoids) — absorbs sunlight, splits water, produces ATP and NADPH\n2. **Calvin Cycle** (in stroma) — uses ATP to fix CO₂ into glucose\n\n**Key takeaway:** Plants are nature's solar panels! 🌿\n\nI hope you understand. If you have more doubts, feel free to ask! 😊`;
  }
  if (lower.includes('newton') || (lower.includes('law') && lower.includes('motion'))) {
    return `Dear student,\n\n**Newton's Three Laws of Motion** are the foundation of classical mechanics:\n\n**1st Law — Law of Inertia:**\nAn object at rest stays at rest, and an object in motion stays in motion, unless acted on by a net external force.\n\n**2nd Law — F = ma:**\nThe net force on an object equals its mass times acceleration.\n> Example: Pushing a heavy cart requires more force than pushing a light one.\n\n**3rd Law — Action & Reaction:**\nEvery action has an equal and opposite reaction.\n> Example: A rocket expels gas downward → gas pushes the rocket upward! 🚀\n\nI hope you understand. If you have more doubts, feel free to ask! 😊`;
  }
  return `Dear student,\n\nTo get AI-powered answers, please add your **free Gemini API key** to the \`.env\` file:\n\`\`\`\nVITE_GEMINI_API_KEY=AIzaSy...\n\`\`\`\nGet a free key at: **[aistudio.google.com](https://aistudio.google.com/app/apikey)**\n\nI hope you understand. If you have more doubts, feel free to ask! 😊`;
}
