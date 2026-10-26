// ---- the case screen: the story, the suspects (each with a statement), the evidence, the scene (a card for every
// weapon, room and motive, and the map, 45-plan.js) and the notebook (40-grid.js). One statement is always "in hand":
// it is pinned above the notebook, and what it talks about is lit in the notebook, on the cards and on the map.
// Wide screens show everything at once; narrower ones split the case into three panes (clues, notebook, scene)
// with a dock at the bottom.
const WIDE = matchMedia('(min-width: 1100px)');
const PHONE = matchMedia('(max-width: 760px)');
const SEAL = '<svg class="seal" viewBox="0 0 32 32" aria-hidden="true"><circle cx="13.5" cy="13.5" r="8.5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M20 20L27 27" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="13.5" cy="13.5" r="3.2" fill="#D9452F"/></svg>';

// Inspector Mallory, who opens each case, gives the hints and closes the file
const MALLORY = { name: 'Inspector Mallory', hue: 210, traits: { hair: 'grey' }, look: { skin: '#E3B896', hair: 'short', acc: ['bowler', 'moustache'] } };
const malloryLine = (text, cls) => `<p class="${cls}">${face(MALLORY, 40)}<span><b>Inspector Mallory</b> ${esc(text)}</span></p>`;
const isSay = (c) => c.speaker !== null && c.speaker !== undefined;
// evidence is numbered in the order it is listed; testimony goes by who said it
function evidenceNo(i) { return G.puzzle.clues.slice(0, i + 1).filter((c) => !isSay(c)).length; }
function clueLabel(i) {
  const c = G.puzzle.clues[i];
  return isSay(c) ? `${G.puzzle.ctx.suspects[c.speaker].short}’s statement` : `evidence ${evidenceNo(i)}`;
}
function noteLabel(c) {
  const k = c.args.k;
  if (c.type === 'murderType' || c.type === 'murderNotType' || c.type === 'murderAttr') return ['body', 'The coroner'];
  if (c.type === 'murderTrait') return [k === 'hair' ? 'hair' : k === 'eyes' ? 'eye' : 'body', 'On the body'];
  if (c.type === 'murderNotWeapon') return ['lens', 'Forensics'];
  if (c.type === 'murderNotSuspect') return ['file', 'An alibi'];
  if (c.type.includes('Motive') || c.type.startsWith('motive')) return ['seal', 'The motive'];
  if (c.type.startsWith('murder')) return ['body', 'Police report'];
  if (c.type === 'traitWeapon' || c.type === 'traitRoom') return [k === 'hair' ? 'hair' : k === 'eyes' ? 'eye' : k === 'height' ? 'print' : 'lens', 'Forensics'];
  if (c.type === 'inLight' || c.type === 'weaponLight') return ['lamp', 'The lamps'];
  if (c.type === 'in' || c.type === 'notIn') return ['print', 'Footprints'];
  if (c.type === 'has' || c.type === 'notHas') return ['lens', 'Fingerprints'];
  return ['file', 'Case notes'];
}

// what a statement talks about: people, weapons, rooms, motives, a kind of weapon, a floor, the killer
function clueFocus(c) {
  const a = c.args, ctx = G.puzzle.ctx, idx = (arr, f) => arr.map((x, i) => (f(x) ? i : -1)).filter((i) => i >= 0);
  const f = { s: [], w: [], r: [], m: [], kind: a.t || null, floor: a.f === undefined ? null : a.f, k: c.type.startsWith('murder') };
  for (const k of ['s', 'a', 'b']) if (a[k] !== undefined) f.s.push(a[k]);
  if (a.w !== undefined) f.w.push(a.w);
  if (a.r !== undefined) f.r.push(a.r);
  if (a.m !== undefined) f.m.push(a.m);
  if (a.k && TRAITS[a.k]) ctx.traits.forEach((t, s) => { if (t[a.k] === a.v && !f.s.includes(s)) f.s.push(s); });
  if (a.k && WEAPON_ATTRS[a.k]) f.w.push(...idx(ctx.wattr[a.k], (x) => x === a.v));
  if (/Light$/.test(c.type) || c.type === 'inLight') f.r.push(...idx(ctx.light, (x) => x === a.v));
  if (isSay(c) && !f.s.includes(c.speaker) && ['has', 'notHas', 'in', 'notIn', 'holdsType', 'notHoldsType', 'holdsAttr', 'inLight', 'hasMotive', 'notMotive'].includes(c.type)) f.s.push(c.speaker);
  return f;
}

const TICK_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CROSS_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

// a suspect, as a trading card: the portrait on a panel of their colour, their facts, and what they said
function suspectHTML(s, i, ctx) {
  const ci = G.puzzle.clues.findIndex((c) => c.speaker === i), c = G.puzzle.clues[ci];
  const say = G.say[i], on = ci === G.cur;
  const tut = G.mode === 'tutorial';
  return `<article class="suspect${on ? ' on' : ''}${say === 2 ? ' lie' : say === 1 ? ' true' : ''}" data-s="${i}" style="--h:${s.hue}">
    <div class="panel">${face(s, 96)}<span class="tag">Suspect ${'ABCDE'[i]}</span></div>
    <div class="body">
      <h3>${esc(s.name)}</h3><p class="role">${esc(cap(s.role))}</p>
      <ul class="facts" aria-label="${esc(s.short)}: ${TRAIT_KEYS.map((k) => TRAITS[k].values[s.traits[k]]).join(', ')}">${traitChips(s)}</ul>
      <button type="button" class="quote" data-act="pick-stmt" data-i="${ci}" aria-current="${on}"><span class="txt">${tokens(c.text, ctx)}</span></button>
      <div class="saytools" role="group" aria-label="${esc(s.short)}’s statement is">
        <button type="button" data-act="say" data-s="${i}" data-v="1" aria-pressed="${say === 1}">${TICK_SVG}True</button>
        <button type="button" data-act="say" data-s="${i}" data-v="2" aria-pressed="${say === 2}">${CROSS_SVG}A lie</button>
      </div>
      ${tut && on ? tryLine(ci) : ''}
    </div>
    ${say === 2 ? '<span class="stamp" aria-hidden="true">Liar</span>' : ''}
  </article>`;
}

// evidence, as a numbered tag on a string
function evidenceHTML(c, i, ctx) {
  const used = G.struck.includes(i), on = i === G.cur, [icon, label] = noteLabel(c), k = evidenceNo(i);
  return `<li class="ev${used ? ' used' : ''}${on ? ' on' : ''}" data-i="${i}">
    <button type="button" class="use" data-act="use" data-i="${i}" aria-pressed="${used}" aria-label="Evidence ${k}, ${used ? 'used' : 'not used yet'}"><span class="hole" aria-hidden="true"></span>${used ? penTick('t' + i) : `<span class="num">${k}</span>`}</button>
    <button type="button" class="evtext" data-act="pick-stmt" data-i="${i}" aria-current="${on}"><span class="evhead">${evIcon(icon)}${label}</span><span class="txt">${tokens(c.text, ctx)}</span>${G.mode === 'tutorial' && on ? tryLine(i) : ''}</button></li>`;
}

// the scene: a card for every weapon, room and (on Sundays) motive, with the facts the clues use
const chip = (icon, text) => `<li>${icon}${esc(text)}</li>`;
function weaponCardHTML(w, i) {
  return `<li class="tcard weapon" data-w="${i}"><span class="art">${weaponIcon(w, 'wi big')}</span>
    <div><b>${esc(w.name)}</b><span class="note">${esc(cap(w.note))}</span>
    <ul class="facts">${chip(glyph(w.type), KIND_WORD[w.type])}${chip(factIcon('weight'), cap(w.weight))}${chip(factIcon('material'), cap(w.material))}</ul></div></li>`;
}
function roomCardHTML(ctx, r) {
  const room = ctx.rooms[r], line = isLine(ctx);
  const where = line ? `${ordinal(roomOrder(ctx).indexOf(r) + 1)} from the engine` : floorLabel(ctx, ctx.floor[r]);
  return `<li class="tcard place${room.light === 'dark' ? ' dark' : ''}" data-room="${r}"><span class="art">${roomIcon(room, 'ri big')}</span>
    <div><b>${esc(room.name)}</b>
    <ul class="facts">${chip(factIcon('floor'), where)}${chip(factIcon(room.light), cap(LIGHT_WORD[room.light]))}</ul></div></li>`;
}
function motiveCardHTML(m, i) {
  return `<li class="tcard motive" data-m="${i}"><span class="art">${motiveIcon(m, 'mi big')}</span><div><b>${esc(m.name)}</b></div></li>`;
}
const ordinal = (k) => k + (['th', 'st', 'nd', 'rd'][(k % 100 >> 3) ^ 1 && k % 10] || 'th');

// the warm-up says what each statement asks of you
function tryLine(i) {
  return G.mode === 'tutorial' && WARM_TRY[i] ? `<span class="try">${WARM_TRY[i]}</span>` : '';
}

function caseHeadHTML() {
  const P = G.puzzle, ctx = P.ctx, w = ctx.world, tut = G.mode === 'tutorial', story = caseStory(w, P.story);
  const when = tut ? 'The warm-up' : G.day ? `${esc(dayName(G.day))} · No. ${G.day}${G.mode === 'daily' ? '' : ' · a past case'}` : 'A practice case';
  return `<header class="case-head band"><div class="wrap">
      <p class="kicker">${when}<span class="sep"></span><span aria-label="Difficulty ${TIER_LEVEL[P.tier]} of 4">${dayDots(P.tier)}</span><span class="sep"></span>${esc(w.name)}, ${w.year}</p>
      <div class="titlerow"><h1>${esc(P.title)}</h1>${tut ? '' : `<span class="filestamp" aria-hidden="true"><small>Case file</small>${G.day ? `No. ${G.day}` : 'Practice'}</span>`}</div>
      <p class="closed" id="closed-stamp">${G.solved ? 'Case closed' : ''}</p>
      ${tut ? warmHeadHTML() : ''}
      <div class="story">
        <p class="scene">${esc(story.occasion)} ${esc(story.found)}</p>
        <p class="victim"><span class="kicker">The victim</span> ${esc(story.victim.name)}, ${esc(story.victim.desc)}.</p>
      </div>
      ${malloryLine(story.mallory, 'mallory-line')}
      <p class="rule"><b>${cap(NUM_WORD[P.n])} ${w.guests}, ${NUM_WORD[P.n]} weapons, ${NUM_WORD[P.n]} ${unitOf(ctx)}s${ctx.motives ? `, ${NUM_WORD[P.n]} motives` : ''}.</b> Each had one weapon${ctx.motives ? ', one motive' : ''} and was in one ${unitOf(ctx)}. The evidence is true. Everyone tells the truth, <em>except the killer</em>.</p>
    </div></header>`;
}

function renderCase() {
  VIEW = 'case';
  const P = G.puzzle, ctx = P.ctx, tut = G.mode === 'tutorial';
  const mk = (v, k) => `<span class="mini">${penMark(v, k, 18)}</span>`;
  const dock = (p, label, icon) => `<button type="button" data-act="pane" data-pane="${p}" aria-pressed="${G.pane === p}">${icon}<span>${label}</span></button>`;
  app().innerHTML = `
    <div class="bar case-bar"><div class="wrap"><button class="wordmark" data-act="home" aria-label="Inquest: back to the cases">${SEAL}Inquest</button>
      ${tut ? '' : '<button class="navlink" data-act="hint">Hint</button>'}
      <button class="navlink" data-act="how">How to play</button>${themeButton()}
      <button class="btn red accuse" data-act="accuse">${G.solved && !tut ? 'The verdict' : 'Accuse'}</button></div></div>
    ${caseHeadHTML()}
    <main class="case wrap${ctx.motives ? ' motives' : ''}" id="case" data-pane="${G.pane}">
      <section class="col-clues pane" data-for="clues" aria-label="The clues">
        <div class="sec-head lead"><h2>The suspects</h2><p class="soft">One of them is lying.</p></div>
        <div class="suspects" id="suspects"></div>
        <div class="sec-head"><h2>The evidence</h2><p class="soft">All of it is true.</p></div>
        <ol class="evidence" id="evidence"></ol>
      </section>
      <section class="col-work">
        <div class="strip" id="strip"></div>
        <section class="notebook card pane" data-for="notebook" id="nb" data-tab="${G.tab}" aria-label="Notebook">
          <div class="nb-head"><h2>Notebook</h2>
            <p class="howmark">Tap once ${mk(1, 'leg-x')} to rule out, twice ${mk(2, 'leg-o')} for a match.</p></div>
          ${tut ? `<p class="wnote" aria-live="polite">${WARM.note}</p>` : ''}
          <div class="nb-bar"><div class="tabs" role="tablist" aria-label="Notebook blocks">
            <button type="button" role="tab" data-act="nbtab" data-tab="sw" aria-selected="${G.tab === 'sw'}">Who · What</button>
            <button type="button" role="tab" data-act="nbtab" data-tab="sr" aria-selected="${G.tab === 'sr'}">Who · Where</button>
            ${ctx.motives ? `<button type="button" role="tab" data-act="nbtab" data-tab="sm" aria-selected="${G.tab === 'sm'}">Who · Why</button>` : ''}
            <button type="button" role="tab" data-act="nbtab" data-tab="wr" aria-selected="${G.tab === 'wr'}">What · Where</button>
          </div>
          <div class="nbtools"><button type="button" class="link" data-act="undo" disabled>Undo</button><button type="button" class="link" data-act="clear">Clear all</button></div></div>
          <div class="tablewrap"><table class="grid" id="grid"></table></div>
        </section>
      </section>
      <section class="col-scene pane" data-for="scene" aria-label="The scene">
        <div class="sec-head"><h2>The weapons</h2></div>
        <ul class="tcards">${ctx.weapons.map(weaponCardHTML).join('')}</ul>
        <div class="sec-head"><h2>The ${unitOf(ctx)}s</h2></div>
        <ul class="tcards">${roomOrder(ctx).map((r) => roomCardHTML(ctx, r)).join('')}</ul>
        ${ctx.motives ? `<div class="sec-head"><h2>The motives</h2><p class="soft">One each.</p></div><ul class="tcards motives">${ctx.motives.map(motiveCardHTML).join('')}</ul>` : ''}
        <section class="map card" id="plan" aria-label="Map"></section>
      </section>
    </main>
    <nav class="dock" aria-label="Case">${dock('clues', 'Clues', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10l4 4v12H5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 11h8M8 15h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>')}
      ${dock('notebook', 'Notebook', '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 10h16M4 15h16M10 4v16M15 4v16" stroke="currentColor" stroke-width="1.4"/></svg>')}
      ${dock('scene', 'Scene', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="currentColor" stroke-width="1.4"/></svg>')}</nav>`;
  document.body.dataset.pane = G.pane;
  renderClues();
  buildGrid();
  buildPlan();
  paintAll();
  autoTab();
  applyFocus();
  fitGrid();
  if (document.fonts) document.fonts.ready.then(fitGrid);
  window.scrollTo(0, 0);
}

function renderClues() {
  const P = G.puzzle, ctx = P.ctx;
  const sus = document.getElementById('suspects');
  if (sus) sus.innerHTML = ctx.suspects.map((s, i) => suspectHTML(s, i, ctx)).join('');
  const ev = document.getElementById('evidence');
  if (ev) ev.innerHTML = P.clues.map((c, i) => (isSay(c) ? '' : evidenceHTML(c, i, ctx))).join('');
  renderStrip();
}
// the statement in hand, pinned above the notebook
function renderStrip() {
  const strip = document.getElementById('strip');
  if (!strip) return;
  const P = G.puzzle, ctx = P.ctx, i = G.cur, c = P.clues[i], say = isSay(c);
  const who = say ? `${face(ctx.suspects[c.speaker], 30)}<span><b>${esc(ctx.suspects[c.speaker].short)}</b> says</span>` : `${evIcon(noteLabel(c)[0])}<span><b>Evidence ${evidenceNo(i)}</b> · ${noteLabel(c)[1]}</span>`;
  strip.innerHTML = `<div class="nav"><span class="who">${who}</span>
      <button type="button" class="arrow" data-act="stmt-step" data-d="-1" aria-label="Previous statement">&lsaquo;</button>
      <button type="button" class="arrow" data-act="stmt-step" data-d="1" aria-label="Next statement">&rsaquo;</button></div>
    <p class="txt${say ? ' said' : ''}">${tokens(c.text, ctx)}</p>${G.mode === 'tutorial' ? `<p class="wnote" aria-live="polite">${WARM.note}</p>` : ''}`;
}

// Pick the statement in hand. The cards stay where they are (rebuilding them would replay their stamps and
// jolt the page): only the highlight moves, the warm-up's hint follows it, and the pinned copy changes.
function selectStatement(i) {
  G.cur = i;
  markCurrent();
  renderStrip();
  autoTab();
  applyFocus();
}
function markCurrent() {
  document.querySelectorAll('.suspect, .ev').forEach((el) => {
    const ci = el.classList.contains('ev') ? +el.dataset.i : G.puzzle.clues.findIndex((c) => c.speaker === +el.dataset.s);
    const on = ci === G.cur;
    el.classList.toggle('on', on);
    el.querySelectorAll('[aria-current]').forEach((b) => b.setAttribute('aria-current', String(on)));
    const t = el.querySelector('.try');
    if (t && !on) t.remove();
    if (on && !t && G.mode === 'tutorial') (el.querySelector('.body') || el.querySelector('.evtext')).insertAdjacentHTML('beforeend', tryLine(ci));
  });
}
// redraw one card in place (after a statement is marked, or a piece of evidence ticked)
function redrawCard(sel, html) {
  const el = document.querySelector(sel);
  if (el) el.outerHTML = html;
}
function stepStatement(d) {
  const len = G.puzzle.clues.length;
  selectStatement((G.cur + d + len) % len);
}
function toggleUsed(i) {
  const on = !G.struck.includes(i);
  G.struck = on ? G.struck.concat(i) : G.struck.filter((x) => x !== i);
  persist();
  redrawCard(`.ev[data-i="${i}"]`, evidenceHTML(G.puzzle.clues[i], i, G.puzzle.ctx));
  applyFocus();
}
// believe a statement, or call it a lie (pressing the same again clears it)
function setSay(s, v) {
  G.say[s] = G.say[s] === v ? 0 : v;
  persist();
  redrawCard(`.suspect[data-s="${s}"]`, suspectHTML(G.puzzle.ctx.suspects[s], s, G.puzzle.ctx));
  paintAll();
  applyFocus();
  if (G.mode === 'tutorial') warmSay(s, G.say[s]);
}
function setPane(p) {
  G.pane = p;
  document.body.dataset.pane = p;
  const m = document.getElementById('case');
  if (m) m.dataset.pane = p;
  document.querySelectorAll('[data-act="pane"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pane === p)));
  if (p === 'notebook') fitGrid();
  window.scrollTo(0, 0);
}

// light up everything the statement in hand talks about
function applyFocus() {
  document.querySelectorAll('.hl').forEach((e) => e.classList.remove('hl'));
  if (!G) return;
  const ctx = G.puzzle.ctx, f = clueFocus(G.puzzle.clues[G.cur]);
  const lit = (sel) => document.querySelectorAll(sel).forEach((e) => e.classList.add('hl'));
  f.s.forEach((s) => lit(`[data-row="s${s}"]`));
  const ws = f.w.concat(f.kind ? ctx.types.map((t, i) => (t === f.kind ? i : -1)).filter((i) => i >= 0) : []);
  ws.forEach((w) => { lit(`[data-col="w${w}"]`); lit(`.tcard[data-w="${w}"]`); });
  f.m.forEach((m) => { lit(`[data-col="m${m}"]`); lit(`.tcard[data-m="${m}"]`); });
  if (f.kind) lit(`[data-kind="${f.kind}"]`);
  const rs = f.r.concat(f.floor === null ? [] : ctx.floor.map((fl, i) => (fl === f.floor ? i : -1)).filter((i) => i >= 0));
  rs.forEach((r) => { lit(`[data-col="r${r}"]`); lit(`[data-row="r${r}"]`); lit(`[data-room="${r}"]`); });
  if (f.floor !== null) lit(`[data-floor="${f.floor}"]`);
  if (f.k) lit('[data-col="k"]');
  // on a phone only one block shows: a dot on the others when the statement is about them too
  const touches = { sw: ws.length > 0 || (f.s.length > 0 && !rs.length && !f.m.length), sr: rs.length > 0, sm: f.m.length > 0, wr: ws.length > 0 && rs.length > 0 };
  document.querySelectorAll('[data-act="nbtab"]').forEach((b) => b.classList.toggle('has-cue', b.dataset.tab !== G.tab && touches[b.dataset.tab]));
}
// a statement only about weapons (or only about rooms) turns the phone notebook to that block by itself
function autoTab() {
  if (WIDE.matches) return;
  const f = clueFocus(G.puzzle.clues[G.cur]);
  const w = f.w.length > 0 || !!f.kind, r = f.r.length > 0 || f.floor !== null;
  if (f.m.length && !w && !r) setTab('sm');
  else if (w && r && !f.s.length) setTab('wr');
  else if (w !== r) setTab(w ? 'sw' : 'sr');
}
