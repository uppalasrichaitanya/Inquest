function noteLabel(c) {
  if (c.type === 'murderType' || c.type === 'murderNotType') return 'Coroner';
  if (c.type === 'murderNotWeapon') return 'Forensics';
  if (c.type === 'murderNotSuspect') return 'Inspector Mallory';
  if (c.type.startsWith('murder')) return 'Police report';
  return 'Case notes';
}

function statementHTML(c, i, ctx) {
  const say = c.voice === 'say';
  const who = say ? `${seal(ctx.suspects[c.speaker])}${esc(ctx.suspects[c.speaker].name)}` : esc(noteLabel(c));
  const body = tokens(c.text, ctx);
  const struck = G.struck.includes(i) ? '1' : '0';
  return `<li class="stmt ${say ? '' : 'note'}" data-i="${i}" data-struck="${struck}">
    <button type="button" aria-pressed="${struck === '1'}" aria-label="Statement ${i + 1}, tap to strike through">
      <span class="no" aria-hidden="true">${i + 1}</span>
      <span><span class="who">${who}</span><span class="body"><span class="txt">${say ? '&ldquo;' + body + '&rdquo;' : body}</span></span></span>
    </button></li>`;
}

// a crossed square, a circled square and a faint auto-cross, drawn exactly as the notebook draws them
const mini = (v) => `<span class="mk mini" data-v="${v}" aria-hidden="true"></span>`;

function renderCase() {
  VIEW = 'case';
  const P = G.puzzle, ctx = P.ctx, w = ctx.world;
  const tut = G.mode === 'tutorial';
  const num = G.mode === 'daily' ? dayNumber() : null;
  const easy = tut || P.n <= 4;
  const cast = ctx.suspects.map((s) => `<li>${seal(s)} <b>${esc(s.name)}</b>, ${esc(s.role)}</li>`).join('');
  const evid = ctx.weapons.map((x) => `<li>${glyph(x.type)} <b>${esc(x.name)}</b> <span class="kind">${esc(WEAPON_TYPES[x.type].label)}</span>, ${esc(x.note)}</li>`).join('');
  const fileNo = tut ? 'Training case' : num ? 'Case No. ' + num : 'Cold case';
  app().innerHTML = `
    <div class="bar">
      <button class="mark" data-act="home" aria-label="Back to the cases">Inquest</button>
      <span class="mid">${esc(P.title)}</span>
      <span class="clock" id="clock" aria-label="Time on this case">${fmtTime(G.elapsed)}</span>
      <button class="tool jump" data-act="jump">Notebook</button>
      ${tut ? '' : '<button class="tool" data-act="hint">Hint</button>'}
      <button class="tool go" data-act="accuse">Accuse</button>
    </div>
    <div class="case">
      <section class="dossier paper" aria-label="Case file">
        <div class="file-no"><span>${fileNo}, ${esc(P.tierName)} <span class="stars" aria-label="Difficulty ${P.rating} of 5">${stars(P.rating)}</span></span><span>${esc(w.name)}, ${w.year}</span></div>
        <div id="closed-stamp">${G.solved ? '<span class="stamp on-file">Case closed</span>' : ''}</div>
        <h2>${esc(P.title)}</h2>
        <p class="scene">${w.scene.map(esc).join(' ')}</p>
        <p class="victim"><b>${esc(w.victim.name)}</b>, ${esc(w.victim.desc)}, is dead. ${ctx.n} people were there. One of them did it.</p>
        <p class="rules-line"><b>The rules.</b> Each suspect was in a different ${w.layoutKind === 'line' ? 'carriage' : 'room'}, holding a different weapon. Every statement is true. The killer held the murder weapon where the body was found.</p>
        <h3>Statements <small>${P.clues.length} on file. Tap one to strike it out when you have used it.</small></h3>
        <ol class="stmts" id="stmts">${P.clues.map((c, i) => statementHTML(c, i, ctx)).join('')}</ol>
        <details class="rules" ${easy ? 'open' : ''}><summary>Who was there (${ctx.n})</summary><ul>${cast}</ul></details>
        <details class="rules" id="evidence" ${easy ? 'open' : ''}><summary>What was found (${ctx.n})</summary><ul>${evid}</ul></details>
      </section>
      <section aria-label="Working notes">
        <div class="notebook paper" id="nb">
          <div class="nb-head"><h3>Notebook</h3>
            <div class="nb-view" role="group" aria-label="Notebook layout">
              <button type="button" data-act="nbview" data-v="one" aria-pressed="${G.view !== 'all'}">One block</button><button type="button" data-act="nbview" data-v="all" aria-pressed="${G.view === 'all'}">All three</button>
            </div></div>
          <p class="nb-legend">${mini(1)} ruled out <span class="dot">&middot;</span> ${mini(2)} a match <span class="dot">&middot;</span> ${mini(3)} crossed for you<br><span class="soft">Tap a square once to cross it out, twice to circle it, a third time to clear it.</span></p>
          <div class="nb-tabs" id="nb-tabs" role="tablist" aria-label="Notebook blocks">
            ${['sw', 'sr', 'wr'].map((b, k) => `<button type="button" role="tab" data-tab="${b}"><span class="tn">${k + 1}</span><span class="tl">${BLOCKS[b].name}</span><span class="tp" id="tp-${b}"></span></button>`).join('')}
          </div>
          <p class="nb-note" id="nb-note"></p>
          <div class="gridwrap"><div class="lg" id="lg"></div></div>
          <details class="nb-set"><summary>Notebook settings</summary>
            <label><input type="checkbox" id="opt-cross" ${G.opts.cross ? 'checked' : ''}> When I circle a match, cross out the rest of its row and column</label>
            <label><input type="checkbox" id="opt-chain" ${G.opts.chain ? 'checked' : ''}> Also fill in what follows between blocks (for example, a person's weapon and room tell you where that weapon was)</label>
            <p class="soft">Drag with a mouse to mark several squares at once. Arrow keys move between squares.</p>
          </details>
        </div>
        <div class="plan" id="plan"></div>
      </section>
    </div>`;
  buildGrid();
  buildPlan();
  paintAll();
  wireGrid();
  window.scrollTo(0, 0);
}

// ---- the floor plan
function wrapLabel(name, max) {
  const words = name.split(' '), lines = [''];
  words.forEach((w) => { const l = lines[lines.length - 1]; if ((l + ' ' + w).trim().length > max && l) lines.push(w); else lines[lines.length - 1] = (l + ' ' + w).trim(); });
  return lines;
}

function buildPlan() {
  const ctx = G.puzzle.ctx, w = ctx.world, el = document.getElementById('plan');
  const inPlay = new Map(ctx.roomIdx.map((wi, li) => [wi, li]));
  let u, rowH, padL, padT, maxX = 0, maxY = 0;
  w.rooms.forEach((r) => { maxX = Math.max(maxX, r.rect.x + r.rect.w); maxY = Math.max(maxY, r.rect.y + r.rect.h); });
  const line = w.layoutKind === 'line';
  const narrow = el.clientWidth > 0 && el.clientWidth < 520;
  if (line && narrow) return buildTrainColumn(ctx, el, inPlay);
  u = line ? 82 : 62; rowH = line ? 78 : 64; padL = line ? 74 : 98; padT = line ? 20 : 30;
  const W = padL + maxX * u + 14, H = padT + maxY * rowH + (line ? 40 : 16);
  const rooms = w.rooms.map((r, wi) => {
    const li = inPlay.get(wi), on = li !== undefined;
    const x = padL + r.rect.x * u + 2, y = padT + r.rect.y * rowH + 2, rw = r.rect.w * u - 4, rh = r.rect.h * rowH - 4;
    const lines = wrapLabel(r.name, Math.max(8, Math.floor(rw / 7.4)));
    const text = lines.map((t, k) => `<text x="${x + 8}" y="${y + 18 + k * 14}">${esc(t)}</text>`).join('');
    const rx = line ? 7 : 2;
    return `<g class="room ${on ? '' : 'off'}" ${on ? `data-ent="r${li}"` : ''} data-x="${x}" data-y="${y}" data-w="${rw}" data-h="${rh}"><rect x="${x}" y="${y}" width="${rw}" height="${rh}" rx="${rx}"/>${text}${on ? '' : `<text x="${x + 8}" y="${y + rh - 8}" style="font-size:10px">${line ? 'sealed' : 'locked'}</text>`}</g>`;
  }).join('');
  let extra = '';
  if (line) {
    const y = padT + rowH - 2;
    extra += `<path d="M${padL - 6} ${padT + 8} h-44 l-8 ${rowH - 18} h52z" fill="rgba(207,226,240,.16)" stroke="#cfe2f0" stroke-width="1.5"/><text class="ahead" x="6" y="${padT + rowH + 22}">engine</text>`;
    for (let i = 0; i < maxX; i++) extra += `<circle cx="${padL + i * u + 18}" cy="${y + 8}" r="5" fill="none" stroke="#cfe2f0" stroke-width="1.4"/><circle cx="${padL + i * u + u - 18}" cy="${y + 8}" r="5" fill="none" stroke="#cfe2f0" stroke-width="1.4"/>`;
    extra += `<line x1="${padL - 6}" y1="${y + 14}" x2="${padL + maxX * u}" y2="${y + 14}" stroke="#cfe2f0" stroke-width="1.4"/>`;
  } else {
    for (let f = 0; f <= 2; f++) extra += `<text class="floorlbl" x="4" y="${padT + (2 - f) * rowH + 22}">${['Cellar', 'Ground floor', 'Upstairs'][f]}</text>`;
    extra += `<path d="M${padL - 6} ${padT - 2} L${padL + maxX * u / 2} ${padT - 22} L${padL + maxX * u + 6} ${padT - 2}" fill="none" stroke="#cfe2f0" stroke-width="1.5" opacity=".6"/>`;
  }
  const legend = line
    ? '"Next to" means carriages coupled together. The engine is at the front. Sealed carriages are not part of this case.'
    : '"Next to" means rooms that share a wall, or sit directly above or below each other. Locked rooms are not part of this case.';
  el.innerHTML = `<h3>${esc(w.name)}, as it stood</h3>
    <p class="plan-key">${legend} Circle a match in the notebook and it appears here.</p>
    <div class="planwrap ${narrow ? 'scroll' : ''}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Plan of ${esc(w.name)}"><defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#cfe2f0" stroke-opacity=".25" stroke-width="2"/></pattern></defs>${extra}${rooms}<g id="pins"></g></svg></div>${narrow ? '<p class="swipe">Swipe the plan sideways to see the whole house.</p>' : ''}`;
}

// On a phone the train is drawn top to bottom, engine first, so the carriage names stay readable.
function buildTrainColumn(ctx, el, inPlay) {
  const w = ctx.world, W = 340, x = 8, rw = W - 16, rowH = 50, top = 44;
  const order = w.rooms.map((r, wi) => wi).sort((a, b) => w.rooms[a].rect.x - w.rooms[b].rect.x);
  let svg = `<path d="M${x + 40} ${top - 8} h${rw - 80} l-16 -28 h${-(rw - 112)}z" fill="rgba(207,226,240,.16)" stroke="#cfe2f0" stroke-width="1.5"/><text class="ahead" x="${W / 2}" y="${top - 18}" text-anchor="middle">engine (front)</text>`;
  order.forEach((wi, k) => {
    const r = w.rooms[wi], li = inPlay.get(wi), on = li !== undefined;
    const y = top + k * rowH, rh = rowH - 10;
    if (k) svg += `<line x1="${W / 2}" y1="${y - 10}" x2="${W / 2}" y2="${y}" stroke="#cfe2f0" stroke-width="2"/>`;
    svg += `<g class="room ${on ? '' : 'off'}" ${on ? `data-ent="r${li}"` : ''} data-lay="row" data-x="${x}" data-y="${y}" data-w="${rw}" data-h="${rh}"><rect x="${x}" y="${y}" width="${rw}" height="${rh}" rx="7"/><text class="big" x="${x + 12}" y="${y + rh / 2 + 5}">${esc(r.name)}${on ? '' : ' (sealed)'}</text></g>`;
  });
  const H = top + order.length * rowH;
  el.innerHTML = `<h3>${esc(w.name)}, as it stood</h3>
    <p class="plan-key">"Next to" means carriages coupled together. The engine is at the front. Sealed carriages are not part of this case. Circle a match in the notebook and it appears here.</p>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Plan of ${esc(w.name)}, front to back"><defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#cfe2f0" stroke-opacity=".25" stroke-width="2"/></pattern></defs>${svg}<g id="pins"></g></svg>`;
}

function paintPlan() {
  const ctx = G.puzzle.ctx, n = ctx.n, d = derive(G.marks, n, G.opts);
  const pins = document.getElementById('pins');
  if (!pins) return;
  const yes = (v) => v === 2 || v === 4;
  let out = '';
  for (let r = 0; r < n; r++) {
    const g = document.querySelector(`#plan .room[data-ent="r${r}"]`);
    if (!g) continue;
    const gx = +g.dataset.x, gy = +g.dataset.y, gw = +g.dataset.w, gh = +g.dataset.h;
    const row = g.dataset.lay === 'row'; // phone train: pins sit on the right, in a line
    let k = 0;
    for (let s = 0; s < n; s++) if (yes(d.sr[s][r])) {
      const cx = row ? gx + gw - 20 - k * 26 : gx + 20 + k * 24, cy = row ? gy + gh / 2 : gy + gh - 20; k++;
      const su = ctx.suspects[s];
      out += `<g class="pin"><title>${esc(su.name)}</title><circle cx="${cx}" cy="${cy}" r="10.5" fill="hsl(${su.hue} 50% 38%)" stroke="#f3e6d2" stroke-width="1.2"/><text x="${cx}" y="${cy + 3.5}">${initials(su.name)}</text></g>`;
    }
    // a weapon placed in this room, directly or through the person holding it
    let q = 0;
    for (let w = 0; w < n; w++) {
      const there = yes(d.wr[w][r]) || [...Array(n).keys()].some((s) => yes(d.sr[s][r]) && yes(d.sw[s][w]));
      if (!there) continue;
      const x = row ? gx + gw - 20 - Math.max(k, 1) * 26 - 16 - q * 26 : gx + gw - 30 - q * 24, y = row ? gy + gh / 2 - 11 : gy + gh - 31; q++;
      out += `<g class="wpin"><title>${esc(ctx.weapons[w].name)}</title><rect x="${x}" y="${y}" width="22" height="22" rx="3"/><use href="#k-${ctx.types[w]}" x="${x + 3}" y="${y + 3}" width="16" height="16"/></g>`;
    }
  }
  pins.innerHTML = out;
}
