// Quiz engine: drill mode (one section), mock exam (mixed), weak spots.
import { loadSections, loadAllQuestionBanks, shuffle } from './data.js';
import { recordAnswer, recordAttempt, getQuestionStats } from './db.js';

let state = null;

export async function startQuiz(root, { mode = 'drill', bankId = null }) {
  const sections = await loadSections();
  const banks = await loadAllQuestionBanks();

  let pool = [];
  let title = '';
  let target = 0;
  let pass = 0.8;

  if (mode === 'drill') {
    if (!bankId || !banks[bankId]) {
      root.innerHTML = '<p class="text-rose-400">Unknown section.</p>';
      return;
    }
    pool = banks[bankId];
    const meta = sections.banks.find(b => b.id === bankId);
    title = `${meta.name} — Drill`;
    target = Math.min(pool.length, meta.testLength || 20);
  } else if (mode === 'mock') {
    const mixIds = ['general-knowledge', 'air-brakes', 'combination-vehicles'];
    pool = mixIds.flatMap(id => banks[id] || []);
    title = 'Mock Exam — Mixed';
    target = Math.min(pool.length, 50);
  } else if (mode === 'weakspots') {
    const stats = await getQuestionStats();
    const allQs = Object.values(banks).flat();
    const weakIds = Object.entries(stats)
      .filter(([_, s]) => s.attempts > 0 && (s.correct / s.attempts) < 0.7)
      .sort((a, b) => (a[1].correct / a[1].attempts) - (b[1].correct / b[1].attempts))
      .map(([id]) => id);
    pool = allQs.filter(q => weakIds.includes(q.id));
    title = 'Weak Spots';
    target = Math.min(pool.length, 25);
    if (pool.length === 0) {
      root.innerHTML = `
        <div class="text-center py-12 space-y-3">
          <div class="text-4xl">🎯</div>
          <h2 class="text-xl font-semibold">Nothing weak yet</h2>
          <p class="text-sm text-slate-400">Take some practice tests first — questions you miss show up here.</p>
          <a href="#home" class="inline-block mt-3 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-semibold">Back to home</a>
        </div>
      `;
      return;
    }
  }

  state = {
    mode, bankId, title,
    questions: shuffle(pool).slice(0, target),
    idx: 0,
    answers: [],
    pass
  };
  renderQuestion(root);
}

function renderQuestion(root) {
  const q = state.questions[state.idx];
  if (!q) return renderResults(root);

  const choices = q.choices.map((c, i) => ({ i, text: c, correct: i === q.answer }));

  root.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between text-xs text-slate-400">
        <div>${state.title}</div>
        <div>Q ${state.idx + 1} / ${state.questions.length}</div>
      </div>
      <div class="h-1 bg-slate-800 rounded">
        <div class="h-full bg-amber-500 rounded" style="width:${((state.idx) / state.questions.length) * 100}%"></div>
      </div>
      <h2 class="text-lg font-semibold leading-snug">${q.question}</h2>
      <div id="choices" class="space-y-2"></div>
      <div id="feedback" class="hidden rounded-lg p-3 text-sm"></div>
      <button id="next-btn" class="hidden w-full py-3 bg-amber-500 text-slate-900 rounded-lg font-semibold">Next</button>
    </div>
  `;

  const choicesEl = document.getElementById('choices');
  choicesEl.innerHTML = choices.map(c => `
    <button data-i="${c.i}" class="choice w-full text-left p-3 rounded-lg border border-slate-700 bg-slate-900 hover:border-amber-500 transition">
      <span class="inline-block w-6 text-amber-400 font-mono">${String.fromCharCode(65 + c.i)}.</span>
      <span>${c.text}</span>
    </button>
  `).join('');

  choicesEl.querySelectorAll('.choice').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(root, parseInt(btn.dataset.i, 10)));
  });
}

async function handleAnswer(root, picked) {
  const q = state.questions[state.idx];
  const correct = picked === q.answer;
  state.answers.push({ questionId: q.id, picked, correct });
  await recordAnswer({ questionId: q.id, sectionId: q.sectionId || state.bankId, correct });

  document.querySelectorAll('.choice').forEach(btn => {
    const i = parseInt(btn.dataset.i, 10);
    btn.disabled = true;
    if (i === q.answer) {
      btn.classList.remove('border-slate-700');
      btn.classList.add('border-emerald-500', 'bg-emerald-900/30');
    } else if (i === picked) {
      btn.classList.remove('border-slate-700');
      btn.classList.add('border-rose-500', 'bg-rose-900/30');
    }
  });

  const fb = document.getElementById('feedback');
  fb.classList.remove('hidden');
  fb.className = `rounded-lg p-3 text-sm border ${correct ? 'border-emerald-500/40 bg-emerald-900/20' : 'border-rose-500/40 bg-rose-900/20'}`;
  fb.innerHTML = `
    <div class="font-semibold mb-1">${correct ? '✓ Correct' : '✗ Incorrect'}</div>
    ${q.explanation ? `<div class="text-slate-300">${q.explanation}</div>` : ''}
    ${q.citation ? `<div class="text-xs text-slate-400 mt-1">Reference: ${q.citation}</div>` : ''}
  `;

  const nextBtn = document.getElementById('next-btn');
  nextBtn.classList.remove('hidden');
  nextBtn.textContent = state.idx + 1 >= state.questions.length ? 'See Results' : 'Next →';
  nextBtn.addEventListener('click', () => {
    state.idx += 1;
    renderQuestion(root);
  });
}

async function renderResults(root) {
  const total = state.questions.length;
  const correct = state.answers.filter(a => a.correct).length;
  const pct = Math.round((correct / total) * 100);
  const passed = pct >= state.pass * 100;
  const missed = state.answers.filter(a => !a.correct).map(a => a.questionId);

  await recordAttempt({
    examType: state.mode === 'drill' ? `drill:${state.bankId}` : state.mode,
    sectionId: state.bankId,
    total, correct, missedIds: missed
  });

  root.innerHTML = `
    <div class="space-y-5">
      <div class="text-center py-6">
        <div class="text-5xl font-bold ${passed ? 'text-emerald-400' : 'text-amber-400'}">${pct}%</div>
        <div class="text-slate-300 mt-1">${correct} / ${total} correct</div>
        <div class="mt-2 text-sm ${passed ? 'text-emerald-400' : 'text-amber-400'}">${passed ? '✓ Passing (≥80%)' : 'Below passing (80%)'}</div>
      </div>
      ${missed.length ? `
        <div>
          <h3 class="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">Missed questions</h3>
          <div class="space-y-2">
            ${state.answers.filter(a => !a.correct).map(a => {
              const q = state.questions.find(qq => qq.id === a.questionId);
              return `
                <div class="p-3 rounded-lg bg-slate-800 border border-slate-700">
                  <div class="text-sm">${q.question}</div>
                  <div class="text-xs text-emerald-400 mt-1">Correct: ${q.choices[q.answer]}</div>
                  ${q.explanation ? `<div class="text-xs text-slate-400 mt-1">${q.explanation}</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
      <div class="grid grid-cols-2 gap-3 pt-2">
        <a href="#home" class="text-center py-3 rounded-lg border border-slate-700 hover:bg-slate-800">Home</a>
        <a href="${location.hash}" onclick="location.reload()" class="text-center py-3 bg-amber-500 text-slate-900 rounded-lg font-semibold">Retry</a>
      </div>
    </div>
  `;
}
