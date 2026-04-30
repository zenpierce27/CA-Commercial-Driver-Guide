// Router + home dashboard
import { loadSections, loadAllQuestionBanks } from './data.js';
import { getRecentAttempts, getQuestionStats } from './db.js';
import { startQuiz } from './quiz.js';
import { startWalkaround } from './walkaround.js';

const root = document.getElementById('view-root');
const headerRight = document.getElementById('header-right');

document.getElementById('home-btn').addEventListener('click', () => navigate('home'));

window.addEventListener('hashchange', handleHash);

async function handleHash() {
  const hash = location.hash.slice(1) || 'home';
  const [view, ...rest] = hash.split('/');
  switch (view) {
    case 'home': return renderHome();
    case 'quiz': return startQuiz(root, { mode: rest[0] || 'drill', bankId: rest[1] });
    case 'walkaround': return startWalkaround(root);
    default: return renderHome();
  }
}

function navigate(view) {
  location.hash = '#' + view;
}

async function renderHome() {
  headerRight.textContent = '';
  root.innerHTML = `
    <div class="space-y-6">
      <section class="rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/30 p-5">
        <h1 class="text-xl font-bold mb-1">CA Class A — Study Mode</h1>
        <p class="text-sm text-slate-300">Tests you're prepping for: General Knowledge, Air Brakes, Combination Vehicles, Doubles/Triples (T), Tanker (N).</p>
        <div id="recent-summary" class="mt-3 text-xs text-slate-400">Loading recent activity…</div>
      </section>

      <section>
        <h2 class="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Practice tests</h2>
        <div id="bank-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-3"></div>
      </section>

      <section>
        <h2 class="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Tools</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a href="#walkaround" class="block rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 p-4">
            <div class="font-semibold">Pre-Trip Walkaround</div>
            <div class="text-xs text-slate-400 mt-1">Flashcards for the 2023 modernized vehicle inspection (11M)</div>
          </a>
          <a href="#quiz/weakspots" class="block rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 p-4">
            <div class="font-semibold">Weak Spots Drill</div>
            <div class="text-xs text-slate-400 mt-1">Pulls from questions you've missed</div>
          </a>
          <a href="#quiz/mock" class="block rounded-xl bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/40 p-4">
            <div class="font-semibold">Mock Exam (mixed)</div>
            <div class="text-xs text-slate-400 mt-1">50-question simulation, timed, like the real test</div>
          </a>
        </div>
      </section>
    </div>
  `;

  const sections = await loadSections();
  const banks = await loadAllQuestionBanks();
  const stats = await getQuestionStats();
  const recent = await getRecentAttempts(5);

  const recentEl = document.getElementById('recent-summary');
  if (recent.length === 0) {
    recentEl.textContent = 'No attempts yet — pick a section to start.';
  } else {
    const last = recent[0];
    const pct = Math.round((last.correct / last.total) * 100);
    recentEl.innerHTML = `Last attempt: <span class="text-slate-200 font-semibold">${last.examType}</span> — ${last.correct}/${last.total} (${pct}%)`;
  }

  const grid = document.getElementById('bank-grid');
  grid.innerHTML = sections.banks.map(b => {
    const bankQs = banks[b.id] || [];
    const bankStats = bankQs.map(q => stats[q.id]).filter(Boolean);
    const seen = bankStats.length;
    const correct = bankStats.filter(s => s.lastCorrect).length;
    const pct = seen ? Math.round((correct / seen) * 100) : null;
    return `
      <a href="#quiz/drill/${b.id}" class="block rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 p-4">
        <div class="flex items-baseline justify-between">
          <div class="font-semibold">${b.name}</div>
          <div class="text-xs text-slate-400">${bankQs.length} qs</div>
        </div>
        <div class="text-xs text-slate-400 mt-1">${b.description}</div>
        <div class="mt-2 flex items-center gap-2">
          <div class="h-1.5 flex-1 bg-slate-700 rounded overflow-hidden">
            <div class="h-full ${pct !== null && pct >= 80 ? 'bg-emerald-500' : pct !== null ? 'bg-amber-500' : 'bg-slate-600'}" style="width:${pct || 0}%"></div>
          </div>
          <div class="text-[11px] text-slate-400 w-12 text-right">${pct !== null ? pct + '%' : '—'}</div>
        </div>
      </a>
    `;
  }).join('');
}

handleHash();
