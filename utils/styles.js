const ink = '#17202A', chili = '#D93A2B', leaf = '#1E4D3A', mist = '#F4F6F8', line = '#D5DBE1', gold = '#F2A93B';
const field = `width:100%;box-sizing:border-box;padding:10px 12px;margin-top:6px;border:1px solid ${line};border-radius:6px;font:inherit;background:#fff;`;

module.exports = {
  ink, chili, leaf, mist, line, gold,
  body: `margin:0;background:${mist};color:${ink};font-family:'Trebuchet MS',Verdana,sans-serif;line-height:1.5;`,
  nav: `background:${ink};padding:14px 24px;display:flex;gap:20px;align-items:center;flex-wrap:wrap;`,
  brand: `color:#fff;font-size:1.3rem;font-weight:700;text-decoration:none;margin-right:auto;`,
  navLink: `color:#cfd8e0;text-decoration:none;font-size:.95rem;`,
  main: `max-width:960px;margin:32px auto;padding:0 16px;`,
  card: `background:#fff;border:1px solid ${line};border-radius:10px;padding:24px;margin-bottom:20px;`,
  h1: `margin:0 0 6px;font-size:1.9rem;color:${ink};`,
  h2: `margin:0 0 6px;font-size:1.4rem;color:${ink};`,
  muted: `color:#5b6773;margin:0 0 18px;`,
  label: `display:block;margin-top:14px;font-weight:700;font-size:.92rem;`,
  input: field,
  err: `display:block;color:${chili};font-size:.85rem;min-height:1.1em;margin-top:4px;`,
  errBox: `background:#fdecea;border:1px solid ${chili};color:#8c1d13;padding:12px 16px;border-radius:6px;margin-bottom:16px;`,
  okBox: `background:#e7f3ec;border:1px solid ${leaf};color:${leaf};padding:12px 16px;border-radius:6px;margin-bottom:16px;`,
  warnBox: `background:#fff8e1;border:1px solid ${gold};color:#8a6300;padding:12px 16px;border-radius:6px;margin-bottom:16px;`,
  btn: `margin-top:20px;background:${chili};color:#fff;border:0;border-radius:6px;padding:12px 22px;font:inherit;font-weight:700;cursor:pointer;`,
  btnSecondary: `margin-top:20px;background:${leaf};color:#fff;border:0;border-radius:6px;padding:12px 22px;font:inherit;font-weight:700;cursor:pointer;margin-left:8px;`,
  btnGhost: `display:inline-block;margin-top:12px;color:${leaf};font-weight:700;text-decoration:none;`,
  row: `display:flex;gap:12px;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid ${mist};`,
  qty: `width:72px;padding:8px;border:1px solid ${line};border-radius:6px;font:inherit;`,
  th: `text-align:left;padding:8px;border-bottom:2px solid ${line};font-size:.9rem;`,
  td: `padding:8px;border-bottom:1px solid ${mist};font-size:.92rem;vertical-align:top;`,
  badge: (color) => `display:inline-block;background:${color};color:#fff;padding:2px 10px;border-radius:12px;font-size:.78rem;font-weight:700;`,
  grid: `display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;`
};