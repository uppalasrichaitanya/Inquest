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
  if (s && s.solved) return `<span class="stamp blue">Closed ${fmtTime(s.elapsed)}</span>`;
  if (s && (s.elapsed > 20 || s.struck && s.struck.length)) return `<span>In progress, ${fmtTime(s.elapsed)}</span>`;
  return '<span>Unopened</span>';
}

function renderHome() {
  VIEW = 'home'; G = null;
  endCoach();
  const st = loadStats();
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const solved = Object.values(st.solved).reduce((a, b) => a + b, 0);
  const folders = TIER_ORDER.map((t) => {
    const spec = dailySpec(t), T = TIERS[t], w = WORLDS[spec.w];
    const start = t === 'constable' && !solved ? '<span class="ribbon">Start here</span>' : '';
    return `<button class="folder" data-act="open-daily" data-tier="${t}">
      <span class="tab">${TIER_COPY[t].tab}</span>
      <span class="sheet paper">${start}
        <span><h2>${T.name}</h2>
          <p class="meta">${esc(TIER_COPY[t].line)}</p>
          <p class="meta">Today: ${esc(spec.ti)}, ${esc(w.name)}, ${w.year}</p></span>
        <span class="state"><span class="stars" aria-label="Difficulty ${spec.r} of 5">${stars(spec.r)}</span>${folderState(spec)}</span>
      </span></button>`;
  }).join('');
  const learn = tutorialDone()
    ? ''
    : '<div class="cta"><button class="btn red big" data-act="tutorial">Learn to play in two minutes</button><span>A tiny case with three suspects, solved together, step by step.</span></div>';
  app().innerHTML = `
    <main class="home">
      <header>
        <h1>Inquest</h1>
        <p class="lede">A murder mystery you solve with logic. A new case every day.</p>
        <p class="sub">Read what the witnesses say, rule things out in your notebook, and name the killer, the weapon and the room. Every case has exactly one answer.</p>
        ${learn}
        <p class="dateline">${esc(dateStr)}. Case No. ${dayNumber()} is open.</p>
      </header>
      <section class="drawer" aria-label="Today's cases, easiest first">${folders}</section>
      <div class="row">
        ${tutorialDone() ? '<button class="link" data-act="tutorial">Replay the tutorial</button>' : ''}
        <button class="link" data-act="how">How to play</button>
        <button class="link" data-act="random">Open a different case</button>
        <button class="link" data-act="stats">Your record</button>
        <span class="grow"></span>
        <span class="statline">Streak <b>${st.streak}</b> &nbsp; Best <b>${st.bestStreak}</b> &nbsp; Closed <b>${solved}</b></span>
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
