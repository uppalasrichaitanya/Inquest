// ---- events
// first visit: go straight into the guided case (it opens with a welcome and a way to skip)
function homeOrLesson() {
  renderHome();
  if (!tutorialDone() && !Object.keys(loadStats().solved).length) startWarmup();
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]');
  if (a) {
    const act = a.dataset.act, i = +a.dataset.i;
    if (act === 'open-daily') openCase(dailySpec(a.dataset.tier), 'daily');
    else if (act === 'home') { closeModal(); homeOrLesson(); }
    else if (act === 'how') openModal(howToHTML());
    else if (act === 'theme') toggleTheme();
    else if (act === 'tutorial') startWarmup();
    else if (act === 'warm-skip') { LS.set('inq1:tutorial', 1); renderHome(); }
    else if (act === 'undo') undo();
    else if (act === 'clear') clearAll();
    else if (act === 'stats') openStats();
    else if (act === 'random') {
      closeModal();
      const t = G ? G.puzzle.tier : TIER_ORDER[Math.floor(Math.random() * TIER_ORDER.length)];
      pickRandom(t);
    }
    else if (act === 'close') closeModal();
    else if (act === 'accuse') {
      closeModal();
      if (a.getAttribute('aria-disabled') === 'true') setWarmNote('Not yet. Once the notebook points to one person, with their weapon and room circled, this button wakes up.');
      else openAccuse();
    }
    else if (act === 'submit-accuse') submitAccuse();
    else if (act === 'hint') openHint();
    else if (act === 'hint-more') hintMore();
    else if (act === 'copy-share') copyShare();
    else if (act === 'pick-tier') { closeModal(); openCase(randomSpec(a.dataset.tier), 'random'); }
    // the case screen
    else if (act === 'pick-stmt') { closeModal(); selectStatement(i); }
    else if (act === 'use') toggleUsed(i);
    else if (act === 'stmt-step') stepStatement(+a.dataset.d);
    else if (act === 'all-stmts') openAllStatements();
    else if (act === 'nbtab') setTab(a.dataset.tab);
    else if (act === 'wrview') {
      G.wrView = G.wrView === 'table' ? 'plan' : 'table';
      LS.set('inq1:wrview', G.wrView);
      buildPlan(); paintAll(); applyFocus();
    }
    return;
  }
  const pk = e.target.closest('[data-pick]');
  if (pk) {
    const key = pk.dataset.pick, v = +pk.dataset.v;
    G.pick[key] = G.pick[key] === v ? null : v;
    document.querySelectorAll(`[data-pick="${key}"]`).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === G.pick[key])));
    updateSaid();
    return;
  }
  // a room on the plan opens its weapons at full size (a chip itself is marked where it is, on wide screens)
  const room = e.target.closest('.room[data-room]');
  if (room && !e.target.closest('.cell') && G) { openRoomSheet(+room.dataset.room); return; }
  if (e.target.id === 'scrim') closeModal();
});

function pickRandom(tier) {
  closeModal();
  openRandomChoice(tier);
}
function openRandomChoice(tier) {
  openModal(`<h2>Play an older case</h2><p>Pick a level. You will get a case you have not closed yet, when there is one.</p>
    <div class="actions">${TIER_ORDER.map((t) => `<button class="btn ${t === tier ? '' : 'ghost'}" data-act="pick-tier" data-tier="${t}">${TIERS[t].name}</button>`).join('')}</div>`);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && VIEW === 'case' && G && !document.getElementById('scrim')) { e.preventDefault(); undo(); }
  const room = (e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.room[data-room]');
  if (room) { e.preventDefault(); openRoomSheet(+room.dataset.room); }
});

setInterval(() => {
  if (VIEW !== 'case' || !G || G.solved || document.hidden) return;
  G.elapsed++;
  if (G.elapsed % 5 === 0) persist();
}, 1000);
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
// crossing the phone width redraws the plan for its new size
const onPhone = () => { if (VIEW === 'case' && G) { buildPlan(); paintAll(); applyFocus(); } };
if (PHONE.addEventListener) PHONE.addEventListener('change', onPhone); else if (PHONE.addListener) PHONE.addListener(onPhone);
let rz = null;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (VIEW === 'case') fitGrid(); }, 100); });

applyTheme();
document.body.insertAdjacentHTML('afterbegin', KIND_DEFS);
wireGrid();
homeOrLesson();
