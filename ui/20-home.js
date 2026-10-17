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
    : '<div class="cta"><button class="btn" data-act="tutorial">Learn to play</button><span class="soft">A three-guest warm-up. About a minute.</span></div>';
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
        ${tutorialDone() ? '<button class="link" data-act="tutorial">Replay the warm-up</button>' : ''}
        <button class="link" data-act="random">Play an older case</button>
        <span class="grow"></span>
        <span class="soft">Streak ${st.streak}, best ${st.bestStreak}, ${solved} closed</span>
      </div>
    </main>`;
  window.scrollTo(0, 0);
}

function openCase(spec, mode) {
  closeModal();
  newGame(spec, mode);
  renderCase();
}

function howToHTML() {
  return `<h2>How to play</h2>
    <p>Someone has been murdered. Each guest was in a different room, holding a different weapon. Find <b>who</b> did it, <b>with what</b>, and <b>where</b>.</p>
    ${rulesHTML()}
    <p><b>The notebook.</b> Tap a square once to rule it out, twice to circle a match, a third time to clear it. Faint marks follow from yours. <b>Undo</b> takes back the last tap.</p>
    <p><b>The plan.</b> Rooms are <i>next to</i> each other where a doorway or a stair joins them, upstairs and down included. On the train, carriages coupled together are next to each other.</p>
    <p class="soft">Every case has exactly one answer and can be solved by logic alone. A wrong guess goes on your record, and tells you which statement it breaks.</p>
    <div class="actions"><button class="btn" data-act="tutorial">Play the warm-up</button><button class="btn ghost" data-act="close">Got it</button></div>`;
}
