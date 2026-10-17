// The hand-made first case, in bank format. Three guests, five statements, one move taught per statement:
// cross out (1), confirm a match (2), cross out (3), the last open square (rooms), a weapon kind (4),
// and the body's floor (5). test-engine.js checks it has one answer and no spare statement.
//   suspects: Dr. Pell, Major Crisp, Miss Lark   weapons: Brass Candlestick, Decanter of Port, Service Revolver
//   rooms: Study (upstairs), Library (ground floor), Wine Cellar (cellar)
//   truth: Pell has the Revolver in the Cellar, Crisp has the Port in the Library (the killer), Lark has the Candlestick in the Study
const TUTORIAL = {
  s: 'tutorial', t: 'constable', w: 'manor', ti: 'A Lesson at Blackwood', r: 1, h: [0, 0],
  S: [1, 2, 7], W: [2, 4, 6], R: [1, 4, 6],
  pw: [2, 1, 0], pr: [2, 1, 0], m: 1,
  c: [
    ['notHas', { s: 0, w: 1 }, 0, 2],
    ['in', { s: 2, r: 0 }, 1, null],
    ['notIn', { s: 1, r: 2 }, 0, 0],
    ['holdsType', { s: 2, t: 'blunt' }, 0, 1],
    ['murderFloor', { f: 1 }, 0, null],
  ],
};
