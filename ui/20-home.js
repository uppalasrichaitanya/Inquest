const app = () => document.getElementById('app');

const TIER_COPY = {
  constable: { tab: 'Four suspects', line: 'Plain testimony. The place to start.' },
  detective: { tab: 'Five suspects', line: 'A fair fight. Every clue earns its place.' },
  inspector: { tab: 'Six suspects', line: 'Fewer gifts. Expect to test a theory or two.' },
  mastermind: { tab: 'Six suspects', line: 'No direct testimony. Only what the evidence implies.' },
};
const tutorialDone = () => !!LS.get('inq1:tutorial', 0);

function folderState(spec) {
  const s = LS.get(caseKey(spec), null);
  if (s && s.solved) return '<span class="state done">Closed</span>';
  if (s && (s.elapsed > 20 || s.struck && s.struck.length)) return '<span class="state">Started</span>';
  return '<span class="state">Not started</span>';
}

function renderHome() {
  VIEW = 'home'; G = null;
  endCoach();
  const st = loadStats();
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const solved = Object.values(st.solved).reduce((a, b) => a + b, 0);
  const rows = TIER_ORDER.map((t) => {
    const spec = dailySpec(t), T = TIERS[t], w = WORLDS[spec.w];
    const start = t === 'constable' && !solved ? '<span class="start">Start here</span>' : '';
    return `<li><button class="case-row" data-act="open-daily" data-tier="${t}">
      <span class="who"><span class="tier">${T.name}</span>${start}<span class="line">${TIER_COPY[t].tab}. ${esc(TIER_COPY[t].line)}</span></span>
      <span class="today"><span class="title">${esc(spec.ti)}</span><span class="line">${esc(w.name)}, ${w.year}</span></span>
      <span class="how"><span aria-label="Difficulty ${spec.r} of 5">${stars(spec.r)}</span>${folderState(spec)}</span>
    </button></li>`;
  }).join('');
  const learn = tutorialDone()
    ? ''
    : '<div class="cta"><button class="btn" data-act="tutorial">Learn to play</button><span class="soft">A three-suspect case, solved together in about two minutes.</span></div>';
  app().innerHTML = `
    <div class="bar"><button class="mark" data-act="home">Inquest</button>
      <button class="quiet" data-act="how">How to play</button><button class="quiet" data-act="stats">Your record</button>${themeButton()}</div>
    <main class="home">
      <header>
        <p class="date">${esc(dateStr)}, case ${dayNumber()}</p>
        <h1>One murder. A few true statements. Exactly one answer.</h1>
        <p class="lede">Read what the witnesses say, rule things out in your notebook, and name the killer, the weapon and the room.</p>
        ${learn}
      </header>
      <section aria-labelledby="today-label">
        <p class="label" id="today-label">Today's cases, easiest first</p>
        <ol class="cases">${rows}</ol>
      </section>
      <div class="row">
        ${tutorialDone() ? '<button class="link" data-act="tutorial">Replay the lesson</button>' : ''}
        <button class="link" data-act="random">Play an older case</button>
        <span class="grow"></span>
        <span class="soft">Streak ${st.streak}, best ${st.bestStreak}, ${solved} closed</span>
      </div>
    </main>`;
  window.scrollTo(0, 0);
}

function openCase(spec, mode) {
  closeModal();
  endCoach();
  newGame(spec, mode);
  renderCase();
}

function howToHTML() {
  return `<h2>How to play</h2>
    <p>Someone has been murdered. Each suspect was in a different room, holding a different weapon. Find <b>who</b> did it, <b>with what</b>, and <b>where</b>.</p>
    <ol>
      <li><b>Everything in the case file is true.</b> Read a statement and work out what it rules in or out. Tap a statement to strike it through once you have used it.</li>
      <li><b>Use the notebook.</b> Tap a square once to cross it out (&times;), twice to circle a match (&#9711;), a third time to clear it. A circle crosses out the rest of its row and column for you, because each person had one weapon and was in one room.</li>
      <li><b>Use the floor plan.</b> "Next to" means rooms that share a wall, or sit directly above or below each other. On the train, it means carriages coupled together.</li>
      <li><b>Accuse.</b> The killer held the murder weapon in the room where the body was found. A wrong accusation goes on your record, and tells you which statement it breaks.</li>
    </ol>
    <p>Every case has exactly one answer and can be solved by logic alone. Stuck? Inspector Mallory will give you a hint, and will tell you if something in your notebook doesn't add up.</p>
    <div class="actions"><button class="btn" data-act="tutorial">Play the tutorial</button><button class="btn ghost" data-act="close">Got it</button></div>`;
}
