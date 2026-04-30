// Loads section + question data, caches in memory.

let _sections, _questionBanks = {}, _walkaround;

export async function loadSections() {
  if (_sections) return _sections;
  const res = await fetch('data/sections.json');
  _sections = await res.json();
  return _sections;
}

export async function loadQuestions(bankId) {
  if (_questionBanks[bankId]) return _questionBanks[bankId];
  const res = await fetch(`data/questions/${bankId}.json`);
  _questionBanks[bankId] = await res.json();
  return _questionBanks[bankId];
}

export async function loadAllQuestionBanks() {
  const sections = await loadSections();
  const banks = {};
  await Promise.all(sections.banks.map(async (b) => {
    banks[b.id] = await loadQuestions(b.id);
  }));
  return banks;
}

export async function loadWalkaround() {
  if (_walkaround) return _walkaround;
  const res = await fetch('data/inspection/walkaround.json');
  _walkaround = await res.json();
  return _walkaround;
}

export function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
