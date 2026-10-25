// ---- the art: suspect portraits, weapon icons and floor patterns, all drawn as inline SVG.
// Portraits are built from a suspect's look (skin, hairstyle, accessories) and their traits (hair colour),
// so the card shows exactly what the evidence talks about.
const HAIR_COLOUR = { dark: '#2B201B', fair: '#D8B068', red: '#B04A26', grey: '#A9A49B' };
const EYE_COLOUR = { blue: '#3D74B8', brown: '#6B4126', green: '#3F8D57', grey: '#7F8C95' };

function portraitSVG(s, cls) {
  const L = s.look, hair = HAIR_COLOUR[s.traits.hair], skin = L.skin, acc = new Set(L.acc), st = L.hair;
  const coat = `hsl(${s.hue} 32% 30%)`, shirt = `hsl(${s.hue} 30% 88%)`;
  const back = [], front = [], over = [];
  // hair behind the head
  if (st === 'bob') back.push(`<path d="M19 41C17 26 22 15.5 32 15.5S47 26 45 41H40V27C36 24 28 24 24 27V41Z" fill="${hair}"/>`);
  if (st === 'long') back.push(`<path d="M17.5 53C14.5 31 20 15 32 15S49.5 31 46.5 53Z" fill="${hair}"/>`);
  if (st === 'bun') back.push(`<circle cx="32" cy="14.2" r="5.6" fill="${hair}"/>`);
  if (st === 'curly') back.push(`<circle cx="20.5" cy="33" r="3.8" fill="${hair}"/><circle cx="43.5" cy="33" r="3.8" fill="${hair}"/>`);
  // hair on top of the head
  if (st === 'short') front.push(`<path d="M21 30C20.5 19 26.5 16.5 32 16.5S43.5 19 43 30C41.5 24.5 37.5 22 32 22S22.5 24.5 21 30Z" fill="${hair}"/>`);
  if (st === 'slick') front.push(`<path d="M21 31C20 19 26 16 33 16S44 20 43 31C42 24.5 38.5 21.5 34.5 21.5L30.5 20.6C26.5 22 22.5 25.5 21 31Z" fill="${hair}"/>`);
  if (st === 'bald') front.push(`<path d="M21.2 34C20.4 29 21 25.5 22.8 24L23.6 31.5Z" fill="${hair}"/><path d="M42.8 34C43.6 29 43 25.5 41.2 24L40.4 31.5Z" fill="${hair}"/>`);
  if (st === 'bob' || st === 'long') front.push(`<path d="M21.3 29C21.5 19.5 26.5 17 32 17S42.5 19.5 42.7 29C39 23.8 34.5 22.6 31 23.4 27 24.2 23.5 26 21.3 29Z" fill="${hair}"/>`);
  if (st === 'bun') front.push(`<path d="M21.4 29.5C21 20.5 26 17.6 32 17.6S43 20.5 42.6 29.5C40.5 23.5 36.5 21.6 32 21.6S23.5 23.5 21.4 29.5Z" fill="${hair}"/>`);
  if (st === 'curly') front.push([[22, 26.5, 4.1], [25.2, 21, 4.3], [31, 18.4, 4.6], [37, 19.8, 4.4], [41.6, 25, 4.1]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${hair}"/>`).join(''));
  // the face's furniture
  if (acc.has('beard')) over.push(`<path d="M21.6 32.5C21.6 41.5 26 45.6 32 45.6S42.4 41.5 42.4 32.5C40.5 37.6 36.5 39.2 32 39.2S23.5 37.6 21.6 32.5Z" fill="${hair}"/>`);
  if (acc.has('moustache')) over.push(`<path d="M27 35.6C29 33.9 31 34.4 32 35.3 33 34.4 35 33.9 37 35.6 35 36.9 33 36.4 32 35.9 31 36.4 29 36.9 27 35.6Z" fill="${hair}"/>`);
  if (acc.has('glasses')) over.push(`<g fill="none" stroke="#231D1A" stroke-width="1.1"><circle cx="27.6" cy="30.8" r="3.3"/><circle cx="36.4" cy="30.8" r="3.3"/><path d="M30.9 30.6H33.1M24.3 30.3L21.6 29.4M39.7 30.3L42.4 29.4"/></g>`);
  if (acc.has('monocle')) over.push(`<circle cx="36.4" cy="30.8" r="3.5" fill="#fff" fill-opacity=".25" stroke="#C99A2E" stroke-width="1.2"/><path d="M39.6 32.4Q42 38 39.5 44" fill="none" stroke="#C99A2E" stroke-width=".7"/>`);
  if (acc.has('earrings')) over.push(`<circle cx="21.4" cy="36" r="1.5" fill="#E2B33C"/><circle cx="42.6" cy="36" r="1.5" fill="#E2B33C"/>`);
  if (acc.has('goggles')) over.push(`<rect x="20" y="20.6" width="24" height="2.6" rx="1.3" fill="#6B4426"/><circle cx="27" cy="21.9" r="3.4" fill="#A9D6DC" stroke="#6B4426" stroke-width="1.3"/><circle cx="37" cy="21.9" r="3.4" fill="#A9D6DC" stroke="#6B4426" stroke-width="1.3"/>`);
  if (acc.has('headband')) over.push(`<path d="M21.2 25.6Q32 20.6 42.8 25.6V28.4Q32 23.4 21.2 28.4Z" fill="#F4F1EA" stroke="hsl(${s.hue} 60% 45%)" stroke-width=".8"/>`);
  if (acc.has('feather')) over.push(`<path d="M21.6 25Q32 20.4 42.4 25" fill="none" stroke="#1E1B18" stroke-width="2"/><path d="M40 23.4C41 15 44 9 48.5 5.5 47.5 12 45 18.5 41.6 23.6Z" fill="hsl(${s.hue} 55% 55%)"/><circle cx="40.6" cy="23.8" r="1.6" fill="#E2B33C"/>`);
  if (acc.has('tophat')) over.push(`<rect x="22.5" y="3.5" width="19" height="14" rx="1.2" fill="#1C1B1E"/><rect x="22.5" y="13.6" width="19" height="2.6" fill="hsl(${s.hue} 45% 40%)"/><rect x="17" y="16.5" width="30" height="2.8" rx="1.4" fill="#1C1B1E"/>`);
  if (acc.has('bowler')) over.push(`<path d="M21.5 19C21.5 9.5 42.5 9.5 42.5 19Z" fill="#26211F"/><ellipse cx="32" cy="19" rx="13.5" ry="2.3" fill="#26211F"/><rect x="21.6" y="16.4" width="20.8" height="1.8" fill="#4A3F3A"/>`);
  if (acc.has('cloche')) over.push(`<path d="M19.6 27C19.4 13.5 44.6 13.5 44.4 27 40 22.6 24 22.6 19.6 27Z" fill="hsl(${s.hue} 38% 42%)"/><path d="M21.2 22.6Q32 18.6 42.8 22.6" fill="none" stroke="hsl(${s.hue} 40% 75%)" stroke-width="1.6"/>`);
  if (acc.has('captcap')) over.push(`<path d="M20.5 19.5C20.5 12.2 43.5 12.2 43.5 19.5Z" fill="#1F2B47"/><rect x="21" y="18.4" width="22" height="3.2" fill="#F2EFE8"/><path d="M22.5 21.6Q32 25.4 41.5 21.6Z" fill="#141414"/><circle cx="32" cy="16.4" r="1.6" fill="#E2B33C"/>`);
  if (acc.has('nursecap')) over.push(`<path d="M23.5 19.5H40.5L38.5 12.5H25.5Z" fill="#FBFAF7" stroke="#D9D3C7" stroke-width=".6"/><path d="M32 13.8V18.2M29.8 16H34.2" stroke="#C2372B" stroke-width="1.3"/>`);
  if (acc.has('veil')) over.push(`<ellipse cx="37" cy="17.2" rx="7.2" ry="3.4" fill="#151416"/><path d="M29.5 17.5Q30 26 36 29.5Q41 27 44 18.5" fill="#151416" fill-opacity=".22" stroke="#151416" stroke-width=".5" stroke-opacity=".5"/>`);
  // clothes and neck pieces
  let neck = '';
  if (acc.has('collar')) neck += `<path d="M24.5 46.5Q32 50.5 39.5 46.5L39 44.5Q32 48 25 44.5Z" fill="#141414"/><rect x="30" y="45.6" width="4" height="3.4" rx=".6" fill="#FBFAF7"/>`;
  if (acc.has('bowtie')) neck += `<path d="M32 47.4L26.8 44.6V50.2ZM32 47.4L37.2 44.6V50.2Z" fill="#141414"/><circle cx="32" cy="47.4" r="1.2" fill="#141414"/>`;
  if (acc.has('pearls')) neck += [25.6, 27.6, 29.7, 31.9, 34.1, 36.3, 38.4].map((x, k) => `<circle cx="${x}" cy="${47 + Math.sin((k / 6) * Math.PI) * 1.7}" r="1.15" fill="#FBF6EA" stroke="#CFC6B6" stroke-width=".4"/>`).join('');
  if (acc.has('medal')) neck += `<path d="M22.8 50.5H26.2L25.6 54.6H23.4Z" fill="#B23B33"/><circle cx="24.5" cy="56.4" r="2.3" fill="#E2B33C" stroke="#A97E1F" stroke-width=".5"/>`;
  if (acc.has('brooch')) neck += `<circle cx="32" cy="53.5" r="2.2" fill="#3E8E7E" stroke="#E2B33C" stroke-width="1"/>`;
  return `<svg class="${cls || 'portrait'}" viewBox="7 3 50 50" aria-hidden="true">
    ${back.join('')}
    <path d="M7 64C9 51.5 19 46 32 46S55 51.5 57 64Z" fill="${coat}"/>
    <path d="M27 46.2L32 52.5L37 46.2Z" fill="${shirt}"/>
    <rect x="28.2" y="38" width="7.6" height="9" rx="2.4" fill="${skin}"/>
    <ellipse cx="21.3" cy="31.5" rx="1.9" ry="2.7" fill="${skin}"/><ellipse cx="42.7" cy="31.5" rx="1.9" ry="2.7" fill="${skin}"/>
    <ellipse cx="32" cy="30" rx="10.6" ry="12.6" fill="${skin}"/>
    <circle cx="27.8" cy="31" r="1.55" fill="${EYE_COLOUR[s.traits.eyes] || '#231D1A'}"/><circle cx="36.2" cy="31" r="1.55" fill="${EYE_COLOUR[s.traits.eyes] || '#231D1A'}"/>
    <circle cx="27.8" cy="31" r=".7" fill="#1A1412"/><circle cx="36.2" cy="31" r=".7" fill="#1A1412"/><circle cx="28.3" cy="30.5" r=".35" fill="#fff"/><circle cx="36.7" cy="30.5" r=".35" fill="#fff"/>
    <ellipse cx="25.6" cy="35.2" rx="2" ry="1.2" fill="#E07A6A" opacity=".28"/><ellipse cx="38.4" cy="35.2" rx="2" ry="1.2" fill="#E07A6A" opacity=".28"/>
    <path d="M29.8 37.6Q32 38.9 34.2 37.6" fill="none" stroke="#7A4A3C" stroke-width="1.1" stroke-linecap="round"/>
    ${front.join('')}${over.join('')}${neck}
  </svg>`;
}
// a suspect's portrait in a coloured disc
const face = (s, size, extra) => `<span class="face${extra ? ' ' + extra : ''}" style="--h:${s.hue};--fs:${size}px" aria-hidden="true">${portraitSVG(s)}</span>`;

// ---- weapon icons, one per weapon, drawn in currentColor on a 24-unit grid
const WEAPON_ICONS = {
  dagger: '<path d="M12 1.8L14 13.6H10Z"/><rect x="6.8" y="13.6" width="10.4" height="2.2" rx="1.1"/><rect x="10.9" y="15.8" width="2.2" height="5"/><circle cx="12" cy="21.6" r="1.7"/>',
  opener: '<path d="M12 1.5L13.1 15H10.9Z"/><rect x="8.6" y="15" width="6.8" height="1.6" rx=".8"/><rect x="10.6" y="16.6" width="2.8" height="6" rx="1.4"/>',
  candlestick: '<path d="M12 1.6C13.6 3.6 13.8 5.2 12 6.4 10.2 5.2 10.4 3.6 12 1.6Z"/><rect x="10.6" y="6.8" width="2.8" height="5" rx=".5"/><path d="M7.8 11.8H16.2L14.6 13.4H9.4Z"/><rect x="11" y="13.4" width="2" height="6"/><path d="M6.6 22.4H17.4L15.4 19.4H8.6Z"/>',
  poker: '<path d="M4.6 21.4L17.6 5.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M17.6 5.2L19.8 2.4M17.6 5.2L21.2 6.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><circle cx="4.4" cy="21.6" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  port: '<rect x="10.4" y="3.2" width="3.2" height="6"/><rect x="9.6" y="2" width="4.8" height="1.8" rx=".9"/><path d="M12 8.6C17 8.6 19.4 12.6 19.4 16 19.4 19.8 16.4 22.4 12 22.4S4.6 19.8 4.6 16C4.6 12.6 7 8.6 12 8.6Z"/>',
  cord: '<path d="M6 3.5C11 3.5 13 7 10.6 10 8.4 12.8 9.2 16.4 13 16.4S18.6 13 16.4 10.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M5 2.2L7 4.6 4.6 5.4Z"/><path d="M14.4 16.4L13 22.4H16.4L15.4 16.4Z"/>',
  revolver: '<path d="M2.6 6.4H17.4V9.4H2.6Z"/><circle cx="15.6" cy="10.8" r="3.2"/><path d="M15.4 12.4L21 13.4 22 21.4 17.2 21.8 16.2 15.6Z"/><path d="M11.4 12.6Q12.4 16.4 15.4 15.4" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  hatpin: '<path d="M7.4 21.4L17 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/><circle cx="18.2" cy="4.6" r="3.4"/><circle cx="17.2" cy="3.6" r="1" fill="var(--glint, #fff)" opacity=".6"/>',
  icepick: '<rect x="9.4" y="1.6" width="5.2" height="8.4" rx="2.4"/><rect x="10.4" y="10" width="3.2" height="1.6"/><path d="M12 11.6V21.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>',
  bottle: '<rect x="10.4" y="1.6" width="3.2" height="3.4" rx=".6"/><path d="M10.6 5H13.4V8.2C16.6 9.6 17.4 11.6 17.4 14.4V21.6C17.4 22.2 17 22.6 16.4 22.6H7.6C7 22.6 6.6 22.2 6.6 21.6V14.4C6.6 11.6 7.4 9.6 10.6 8.2Z"/>',
  lantern: '<path d="M9 3.6A3 3 0 0 1 15 3.6" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="7" y="5" width="10" height="2.2" rx="1"/><path d="M8 7.2H16V18.6H8Z" fill-opacity=".45"/><rect x="11" y="9.4" width="2" height="6.6" rx="1"/><rect x="6.4" y="18.6" width="11.2" height="3" rx="1"/>',
  cocoa: '<path d="M4.6 10H16.6V16.6C16.6 19.6 14.4 21.8 11.4 21.8H9.8C6.8 21.8 4.6 19.6 4.6 16.6Z"/><path d="M16.6 12.2H18.4C19.8 12.2 20.6 13.2 20.6 14.4S19.8 16.6 18.4 16.6H16.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8.4 2.6C7.4 4.2 9.4 5.2 8.4 7.4M12.6 2.6C11.6 4.2 13.6 5.2 12.6 7.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  scarf: '<path d="M5 4.4C9 2.4 15 2.4 19 4.4 17.4 7.6 14.6 8.6 12 8.6S6.6 7.6 5 4.4Z"/><path d="M13.4 8.4L17.6 21.2 14.4 22.2 11 9Z"/><path d="M10 8.6L7.2 19.6 4.4 18.2 8 8.2Z"/>',
  pistol: '<path d="M3 7.2H18.6V11H3Z"/><path d="M11.8 11H18.6L19.6 20.4H14.6L13.8 14.6H12.2Z"/><path d="M10 11Q10.6 14.4 13.6 14" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="16.8" cy="16.8" r=".9" fill="var(--glint, #fff)" opacity=".7"/>',
  harpoon: '<path d="M3.4 20.6L17.4 6.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M21.4 2.6L14.6 5.8 18.2 9.4Z"/><path d="M15.8 8.2L13.4 11.8M14.4 6.8L10.8 9.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>',
  fishknife: '<path d="M4 9.6C8 6.4 15 6 20.6 7.4L20 11.2H4.6Z"/><path d="M7.4 9.6L8.2 11.2M10.2 9.4L11 11.2" stroke="var(--glint, #fff)" stroke-width=".9" opacity=".7"/><rect x="3" y="11.2" width="9" height="2.6" rx="1.3" transform="rotate(-8 7 12)"/>',
  sextant: '<path d="M4.4 15.2A9 9 0 0 0 19.6 15.2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 3.4L4.8 15.2M12 3.4L19.2 15.2" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="12" cy="3.6" r="1.8"/><rect x="9.4" y="8.8" width="5.2" height="2.6" rx=".6"/>',
  pin: '<rect x="10.4" y="1.8" width="3.2" height="6" rx="1.6"/><rect x="9.4" y="7.4" width="5.2" height="1.6" rx=".8"/><path d="M9.6 9H14.4L15.6 21C15.6 22 14.6 22.6 12 22.6S8.4 22 8.4 21Z"/>',
  gin: '<path d="M4 4.4H20C19.4 9 16.2 11.6 12 11.6S4.6 9 4 4.4Z"/><rect x="11.1" y="11.4" width="1.8" height="7.6"/><path d="M7.2 21.8C7.2 20.2 9.4 19 12 19S16.8 20.2 16.8 21.8Z"/><circle cx="16.6" cy="2.4" r="1.2"/>',
  rope: '<ellipse cx="12" cy="13" rx="8.6" ry="7.4" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="12" cy="13" rx="5.4" ry="4.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 13H13.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19.4 9.6L22.4 4.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  flare: '<rect x="2.6" y="6.2" width="12.6" height="6" rx="1.4"/><rect x="13.6" y="7" width="5.2" height="4.4" rx=".6"/><path d="M14.2 12.2H19L20 20.6H15.2Z"/><path d="M10 12.2Q10.6 15.6 14.4 15" fill="none" stroke="currentColor" stroke-width="1.4"/>',
};
const weaponIcon = (w, cls) => `<svg class="${cls || 'wi'}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${WEAPON_ICONS[w.id] || ''}</svg>`;

// ---- floor patterns for the map. Defined once, used by reference.
const PATTERN_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <pattern id="pt-carpet" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="var(--fl-carpet)"/><circle cx="5" cy="5" r="1.1" fill="var(--fl-mark)"/><circle cx="0" cy="0" r="1.1" fill="var(--fl-mark)"/><circle cx="10" cy="10" r="1.1" fill="var(--fl-mark)"/></pattern>
  <pattern id="pt-rug" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="var(--fl-rug)"/><path d="M8 2L14 8 8 14 2 8Z" fill="none" stroke="var(--fl-mark)" stroke-width="1"/></pattern>
  <pattern id="pt-checker" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="var(--fl-tile)"/><rect width="7" height="7" fill="var(--fl-mark)"/><rect x="7" y="7" width="7" height="7" fill="var(--fl-mark)"/></pattern>
  <pattern id="pt-parquet" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="var(--fl-wood)"/><path d="M0 4H8M0 8H8M8 0V8M8 12H16M8 16V8M12 8V16M4 8V16" stroke="var(--fl-mark)" stroke-width=".8"/></pattern>
  <pattern id="pt-planks" width="40" height="10" patternUnits="userSpaceOnUse"><rect width="40" height="10" fill="var(--fl-wood)"/><path d="M0 0H40M0 5H40M12 0V5M30 5V10" stroke="var(--fl-mark)" stroke-width=".8"/></pattern>
  <pattern id="pt-leaves" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="var(--fl-green)"/><path d="M4 12C4 8 7 5 11 5 11 9 8 12 4 12Z" fill="var(--fl-leaf)"/><path d="M13 17C13 14.6 14.8 13 17 13 17 15.4 15.4 17 13 17Z" fill="var(--fl-leaf)"/></pattern>
  <pattern id="pt-stone" width="20" height="12" patternUnits="userSpaceOnUse"><rect width="20" height="12" fill="var(--fl-stone)"/><path d="M0 6H20M0 0H20M8 0V6M18 6V12" stroke="var(--fl-mark)" stroke-width="1"/></pattern>
</defs></svg>`;

// Weapon kinds, as small marks for the notebook's group labels.
const KIND_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="k-blade" viewBox="0 0 16 16"><path d="M8 1 10 9.5H6Z" fill="currentColor"/><path d="M4.5 10.5h7M8 11v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
  <symbol id="k-blunt" viewBox="0 0 16 16"><circle cx="8" cy="8.5" r="5" fill="currentColor"/></symbol>
  <symbol id="k-cord" viewBox="0 0 16 16"><path d="M2 10c2-6 5-6 6-2s4 4 6-2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
  <symbol id="k-poison" viewBox="0 0 16 16"><path d="M8 2.5c2.8 3.6 4.2 6 4.2 7.8a4.2 4.2 0 0 1-8.4 0C3.8 8.5 5.2 6.1 8 2.5z" fill="currentColor"/></symbol>
  <symbol id="k-firearm" viewBox="0 0 16 16"><path d="M2 5.5h12v3H7.5l-1 4.5H4l1-4.5H2z" fill="currentColor"/></symbol>
</svg>`;
const glyph = (t) => `<svg class="kg" aria-hidden="true"><use href="#k-${t}"/></svg>`;

// what each piece of evidence is, as a small icon: the coroner, a magnifier, a footprint, a hair
const EVIDENCE_ICONS = {
  body: '<path d="M4 20h16M7 20c0-5 2.2-8 5-8s5 3 5 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="7.5" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  lens: '<circle cx="10" cy="10" r="5.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14.4 14.4L20 20" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  print: '<ellipse cx="9" cy="14" rx="3.4" ry="5.2" fill="currentColor"/><circle cx="8" cy="6.4" r="1.4" fill="currentColor"/><circle cx="11.2" cy="6" r="1.2" fill="currentColor"/><ellipse cx="16.4" cy="10" rx="2.6" ry="4" fill="currentColor"/><circle cx="16" cy="4.4" r="1.1" fill="currentColor"/>',
  hair: '<path d="M5 19C9 15 7 9 12 6S18 4 20 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 14C7 12 6 8 10 6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>',
 eye: '<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
  lamp: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  seal: '<rect x="2.5" y="5" width="19" height="14" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.2 5.8L12 12.5l8.8-6.7" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="15" r="2.6" fill="currentColor"/>',
  file: '<path d="M6 3h8l4 4v14H6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 11h6M9 15h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
};
const evIcon = (k) => `<svg class="evi" viewBox="0 0 24 24" aria-hidden="true">${EVIDENCE_ICONS[k]}</svg>`;

// ---- room icons: what you would see on walking in
const ROOM_ICONS = {
  bedroom: '<path d="M2.5 18.5V7M2.5 13.5h19v5M21.5 13.5V11a2 2 0 0 0-2-2H10v4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><rect x="4" y="9.5" width="4.5" height="3.2" rx="1.4"/>',
  study: '<path d="M3 20.5h18M5 20.5V12h14v8.5M5 15h14" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15 12V6.5l-3-2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 4.5l4-2 1.5 3.5-4 1.5Z"/>',
  kitchen: '<path d="M4 10.5h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"/><path d="M2 12h2M20 12h2M8.5 7.5C8 6 9.5 5 9 3.5M12.5 7.5C12 6 13.5 5 13 3.5M16.5 7.5C16 6 17.5 5 17 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  dining: '<path d="M2.5 12h19M5 12v8.5M19 12v8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="7.5" y="6" width="1.6" height="6"/><rect x="14.9" y="6" width="1.6" height="6"/><path d="M8.3 2.6c.8 1 .8 1.8 0 2.6-.8-.8-.8-1.6 0-2.6ZM15.7 2.6c.8 1 .8 1.8 0 2.6-.8-.8-.8-1.6 0-2.6Z"/><ellipse cx="12" cy="10.6" rx="2.6" ry="1"/>',
  library: '<rect x="3" y="4" width="3.4" height="16" rx=".6"/><rect x="7.4" y="6" width="3" height="14" rx=".6"/><rect x="11.4" y="3" width="3.6" height="17" rx=".6"/><path d="M16.2 6.6l3-.8 3.2 13.6-3 .8Z"/><path d="M2 21h20" stroke="currentColor" stroke-width="1.6"/>',
  conservatory: '<path d="M12 21V11" stroke="currentColor" stroke-width="1.6"/><path d="M12 12C7 12 4.5 9 4.5 5c4 0 7.5 2.5 7.5 7ZM12 14c4.5 0 7.5-2.5 7.5-6.5-4 0-7.5 2.5-7.5 6.5Z"/><path d="M8 21h8l-1 2H9Z"/>',
  cellar: '<ellipse cx="12" cy="12" rx="7.5" ry="9"/><path d="M4.8 8h14.4M4.8 16h14.4" stroke="var(--card)" stroke-width="1.4"/><circle cx="12" cy="12" r="1.5" fill="var(--card)"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.8 6.5L12 13l8.2-6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="15" r="2.2"/>',
  smoking: '<path d="M3 13.5h9.5v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3Z"/><path d="M12.5 14.5h7.5l1.5-1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 10C5 8 7 7 6 4.5M9.5 10c-1-2 1-3 0-5.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  sleeper: '<path d="M14.5 3.5a8.5 8.5 0 1 0 6 13.5 7 7 0 0 1-6-13.5Z"/><circle cx="18.5" cy="5.5" r="1"/><circle cx="20.5" cy="9.5" r=".7"/>',
  bar: '<path d="M4 4h16l-8 8.5Z"/><path d="M12 12.5V20M7.5 20.5h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="16.5" cy="5.5" r="1.4" fill="var(--card)"/>',
  observation: '<rect x="2.5" y="4" width="19" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 17l5.5-7 4 5 2.5-3 5 5Z"/><circle cx="16.5" cy="8" r="1.6"/>',
  luggage: '<rect x="3" y="7.5" width="18" height="12.5" rx="2"/><path d="M9 7.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 7.5v12.5M16 7.5v12.5" stroke="var(--card)" stroke-width="1.4"/>',
  bridge: '<circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.6"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  lido: '<path d="M12 21.5V10" stroke="currentColor" stroke-width="1.8"/><path d="M12 10C9 6.5 5.5 6.5 3 8.5 6 8 9 8.5 12 10ZM12 10c3-3.5 6.5-3.5 9-1.5-3-.5-6 0-9 1.5ZM12 10C10.5 6 11 3.5 13 2c0 3 0 5.5-1 8Z"/><path d="M8 21.5h8" stroke="currentColor" stroke-width="1.8"/>',
  saloon: '<path d="M12 2v4" stroke="currentColor" stroke-width="1.6"/><path d="M4 9.5h16l-2 4H6Z"/><path d="M6 13.5v3M10 13.5v4M14 13.5v4M18 13.5v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="7.2" r="1.6"/>',
  writing: '<path d="M20 2.5C13 4 8 9.5 6.5 17.5L8 18c1.5-2.5 3.5-4 6-4.5L13 12c3 0 5-2.5 7-9.5Z"/><path d="M6.5 17.5L4 21.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  purser: '<rect x="3" y="3.5" width="18" height="16" rx="1.6"/><circle cx="12" cy="11.5" r="4" fill="none" stroke="var(--card)" stroke-width="1.6"/><path d="M12 9v2.5h2" stroke="var(--card)" stroke-width="1.4" fill="none"/><path d="M5.5 19.5v2M18.5 19.5v2" stroke="currentColor" stroke-width="1.8"/>',
  engine: '<path d="M10.3 2.5h3.4l.5 2.6 2 .9 2.3-1.5 2.4 2.4-1.5 2.3.9 2 2.6.5v3.4l-2.6.5-.9 2 1.5 2.3-2.4 2.4-2.3-1.5-2 .9-.5 2.6h-3.4l-.5-2.6-2-.9-2.3 1.5-2.4-2.4 1.5-2.3-.9-2-2.6-.5v-3.4l2.6-.5.9-2-1.5-2.3 2.4-2.4 2.3 1.5 2-.9Z"/><circle cx="12" cy="12" r="3.2" fill="var(--card)"/>',
  hold: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 4l18 16M21 4L3 20" stroke="var(--card)" stroke-width="1.6"/><rect x="3" y="4" width="18" height="16" rx="1" fill="none" stroke="var(--card)" stroke-width="1"/>',
};
const roomIcon = (r, cls) => `<svg class="${cls || 'ri'}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ROOM_ICONS[r.id] || ''}</svg>`;

// ---- motive icons
const MOTIVE_ICONS = {
  money: '<circle cx="12" cy="12" r="9"/><path d="M14.8 8.6c-.6-1-1.6-1.4-2.8-1.4-1.6 0-2.8.9-2.8 2.2 0 3 5.8 1.6 5.8 4.6 0 1.4-1.3 2.4-3 2.4-1.3 0-2.4-.6-3-1.6M12 5.5v13" fill="none" stroke="var(--card)" stroke-width="1.6" stroke-linecap="round"/>',
  revenge: '<path d="M12 2c1 3.5 5.5 6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.2 1-3.8 2.2-5 .2 1.6.9 2.8 2.1 3.3C10 8 11 5 12 2Z"/>',
  love: '<path d="M12 20.5S3 14.8 3 8.8A4.6 4.6 0 0 1 12 6.5a4.6 4.6 0 0 1 9 2.3c0 6-9 11.7-9 11.7Z"/>',
  jealousy: '<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3.6" fill="var(--card)"/><circle cx="12" cy="12" r="1.8"/>',
  blackmail: '<rect x="2.5" y="5" width="19" height="14" rx="1.4"/><path d="M3.2 5.8L12 12.5l8.8-6.7" fill="none" stroke="var(--card)" stroke-width="1.5"/><circle cx="12" cy="15" r="2.6" fill="#C2372B"/>',
  ambition: '<path d="M3 18.5L4.5 7l4.5 4.5L12 4l3 7.5L19.5 7 21 18.5Z"/><rect x="3" y="19.5" width="18" height="2" rx=".6"/>',
  inheritance: '<path d="M6 3h11a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2Z"/><path d="M9 8h7M9 11h7M9 14h4.5" stroke="var(--card)" stroke-width="1.4" stroke-linecap="round"/><path d="M4 17a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="16.5" cy="16" r="1.8" fill="#C2372B"/>',
  fear: '<path d="M12 2.5a7 7 0 0 0-7 7V21l2.4-1.8L9.8 21l2.2-1.8 2.2 1.8 2.4-1.8L19 21V9.5a7 7 0 0 0-7-7Z"/><circle cx="9.5" cy="10" r="1.4" fill="var(--card)"/><circle cx="14.5" cy="10" r="1.4" fill="var(--card)"/><ellipse cx="12" cy="14.2" rx="1.3" ry="1.7" fill="var(--card)"/>',
};
const motiveIcon = (m, cls) => `<svg class="${cls || 'mi'}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${MOTIVE_ICONS[m.id] || ''}</svg>`;

// ---- small pictograms for the cards' facts
const FACT_ICONS = {
  height: '<path d="M12 2.5v19M8.5 6L12 2.5 15.5 6M8.5 18l3.5 3.5 3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  hand: '<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11V4a1.5 1.5 0 0 1 3 0v7V5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6.5 7-2.6 0-4.3-1.3-5.6-3.4L3 13.6a1.5 1.5 0 0 1 2.4-1.7L8 14.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  weight: '<path d="M7 9h10l3 11.5H4Z"/><circle cx="12" cy="6" r="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  material: '<path d="M12 2.5l8.5 5v9L12 21.5l-8.5-5v-9Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M3.5 7.5L12 12.5l8.5-5M12 12.5v9" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  floor: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  lit: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  dark: '<path d="M15 3.5a8.5 8.5 0 1 0 5.5 14 7 7 0 0 1-5.5-14Z"/>',
};
const factIcon = (k) => `<svg class="fi" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${FACT_ICONS[k]}</svg>`;
