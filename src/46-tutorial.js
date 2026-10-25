// The hand-made first case, in bank format. Three guests, a statement each, three pieces of evidence.
// Two guests both claim the Study, so one of them is lying, and the liar is the killer. The evidence then
// says who, where and with what. test-engine.js checks it has one answer and no spare piece of evidence.
//   suspects: Dr. Pell, Major Crisp, Miss Lark   weapons: Brass Candlestick, Decanter of Port, Service Revolver
//   rooms: Study (upstairs), Library (ground floor), Wine Cellar (cellar)
//   truth: Pell has the Revolver in the Cellar, Crisp has the Port in the Library (the killer), Lark has the Candlestick in the Study
const TUTORIAL = {
  s: 'tutorial', t: 'constable', w: 'manor', ti: 'A Lesson at Blackwood', r: 1, h: [0, 0], y: [0, 3, 0, 6],
  S: [1, 2, 7], W: [2, 4, 6], R: [1, 4, 6],
  pw: [2, 1, 0], pr: [2, 1, 0], m: 1,
  c: [
    ['notHas', { s: 0, w: 1 }, 0, 0],
    ['in', { s: 1, r: 0 }, 0, 1],
    ['in', { s: 2, r: 0 }, 1, 2],
    ['murderTrait', { k: 'height', v: 'tall' }, 0, null],
    ['murderFloor', { f: 1 }, 0, null],
    ['holdsType', { s: 2, t: 'blunt' }, 0, null],
  ],
};
