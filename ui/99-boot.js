// ---- events
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]');
  if (a) {
    const act = a.dataset.act;
    if (act === 'open-daily') openCase(dailySpec(a.dataset.tier), 'daily');
    else if (act === 'home') { closeModal(); renderHome();
// first visit: go straight into the guided case (it opens with a welcome and a way to skip)
if (!tutorialDone() && !Object.keys(loadStats().solved).length) startTutorial(); }
    else if (act === 'how') openModal(howToHTML());
    else if (act === 'tutorial') startTutorial();
    else if (act === 'coach-next') coachNext();
    else if (act === 'coach-skip') { LS.set('inq1:tutorial', 1); endCoach(); renderHome();
// first visit: go straight into the guided case (it opens with a welcome and a way to skip)
if (!tutorialDone() && !Object.keys(loadStats().solved).length) startTutorial(); }
    else if (act === 'nbview') {
      G.view = a.dataset.v;
      if (G.mode !== 'tutorial') LS.set('inq1:nbview', G.view);
      buildGrid(); paintAll();
    }
    else if (act === 'stats') openStats();
    else if (act === 'random') {
      closeModal();
      const t = G ? G.puzzle.tier : TIER_ORDER[Math.floor(Math.random() * TIER_ORDER.length)];
      pickRandom(t);
    }
    else if (act === 'close') closeModal();
    else if (act === 'accuse') { closeModal(); openAccuse(); }
    else if (act === 'submit-accuse') submitAccuse();
    else if (act === 'jump') { const nb = document.getElementById('nb'); if (nb) nb.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (act === 'hint') openHint();
    else if (act === 'hint-more') hintMore();
    else if (act === 'copy-share') copyShare();
    else if (act === 'pick-tier') { closeModal(); openCase(randomSpec(a.dataset.tier), 'random'); }
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
  const st = e.target.closest('.stmt > button');
  if (st) {
    const li = st.parentElement, i = +li.dataset.i, on = li.dataset.struck !== '1';
    li.dataset.struck = on ? '1' : '0'; st.setAttribute('aria-pressed', String(on));
    G.struck = on ? G.struck.concat(i) : G.struck.filter((x) => x !== i);
    persist();
    return;
  }
  if (e.target.id === 'scrim') closeModal();
  const tab = e.target.closest('#nb-tabs button');
  if (tab) { G.tab = tab.dataset.tab; buildGrid(); paintAll(); wireGrid(); }
});

function pickRandom(tier) {
  closeModal();
  openRandomChoice(tier);
}
function openRandomChoice(tier) {
  openModal(`<h2>Open a different case</h2><p>Pick a level. You will get a case you have not closed yet, when there is one.</p>
    <div class="actions">${TIER_ORDER.map((t) => `<button class="btn ${t === tier ? '' : 'ghost'}" data-act="pick-tier" data-tier="${t}">${TIERS[t].name}</button>`).join('')}</div>`);
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
document.addEventListener('change', (e) => {
  if (e.target.id === 'opt-cross') { G.opts.cross = e.target.checked; persist(); paintAll(); }
  if (e.target.id === 'opt-chain') { G.opts.chain = e.target.checked; persist(); paintAll(); }
});
document.addEventListener('mouseover', (e) => { const t = e.target.closest('.tk'); if (t) lightEnts([t.dataset.ent], true); });
document.addEventListener('mouseout', (e) => { const t = e.target.closest('.tk'); if (t) lightEnts([t.dataset.ent], false); });

setInterval(() => {
  if (VIEW !== 'case' || !G || G.solved || document.hidden) return;
  G.elapsed++;
  const c = document.getElementById('clock'); if (c) c.textContent = fmtTime(G.elapsed);
  if (G.elapsed % 5 === 0) persist();
}, 1000);
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
let rz = null;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (VIEW === 'case') { buildPlan(); chooseGridMode(); } }, 120); });

renderHome();
// first visit: go straight into the guided case (it opens with a welcome and a way to skip)
if (!tutorialDone() && !Object.keys(loadStats().solved).length) startTutorial();
