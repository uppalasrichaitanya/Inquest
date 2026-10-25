// ---- the map. It shows what "next to" means (a doorway or a stair between two rooms, a coupling between two
// carriages), drawn from the same adjacency the statements use (ctx.adj), so the picture can't disagree with the
// clues. As the notebook fills in, it becomes a board: each person's face appears in the room you have put them
// in, and each weapon where you have placed it.
const SVGNS = 'http://www.w3.org/2000/svg';
const svgText = (s) => esc(String(s).replace(/&shy;/g, ''));
// a room name that will not fit its room on a phone breaks where its short name allows: "Conser-" / "vatory"
function roomLabel(room, x, y, fs, width) {
  const parts = room.name.length * fs * 0.52 > width && room.short.includes('&shy;') ? room.short.split('&shy;') : null;
  if (!parts) return `<text class="room-name" x="${x}" y="${y}" style="font-size:${fs}px">${svgText(room.name)}</text>`;
  return `<text class="room-name" x="${x}" y="${y}" style="font-size:${fs}px"><tspan>${svgText(parts[0])}-</tspan><tspan x="${x}" dy="${fs * 1.1}">${svgText(parts[1])}</tspan></text>`;
}

function buildPlan() {
  const el = document.getElementById('plan');
  if (!el) return;
  const ctx = G.puzzle.ctx, w = ctx.world, line = isLine(ctx);
  const key = (line
    ? 'Carriages are <i>next to</i> each other when they are coupled together. A sealed carriage in between keeps them apart.'
    : 'Rooms are <i>next to</i> each other where a doorway or a stair joins them, upstairs and down included.') + ' Shaded rooms are dark. People and weapons appear here as you place them.';
  el.innerHTML = `<div class="nb-head"><h2>${esc(w.name)}</h2><p class="howmark">${key}</p></div>
    <div class="house" id="house">${line ? trainSVG(ctx) : houseSVG(ctx)}</div>`;
}

function houseSVG(ctx) {
  const w = ctx.world, narrow = PHONE.matches;
  const u = narrow ? 40 : 72, rowH = narrow ? 104 : 118, padL = narrow ? 0 : 128;
  const inPlay = new Map(ctx.roomIdx.map((wi, li) => [wi, li]));
  let cols = 0, rows = 0;
  w.rooms.forEach((r) => { cols = Math.max(cols, r.rect.x + r.rect.w); rows = Math.max(rows, r.rect.y + r.rect.h); });
  const box = (r) => ({ x: padL + r.rect.x * u, y: r.rect.y * rowH, w: r.rect.w * u, h: r.rect.h * rowH });
  const fs = narrow ? 11.5 : 14.5;
  let g = '';
  for (let y = 0; y < rows; y++) {
    const f = rows - 1 - y;
    if (!narrow) g += `<text class="floor-name" data-floor="${f}" x="0" y="${y * rowH + 24}">${svgText(cap(w.floors[f].replace(/^(in|on) the /, '')))}</text>`;
  }
  w.rooms.forEach((room, wi) => {
    const b = box(room), r = inPlay.get(wi);
    if (r === undefined) {
      g += `<rect class="ghost" x="${b.x + 3}" y="${b.y + 3}" width="${b.w - 6}" height="${b.h - 6}" rx="4"/><text class="ghost-name" x="${b.x + 10}" y="${b.y + 22}" style="font-size:${fs - 1}px">${svgText(room.name)}</text>`;
      return;
    }
    const is = narrow ? 20 : 30;
    g += `<g class="room${room.light === 'dark' ? ' dark' : ''}" data-room="${r}">
      <rect class="floorspace" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="url(#pt-${room.pattern})"/>
      <rect class="shade" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>
      <rect class="lit" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>
      <svg class="ricon" x="${b.x + b.w - is - (narrow ? 5 : 9)}" y="${b.y + (narrow ? 5 : 8)}" width="${is}" height="${is}" viewBox="0 0 24 24" fill="currentColor">${ROOM_ICONS[room.id] || ''}</svg>
      ${roomLabel(room, b.x + (narrow ? 6 : 10), b.y + (narrow ? 17 : 23), fs, b.w - 14)}
      <g class="occupants" data-occ="${r}" transform="translate(${b.x + (narrow ? 5 : 9)} ${b.y + b.h - (narrow ? 34 : 44)})"></g></g>`;
  });
  // walls on top of the rooms, then the openings cut into them
  w.rooms.forEach((room, wi) => { if (inPlay.has(wi)) { const b = box(room); g += `<rect class="wall" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>`; } });
  for (let i = 0; i < ctx.n; i++) for (let j = i + 1; j < ctx.n; j++) {
    if (!ctx.adj[i][j]) continue;
    const a = box(ctx.rooms[i]), b = box(ctx.rooms[j]);
    if (a.y === b.y) { // side by side: a doorway in the shared wall
      const x = a.x + a.w === b.x ? b.x : a.x, ym = a.y + a.h / 2;
      g += `<line class="door" x1="${x}" y1="${ym - 15}" x2="${x}" y2="${ym + 15}"/><path class="swing" d="M${x} ${ym - 15}A30 30 0 0 1 ${x + 15} ${ym + 11}"/>`;
    } else { // one above the other: a stair through the floor, near the right end of the overlap
      const top = a.y < b.y ? a : b, bot = a.y < b.y ? b : a;
      const hi = Math.min(top.x + top.w, bot.x + bot.w), mx = hi - (narrow ? 16 : 26), y = bot.y;
      g += `<line class="door" x1="${mx - 13}" y1="${y}" x2="${mx + 13}" y2="${y}"/><path class="stair" d="M${mx - 10} ${y + 10}h6.5v-6.5h6.5v-6.5h6.5v-6.5"/>`;
    }
  }
  const W = padL + cols * u, H = rows * rowH;
  return `<svg class="plan-svg${narrow ? ' narrow' : ''}" viewBox="-3 -3 ${W + 6} ${H + 6}" role="img" aria-label="Plan of ${esc(w.name)}">${g}</svg>`;
}

function trainSVG(ctx) {
  const w = ctx.world, narrow = PHONE.matches;
  const W = narrow ? 340 : 600, rowH = narrow ? 66 : 70, h = rowH - 16, top = 46;
  const inPlay = new Map(ctx.roomIdx.map((wi, li) => [wi, li]));
  const order = w.rooms.map((r, wi) => wi).sort((a, b) => w.rooms[a].rect.x - w.rooms[b].rect.x);
  // the engine, then the carriages from the front back
  let g = `<g class="engine"><path d="M${W / 2 - 70} 34V14a8 8 0 0 1 8-8h70v-4h14v4h40a8 8 0 0 1 8 8v20Z"/><circle cx="${W / 2 - 46}" cy="36" r="6"/><circle cx="${W / 2 - 10}" cy="36" r="6"/><circle cx="${W / 2 + 26}" cy="36" r="6"/></g>
    <text class="floor-name" x="0" y="22">The engine</text>`;
  order.forEach((wi, k) => {
    const room = w.rooms[wi], r = inPlay.get(wi), y = top + k * rowH;
    g += `<line class="coupling" x1="${W / 2}" y1="${y - 16}" x2="${W / 2}" y2="${y}"/>`;
    if (r === undefined) {
      g += `<rect class="ghost" x="3" y="${y + 3}" width="${W - 6}" height="${h - 6}" rx="8"/><text class="ghost-name" x="14" y="${y + h / 2 + 5}">${svgText(room.name)}, sealed</text>`;
      return;
    }
    g += `<g class="room${room.light === 'dark' ? ' dark' : ''}" data-room="${r}">
      <rect class="floorspace" x="0" y="${y}" width="${W}" height="${h}" rx="8" fill="url(#pt-${room.pattern})"/><rect class="shade" x="0" y="${y}" width="${W}" height="${h}" rx="8"/><rect class="lit" x="0" y="${y}" width="${W}" height="${h}" rx="8"/>
      <svg class="ricon" x="${W - (narrow ? 34 : 44)}" y="${y + (h - (narrow ? 22 : 28)) / 2}" width="${narrow ? 22 : 28}" height="${narrow ? 22 : 28}" viewBox="0 0 24 24" fill="currentColor">${ROOM_ICONS[room.id] || ''}</svg>
      <rect class="wall" x="0" y="${y}" width="${W}" height="${h}" rx="8"/>
      <text class="room-name" x="14" y="${y + h / 2 + 5}" style="font-size:${narrow ? 13 : 15}px">${svgText(room.name)}</text>
      <g class="occupants" data-occ="${r}" transform="translate(${narrow ? 128 : 220} ${y + (h - 30) / 2})"></g></g>`;
  });
  const H = top + order.length * rowH - 16;
  return `<svg class="plan-svg train${narrow ? ' narrow' : ''}" viewBox="-3 -3 ${W + 6} ${H + 6}" role="img" aria-label="${esc(w.name)}, from the engine back">${g}</svg>`;
}

// who and what is in each room, as the notebook has it so far: faces for people, icons for weapons
function paintMap(d) {
  const ctx = G.puzzle.ctx, yes = (v) => v === 2 || v === 4, narrow = PHONE.matches, sz = narrow ? 26 : 32, gap = 4;
  document.querySelectorAll('[data-occ]').forEach((p) => {
    const r = +p.dataset.occ;
    const who = ctx.suspects.map((s, i) => i).filter((s) => yes(d.sr[s][r]));
    const what = ctx.weapons.map((w, i) => i).filter((w) => yes(d.wr[w][r]));
    let x = 0, out = '';
    for (const s of who) {
      const S = ctx.suspects[s];
      out += `<g transform="translate(${x} 0)"><title>${esc(S.name)}</title><circle cx="${sz / 2}" cy="${sz / 2}" r="${sz / 2}" style="fill:hsl(${S.hue} 42% var(--face-l))"/><svg x="0" y="0" width="${sz}" height="${sz}" viewBox="7 3 50 50"><clipPath id="clip${r}-${s}"><circle cx="32" cy="28" r="25"/></clipPath><g clip-path="url(#clip${r}-${s})">${portraitSVG(S).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g></svg><circle class="pin-ring" cx="${sz / 2}" cy="${sz / 2}" r="${sz / 2 - .5}"/></g>`;
      x += sz + gap;
    }
    for (const w of what) {
      out += `<g transform="translate(${x} 0)" class="pin-w"><title>${esc(ctx.weapons[w].name)}</title><circle cx="${sz / 2}" cy="${sz / 2}" r="${sz / 2}"/><svg x="${sz * 0.18}" y="${sz * 0.18}" width="${sz * 0.64}" height="${sz * 0.64}" viewBox="0 0 24 24" fill="currentColor">${WEAPON_ICONS[ctx.weapons[w].id]}</svg></g>`;
      x += sz + gap;
    }
    p.innerHTML = out;
  });
  // the scene of the crime, once the case is closed
  const s = G.puzzle.solution;
  document.querySelectorAll('.room').forEach((el) => el.classList.toggle('scene', G.solved && G.mode !== 'tutorial' && +el.dataset.room === s.room));
}
