// ---- the floor plan. It shows what "next to" means (a doorway or a stair between two rooms, a coupling between
// two carriages), drawn from the same adjacency the statements use (ctx.adj), so the picture can't disagree with
// the clues. Each room carries a row of weapon chips: which weapon was in which room is worked out here, where
// the doors are. Wide screens mark the chips directly; on a phone a tap on a room opens its weapons at full size.
// "Show as a table" swaps the plan for the same marks as a plain rooms-by-weapons table.
const SVGNS = 'http://www.w3.org/2000/svg';
const svgText = (s) => esc(String(s).replace(/&shy;/g, ''));
// a room name that will not fit its room on a phone breaks where its short name allows: "Conser-" / "vatory"
function roomLabel(room, x, y, fs, width) {
  const parts = room.name.length * fs * 0.5 > width && room.short.includes('&shy;') ? room.short.split('&shy;') : null;
  if (!parts) return `<text class="room-name" x="${x}" y="${y}" style="font-size:${fs}px">${svgText(room.name)}</text>`;
  return `<text class="room-name" x="${x}" y="${y}" style="font-size:${fs}px"><tspan>${svgText(parts[0])}-</tspan><tspan x="${x}" dy="${fs * 1.1}">${svgText(parts[1])}</tspan></text>`;
}

function buildPlan() {
  const el = document.getElementById('plan');
  if (!el) return;
  const ctx = G.puzzle.ctx, w = ctx.world, line = isLine(ctx), table = G.wrView === 'table';
  const unit = line ? 'carriage' : 'room';
  const key = table
    ? `Which weapon was in which ${unit}. A square fills in by itself once you have circled a person's weapon and their ${unit}.`
    : line
      ? `Carriages are <i>next to</i> each other when they are coupled together. A sealed carriage in between keeps them apart. The engine is at the top. Each carriage lists the weapons that could have been in it.`
      : `Rooms are <i>next to</i> each other where a doorway or a stair joins them, upstairs and down included. Each room lists the weapons that could have been in it.`;
  el.innerHTML = `<div class="nb-head"><p class="label">${esc(w.name)}</p>
      <button type="button" class="quiet" data-act="wrview">${table ? 'Show on the plan' : 'Show as a table'}</button></div>
    <p class="plan-key">${key}<span class="tapnote"> Tap a ${unit} to mark its weapons.</span></p>
    <div class="house" id="house">${table ? wrTableHTML(ctx) : line ? trainSVG(ctx) : manorSVG(ctx)}</div>`;
}

// weapon chips for one room: small marked squares, drawn with their kind
function chipsSVG(ctx, r, x0, y0, cs, gap, perRow) {
  return weaponOrder(ctx).map((w, k) => {
    const x = x0 + (k % perRow) * (cs + gap), y = y0 + Math.floor(k / perRow) * (cs + gap);
    return `<g class="cell chip" transform="translate(${x} ${y})" data-b="wr" data-i="${w}" data-j="${r}" data-v="-1" data-cs="${cs}" data-label="${esc(`The ${ctx.weapons[w].name} in the ${ctx.rooms[r].name}`)}" aria-hidden="true">
      <rect width="${cs}" height="${cs}"/><use href="#k-${ctx.types[w]}" x="${cs * 0.2}" y="${cs * 0.2}" width="${cs * 0.6}" height="${cs * 0.6}"/><g class="mk"></g></g>`;
  }).join('');
}

function manorSVG(ctx) {
  const w = ctx.world, narrow = PHONE.matches;
  const u = narrow ? 38 : 70, rowH = narrow ? 92 : 100, padL = narrow ? 0 : 96;
  const inPlay = new Map(ctx.roomIdx.map((wi, li) => [wi, li]));
  let cols = 0, rows = 0;
  w.rooms.forEach((r) => { cols = Math.max(cols, r.rect.x + r.rect.w); rows = Math.max(rows, r.rect.y + r.rect.h); });
  const box = (r) => ({ x: padL + r.rect.x * u, y: r.rect.y * rowH, w: r.rect.w * u, h: r.rect.h * rowH });
  const fs = narrow ? 11 : 14, cs = narrow ? 11 : 18, gap = narrow ? 1.5 : 3;
  let g = '';
  if (!narrow) for (let y = 0; y < rows; y++) g += `<text class="floor-name" x="0" y="${y * rowH + 22}">${svgText(cap(w.floors[rows - 1 - y].replace(/^(in|on) the /, '')))}</text>`;
  w.rooms.forEach((room, wi) => {
    const b = box(room), r = inPlay.get(wi);
    if (r === undefined) {
      g += `<rect class="ghost" x="${b.x + 3}" y="${b.y + 3}" width="${b.w - 6}" height="${b.h - 6}"/><text class="ghost-name" x="${b.x + 9}" y="${b.y + 20}" style="font-size:${fs}px">${svgText(room.name)}</text>`;
      return;
    }
    const perRow = Math.max(1, Math.floor((b.w - 12 + gap) / (cs + gap))), chipRows = Math.ceil(ctx.n / perRow);
    g += `<g class="room" data-room="${r}" role="button" tabindex="0" aria-label="${esc(room.name)}: mark its weapons">
      <rect class="floorspace" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>
      ${roomLabel(room, b.x + (narrow ? 5 : 9), b.y + (narrow ? 16 : 21), fs, b.w - (narrow ? 12 : 18))}
      <g class="pins" data-pins="${r}" transform="translate(${b.x + (narrow ? 5 : 9)} ${b.y + (narrow ? 42 : 44)})"></g>
      ${chipsSVG(ctx, r, b.x + 6, b.y + b.h - 7 - chipRows * (cs + gap) + gap, cs, gap, perRow)}</g>`;
  });
  // walls on top of the rooms, then the openings cut into them
  w.rooms.forEach((room, wi) => { if (inPlay.has(wi)) { const b = box(room); g += `<rect class="wall" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>`; } });
  for (let i = 0; i < ctx.n; i++) for (let j = i + 1; j < ctx.n; j++) {
    if (!ctx.adj[i][j]) continue;
    const a = box(ctx.rooms[i]), b = box(ctx.rooms[j]);
    if (a.y === b.y) { // side by side: a doorway in the shared wall
      const x = a.x + a.w === b.x ? b.x : a.x, ym = a.y + a.h / 2;
      g += `<line class="door" x1="${x}" y1="${ym - 13}" x2="${x}" y2="${ym + 13}"/>`;
    } else { // one above the other: a stair through the floor, near the right end of the overlap
      const top = a.y < b.y ? a : b, bot = a.y < b.y ? b : a;
      const hi = Math.min(top.x + top.w, bot.x + bot.w), mx = hi - (narrow ? 14 : 22), y = bot.y;
      g += `<line class="door" x1="${mx - 12}" y1="${y}" x2="${mx + 12}" y2="${y}"/><path class="stair" d="M${mx - 9} ${y + 9}h6v-6h6v-6h6v-6"/>`;
    }
  }
  const W = padL + cols * u, H = rows * rowH;
  return `<svg class="plan-svg${narrow ? ' narrow' : ''}" viewBox="-2 -2 ${W + 4} ${H + 4}" role="group" aria-label="Plan of ${esc(w.name)}">${g}</svg>`;
}

function trainSVG(ctx) {
  const w = ctx.world, narrow = PHONE.matches;
  const W = narrow ? 340 : 640, rowH = narrow ? 62 : 58, h = rowH - 14, top = 30, cs = narrow ? 14 : 18, gap = narrow ? 2 : 3;
  const inPlay = new Map(ctx.roomIdx.map((wi, li) => [wi, li]));
  const order = w.rooms.map((r, wi) => wi).sort((a, b) => w.rooms[a].rect.x - w.rooms[b].rect.x);
  let g = `<text class="floor-name" x="0" y="16">The engine</text><path class="stair" d="M${W / 2 - 40} ${top - 4}h80"/>`;
  order.forEach((wi, k) => {
    const room = w.rooms[wi], r = inPlay.get(wi), y = top + k * rowH;
    if (k) g += `<line class="coupling" x1="${W / 2}" y1="${y - 14}" x2="${W / 2}" y2="${y}"/>`;
    if (r === undefined) {
      g += `<rect class="ghost" x="3" y="${y + 3}" width="${W - 6}" height="${h - 6}"/><text class="ghost-name" x="12" y="${y + h / 2 + 5}">${svgText(room.name)}, sealed</text>`;
      return;
    }
    const chipsW = ctx.n * (cs + gap) - gap;
    g += `<g class="room" data-room="${r}" role="button" tabindex="0" aria-label="${esc(room.name)}: mark its weapons">
      <rect class="floorspace" x="0" y="${y}" width="${W}" height="${h}"/><rect class="wall" x="0" y="${y}" width="${W}" height="${h}" rx="6"/>
      <text class="room-name" x="12" y="${y + (narrow ? 18 : h / 2 + 5)}" style="font-size:${narrow ? 13 : 15}px">${svgText(room.name)}</text>
      <g class="pins" data-pins="${r}" transform="translate(${narrow ? 12 : W * 0.36} ${y + (narrow ? 36 : h / 2 - 4)})"></g>
      ${chipsSVG(ctx, r, W - 10 - chipsW, y + (h - cs) / 2, cs, gap, ctx.n)}</g>`;
  });
  const H = top + order.length * rowH - 14;
  return `<svg class="plan-svg train${narrow ? ' narrow' : ''}" viewBox="-2 -2 ${W + 4} ${H + 4}" role="group" aria-label="${esc(w.name)}, from the engine back">${g}</svg>`;
}

// who is placed in each room: once a person's room is circled, their name appears there
function paintPins(d) {
  const ctx = G.puzzle.ctx;
  document.querySelectorAll('[data-pins]').forEach((p) => {
    const r = +p.dataset.pins, who = ctx.suspects.map((s, i) => i).filter((s) => d.sr[s][r] === 2 || d.sr[s][r] === 4);
    p.innerHTML = who.map((s, k) => `<g transform="translate(0 ${k * 15})"><circle cx="4" cy="-4" r="4" style="fill:hsl(${ctx.suspects[s].hue} 34% 52%)"/><text class="pin" x="12" y="0">${esc(ctx.suspects[s].short)}</text></g>`).join('');
  });
}

// the fallback: the same marks as a rooms-by-weapons table
function wrTableHTML(ctx) {
  const WO = weaponOrder(ctx);
  let h = `<table class="grid wr"><thead><tr class="names"><td class="corner"><span class="sr">${isLine(ctx) ? 'Carriage' : 'Room'}</span></td>`;
  h += WO.map((w) => `<th scope="col" class="c" data-col="w${w}" title="${esc(ctx.weapons[w].name)}">${glyph(ctx.types[w])}<span>${shortName(ctx.weapons[w])}</span></th>`).join('') + '</tr></thead><tbody>';
  roomOrder(ctx).forEach((r, row) => {
    h += `<tr><th scope="row" data-row="r${r}"><span class="who">${esc(ctx.rooms[r].name)}</span></th>`;
    h += WO.map((w, c) => cellHTML('wrt', 'wr', w, r, `The ${ctx.weapons[w].name} in the ${ctx.rooms[r].name}`, row, c, '', `w${w}`)).join('') + '</tr>';
  });
  return h + '</tbody></table>';
}

// a room's weapons at full size: the phone's way to work the plan, and the keyboard's
function openRoomSheet(r) {
  const ctx = G.puzzle.ctx, room = ctx.rooms[r], unit = isLine(ctx) ? 'carriage' : 'room';
  const rows = weaponOrder(ctx).map((w, k) => `<li><button type="button" class="cell" data-grid="room" data-r="${k}" data-c="0" data-b="wr" data-i="${w}" data-j="${r}" data-v="-1" data-label="${esc(`The ${ctx.weapons[w].name} in the ${room.name}`)}" tabindex="${k ? -1 : 0}"></button>
    <span class="wname">${glyph(ctx.types[w])}${esc(ctx.weapons[w].name)} <i>${KIND_WORD[ctx.types[w]].toLowerCase()}</i></span></li>`).join('');
  openModal(`<h2>${esc(room.name)}</h2><p class="soft">Which weapon was in this ${unit}? Tap once to rule one out, twice for the one that was.</p>
    <ul class="wr-list">${rows}</ul><div class="actions"><button type="button" class="btn" data-act="close">Done</button></div>`, 'roomsheet');
  paintAll();
}
