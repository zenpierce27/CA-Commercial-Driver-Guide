// Pre-Trip Walkaround flashcard mode for the 2023 Modernized Vehicle Inspection Test (11M).
import { loadWalkaround, shuffle } from './data.js';

let state = null;

export async function startWalkaround(root) {
  const data = await loadWalkaround();
  state = {
    cards: shuffle(data.cards),
    idx: 0,
    flipped: false,
    knownIds: new Set(),
    unknownIds: new Set()
  };
  renderCard(root);
}

function renderCard(root) {
  const c = state.cards[state.idx];
  if (!c) return renderDone(root);

  root.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between text-xs text-slate-400">
        <div>Pre-Trip Walkaround (11M)</div>
        <div>${state.idx + 1} / ${state.cards.length}</div>
      </div>
      <div class="h-1 bg-slate-800 rounded">
        <div class="h-full bg-amber-500 rounded" style="width:${((state.idx) / state.cards.length) * 100}%"></div>
      </div>
      <div id="card" class="rounded-2xl bg-slate-800 border border-slate-700 p-6 min-h-[280px] flex flex-col cursor-pointer">
        <div class="text-xs uppercase tracking-wide text-amber-400 font-semibold">${c.area}</div>
        <div class="text-2xl font-bold mt-2">${c.item}</div>
        ${state.flipped ? `
          <div class="mt-5 space-y-3 text-sm">
            <div>
              <div class="text-xs uppercase tracking-wide text-slate-400">Check for</div>
              <div class="text-slate-100 mt-1">${c.what_to_check}</div>
            </div>
            ${c.why ? `<div>
              <div class="text-xs uppercase tracking-wide text-slate-400">Why</div>
              <div class="text-slate-200 mt-1">${c.why}</div>
            </div>` : ''}
          </div>
        ` : `
          <div class="mt-auto text-sm text-slate-400">Tap card to reveal what to check.</div>
        `}
      </div>
      ${state.flipped ? `
        <div class="grid grid-cols-2 gap-3">
          <button id="dont-know" class="py-3 rounded-lg border border-rose-500/40 bg-rose-900/20 hover:bg-rose-900/40 font-semibold">Need more practice</button>
          <button id="know" class="py-3 rounded-lg bg-emerald-500 text-slate-900 font-semibold">Got it</button>
        </div>
      ` : `
        <button id="flip" class="w-full py-3 bg-amber-500 text-slate-900 rounded-lg font-semibold">Reveal</button>
      `}
    </div>
  `;

  if (!state.flipped) {
    document.getElementById('flip').addEventListener('click', () => { state.flipped = true; renderCard(root); });
    document.getElementById('card').addEventListener('click', () => { state.flipped = true; renderCard(root); });
  } else {
    document.getElementById('know').addEventListener('click', () => mark(root, true));
    document.getElementById('dont-know').addEventListener('click', () => mark(root, false));
  }
}

function mark(root, known) {
  const c = state.cards[state.idx];
  if (known) state.knownIds.add(c.id); else state.unknownIds.add(c.id);
  state.idx += 1;
  state.flipped = false;
  renderCard(root);
}

function renderDone(root) {
  const known = state.knownIds.size;
  const unknown = state.unknownIds.size;
  root.innerHTML = `
    <div class="space-y-5 text-center py-6">
      <div class="text-5xl">🔧</div>
      <h2 class="text-2xl font-bold">Walkaround complete</h2>
      <div class="text-slate-300">${known} solid &nbsp;·&nbsp; ${unknown} need work</div>
      <div class="grid grid-cols-2 gap-3 max-w-sm mx-auto pt-4">
        <a href="#home" class="text-center py-3 rounded-lg border border-slate-700 hover:bg-slate-800">Home</a>
        <a href="#walkaround" onclick="location.reload()" class="text-center py-3 bg-amber-500 text-slate-900 rounded-lg font-semibold">Retry</a>
      </div>
    </div>
  `;
}
