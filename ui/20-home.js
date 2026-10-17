const app = () => document.getElementById('app');
const tutorialDone = () => !!LS.get('inq1:tutorial', 0);
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function stateWord(spec) {
  const s = caseState(spec);
  if (s.solved) return `Closed in ${fmtTime(s.elapsed || 0)}`;
  if (s.elapsed > 20 || (s.struck && s.struck.length)) return 'Started';
  return '';
}
const closedCount = (st) => Object.values(st.solved).reduce((a, b) => a + b, 0);
const guestWord = { constable: 'Four guests', detective: 'Five guests', inspector: 'Six guests', mastermind: 'Six guests' };

// ---- home: today's case, this week, and a way into the past
function renderHome() {
  VIEW = 'home'; G = null;
  const st = loadStats(), n = todayN(), D = dailyFor(n), w = WORLDS[D.spec.w], s = caseState(D.spec);
  const closed = closedCount(st), streak = liveStreak(st);
  const go = s.solved ? 'See it again' : s.elapsed > 20 || (s.struck && s.struck.length) ? 'Carry on' : 'Play today’s case';
  // someone new, on a day that isn't Monday, is offered a gentler first case
  let gentle = '';
  if (!closed && weekdayOf(n) !== 1) {
    const g = gentleStart();
    gentle = `<p class="gentle">New here? ${g.n ? `${esc(dayName(g.n, { weekday: 'long', day: 'numeric', month: 'long' }))}’s case is a gentle one to start.` : 'Mondays are the gentlest day; until the first one, here is a gentle practice case.'}
      <button class="link" data-act="gentle">Start there</button></p>`;
  }
  app().innerHTML = `
    <div class="bar"><button class="mark" data-act="home">Inquest</button>
      <button class="quiet" data-act="how">How to play</button><button class="quiet" data-act="stats">Your record</button>${themeButton()}</div>
    <main class="home">
      <header>
        <p class="date">${esc(dayName(n))}</p>
        <h1>One murder. A few true statements. Exactly one answer.</h1>
        ${tutorialDone() ? '' : '<div class="cta"><button class="btn ghost" data-act="tutorial">Learn to play</button><span class="soft">A three-guest warm-up. About a minute.</span></div>'}
      </header>
      <section class="today-case" aria-labelledby="today-label">
        <p class="label" id="today-label">Today’s case, No. ${n}<span class="sep"></span><span aria-label="${WEEKDAY[weekdayOf(n)]}, difficulty ${TIER_LEVEL[D.tier]} of 4">${dayDots(D.tier)}</span></p>
        <h2>${esc(D.spec.ti)}</h2>
        <p class="line">${esc(w.name)}, ${w.year}. ${guestWord[D.tier]}. <span class="feel">${esc(DAY_FEEL[D.tier])}</span></p>
        <div class="go"><button class="btn big" data-act="open-day" data-n="${n}">${go}</button>${s.solved ? `<span class="state done">${stateWord(D.spec)}</span>` : ''}</div>
        ${gentle}
      </section>
      ${weekHTML(n)}
      <div class="row">
        <button class="link" data-act="archive">Past cases</button>
        ${tutorialDone() ? '<button class="link" data-act="tutorial">Replay the warm-up</button>' : ''}
        <span class="grow"></span>
        <span class="soft">${streak ? `A ${streak}-day streak` : 'No streak yet'}${st.bestStreak > 1 ? ` (best ${st.bestStreak})` : ''}${closed ? `, ${closed} closed` : ''}.</span>
      </div>
    </main>`;
  window.scrollTo(0, 0);
}

// this week, Monday to Sunday: each day's difficulty, and a tick for the ones you closed
function weekHTML(n) {
  const mon = n - ((weekdayOf(n) + 6) % 7);
  const days = [...Array(7).keys()].map((k) => {
    const m = mon + k, wd = weekdayOf(m), tier = WEEK_TIER[wd];
    const short = WEEKDAY[wd].slice(0, 3), date = dateOfDay(m).getDate();
    const inner = `<span class="dname">${short}</span><span class="dnum">${date}</span>${dayDots(tier)}`;
    if (m < 1) return `<li><span class="day before" aria-hidden="true"><span class="dname">${short}</span><span class="dnum">${date}</span></span></li>`;
    if (m > n) return `<li><span class="day future" title="Opens at midnight on ${esc(dayName(m))}">${inner}<span class="sr">${esc(dayName(m))}, not yet</span></span></li>`;
    const s = caseState(dailyFor(m).spec), word = s.solved ? 'closed' : s.elapsed > 20 ? 'started' : 'not played';
    return `<li><button class="day${m === n ? ' is-today' : ''}${s.solved ? ' is-closed' : ''}" data-act="open-day" data-n="${m}" aria-label="${esc(dayName(m))}, No. ${m}, ${word}">${inner}<span class="dmark">${s.solved ? penTick('d' + m) : ''}</span></button></li>`;
  }).join('');
  return `<section class="week" aria-labelledby="week-label"><p class="label" id="week-label">This week</p><ol class="days">${days}</ol>
    <p class="soft weekline">The week rises like a crossword: Monday is the gentlest, Sunday the hardest.</p></section>`;
}

// ---- past cases: every day since No. 1, newest first, a week at a time
const ARCH = { weeks: 6 };
const ARCH_FILTERS = [['all', 'All days'], ['constable', 'Mondays'], ['detective', 'Tue & Wed'], ['inspector', 'Thu to Sat'], ['mastermind', 'Sundays']];
function renderArchive() {
  VIEW = 'archive'; G = null;
  const n = todayN(), f = LS.get('inq1:archfilter', 'all');
  const days = [];
  for (let m = n - 1; m >= 1; m--) if (f === 'all' || WEEK_TIER[weekdayOf(m)] === f) days.push(m);
  // group by week (Monday first), and show only the latest ARCH.weeks of them
  const weeks = [];
  for (const m of days) {
    const mon = m - ((weekdayOf(m) + 6) % 7);
    if (!weeks.length || weeks[weeks.length - 1].mon !== mon) weeks.push({ mon, days: [] });
    weeks[weeks.length - 1].days.push(m);
  }
  const shown = weeks.slice(0, ARCH.weeks);
  const row = (m) => {
    const D = dailyFor(m), w = WORLDS[D.spec.w], word = stateWord(D.spec);
    return `<li><button class="case-row" data-act="open-day" data-n="${m}">
      <span class="who"><span class="day-name">${esc(dayName(m))}</span><span class="line">No. ${m}</span></span>
      <span class="today"><span class="title">${esc(D.spec.ti)}</span><span class="line">${esc(w.name)}, ${w.year}</span></span>
      <span class="how"><span aria-label="Difficulty ${TIER_LEVEL[D.tier]} of 4">${dayDots(D.tier)}</span><span class="state${caseState(D.spec).solved ? ' done' : ''}">${word || 'Not played'}</span></span>
    </button></li>`;
  };
  const firstOf = (tier) => { for (let m = n; m < n + 7; m++) if (WEEK_TIER[weekdayOf(m)] === tier) return m; return n; };
  const empty = f === 'all' ? 'No past cases yet: No. 1 is today.'
    : `No ${DAY_GROUP[f].replace('Tuesdays and Wednesdays', 'Tuesdays or Wednesdays').replace('Thursdays to Saturdays', 'Thursdays, Fridays or Saturdays')} yet. The first is ${esc(dayName(firstOf(f)))}.`;
  app().innerHTML = `
    <div class="bar"><button class="mark" data-act="home" aria-label="Inquest: back to today">Inquest</button>
      <button class="quiet" data-act="how">How to play</button><button class="quiet" data-act="stats">Your record</button>${themeButton()}</div>
    <main class="home archive">
      <header>
        <p class="date"><button class="link" data-act="home">Back to today</button></p>
        <h1>Past cases</h1>
        <p class="lede">Every day since No. 1 on ${esc(dayName(1, { day: 'numeric', month: 'long' }))}. Practise the gentle Mondays, or go back for the Sundays.</p>
      </header>
      <div class="filters" role="group" aria-label="Which days">${ARCH_FILTERS.map(([k, label]) => `<button type="button" data-act="archfilter" data-f="${k}" aria-pressed="${k === f}">${label}</button>`).join('')}</div>
      ${shown.length ? shown.map((wk) => `<section class="wk" aria-label="Week of ${esc(dayName(Math.max(1, wk.mon), { day: 'numeric', month: 'long' }))}">
        <p class="label">Week of ${esc(dateOfDay(wk.mon).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }))}</p>
        <ol class="cases">${wk.days.map(row).join('')}</ol></section>`).join('') : `<p class="soft">${empty}</p>`}
      ${weeks.length > shown.length ? '<button class="btn ghost" data-act="archmore">Show earlier weeks</button>' : ''}
    </main>`;
}

// open a day's case: today's counts towards the streak, an earlier one is from the archive
function openDay(n) {
  const D = dailyFor(n);
  openCase(D.spec, n === todayN() ? 'daily' : 'archive', n);
}
function openCase(spec, mode, day) {
  closeModal();
  newGame(spec, mode, day);
  renderCase();
}
function openGentle() {
  const g = gentleStart();
  if (g.n) openDay(g.n); else openCase(g.spec, 'practice');
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
