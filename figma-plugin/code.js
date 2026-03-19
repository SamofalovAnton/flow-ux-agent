// FLOW Importer — Figma Plugin Code
figma.showUI(__html__, { width: 296, height: 460, title: 'FLOW Importer' });

// ─── Fonts ────────────────────────────────────────────────────────────────────
async function loadFont() {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
}

// ─── Design tokens (matching Figma reference 1920px) ─────────────────────────
const DOC_W     = 1920;
const DOC_PAD   = 80;
const CONTENT_W = DOC_W - DOC_PAD * 2; // 1760
const Q_W       = 565;
const A_W       = 1163;
const COL_GAP   = 32;
const NUM_W     = 116;
const QTX_W     = Q_W - NUM_W; // 449

const C_DARK   = { r: 0.1,  g: 0.1,  b: 0.1  };
const C_WHITE  = { r: 1.0,  g: 1.0,  b: 1.0  };
const C_PINK   = { r: 1.0,  g: 0.18, b: 0.43 };
const C_YELLOW = { r: 0.85, g: 0.93, b: 0.24 };
const C_GRAY   = { r: 0.55, g: 0.55, b: 0.55 };
const C_LGRAY  = { r: 0.87, g: 0.87, b: 0.87 };
const C_BGALT  = { r: 0.98, g: 0.98, b: 0.98 };

// ─── Text ─────────────────────────────────────────────────────────────────────
function T(content, size, weight, color, w) {
  const t = figma.createText();
  t.fontName = { family: 'Inter', style: weight === 'B' ? 'Bold' : weight === 'S' ? 'Semi Bold' : 'Regular' };
  t.fontSize  = size;
  t.fills     = [{ type: 'SOLID', color: color || C_DARK }];
  t.characters = String(content || '');
  if (w) { t.textAutoResize = 'HEIGHT'; t.resize(w, t.height); }
  return t;
}

// ─── Frame factory ────────────────────────────────────────────────────────────
function F(name, dir, opts = {}) {
  const f = figma.createFrame();
  f.name        = name;
  f.layoutMode  = dir === 'H' ? 'HORIZONTAL' : 'VERTICAL';
  f.fills       = opts.fill ? [{ type: 'SOLID', color: opts.fill }] : [];
  if (opts.radius) f.cornerRadius = opts.radius;
  if (opts.stroke) { f.strokes = [{ type: 'SOLID', color: opts.stroke }]; f.strokeWeight = opts.sw || 1; }
  f.paddingTop    = opts.pt ?? opts.py ?? opts.p ?? 0;
  f.paddingBottom = opts.pb ?? opts.py ?? opts.p ?? 0;
  f.paddingLeft   = opts.pl ?? opts.px ?? opts.p ?? 0;
  f.paddingRight  = opts.pr ?? opts.px ?? opts.p ?? 0;
  f.itemSpacing   = opts.gap || 0;
  f.primaryAxisSizingMode   = 'AUTO';
  f.counterAxisSizingMode   = 'AUTO';
  if (opts.w != null) { f.primaryAxisSizingMode = 'FIXED'; f.resize(opts.w, opts.h || 100); }
  if (opts.mainAlign)  f.primaryAxisAlignItems  = opts.mainAlign;
  if (opts.crossAlign) f.counterAxisAlignItems  = opts.crossAlign;
  return f;
}

function placeInViewport(node) {
  const c = figma.viewport.center;
  node.x = c.x - node.width  / 2;
  node.y = c.y - node.height / 2;
  figma.currentPage.appendChild(node);
  figma.viewport.scrollAndZoomIntoView([node]);
  figma.currentPage.selection = [node];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE_BRIEF — presentation-style document (matching reference design)
// ═══════════════════════════════════════════════════════════════════════════════

const BRIEF_SECTIONS = [
  { id: 'client', title: 'Про Клієнта', color: C_PINK, items: [
    { num: '1.', q: 'Хто наш клієнт?',                        field: 'who' },
    { num: '2.', q: 'Яка Унікальна Торгівельна Пропозиція?',   field: 'usp' },
    { num: '3.', q: 'Які функціональні переваги?',             field: 'advantages' },
    { num: '4.', q: 'Які є недоліки бренду?',                  field: 'disadvantages' },
  ]},
  { id: 'goal', title: 'Мета', color: C_YELLOW, items: [
    { num: '5.', q: 'Яка ключова дія на сайті?',   field: 'keyAction' },
    { num: '6.', q: 'Навіщо клієнту сайт?',         field: 'purpose' },
  ]},
  { id: 'wishes', title: 'Побажання', color: C_PINK, items: [
    { num: '7.',  q: 'Які побажання по UI?',                    field: 'ui' },
    { num: '8.',  q: 'Які побажання по структурі та контенту?', field: 'structure' },
    { num: '9.',  q: 'Які є обмеження для дизайну?',            field: 'limitations' },
  ]},
  { id: 'competition', title: 'Конкуренція', color: C_YELLOW, isCompetition: true, items: [
    { num: '10.', q: 'Хто наші конкуренти?', field: 'competitors' },
  ]},
  { id: 'additional', title: 'Додатково', color: C_PINK, items: [
    { num: '11.', q: 'Які додаткові матеріали надав клієнт?', field: 'materials' },
    { num: '12.', q: 'Які питання варто доуточнити?',          field: 'questions' },
  ]},
];

function makeQAPoint(num, question, answer) {
  const row = F('Point', 'H', { w: CONTENT_W, gap: COL_GAP, fill: null });

  // Question column
  const qCol = F('Question', 'H', { w: Q_W, gap: 0 });
  qCol.counterAxisAlignItems = 'MIN';
  const numNode = T(num,      28, 'B', C_GRAY, NUM_W);
  const qNode   = T(question, 22, 'S', C_DARK, QTX_W);
  qCol.appendChild(numNode);
  qCol.appendChild(qNode);

  // Answer column
  const aCol  = F('Answer', 'V', { w: A_W });
  const aNode = T(answer || '—', 20, 'R', answer ? C_DARK : C_LGRAY, A_W);
  aCol.appendChild(aNode);

  row.appendChild(qCol);
  row.appendChild(aCol);
  return row;
}

function makeCompetitorAnswer(competitorsText) {
  // Try to split into individual competitors
  const lines = (competitorsText || '')
    .split(/\n|,|;/)
    .map(s => s.trim())
    .filter(Boolean);

  const col = F('Competitors', 'V', { w: A_W, gap: 24 });

  if (!lines.length) {
    col.appendChild(T('—', 20, 'R', C_LGRAY, A_W));
    return col;
  }

  lines.forEach((line, i) => {
    const card = F(`C${i + 1}`, 'H', {
      w: A_W, gap: 32, fill: C_BGALT,
      radius: 12, stroke: C_LGRAY, sw: 1,
      py: 24, px: 24,
    });

    const logoPlaceholder = F('Logo', 'V', {
      w: 120, h: 80, fill: C_LGRAY, radius: 8,
    });
    logoPlaceholder.primaryAxisSizingMode = 'FIXED';
    logoPlaceholder.counterAxisSizingMode = 'FIXED';
    logoPlaceholder.resize(120, 80);

    const nameNode = T(line, 20, 'S', C_DARK, A_W - 120 - 32 - 48);
    nameNode.textAutoResize = 'HEIGHT';

    card.appendChild(logoPlaceholder);
    card.appendChild(nameNode);
    col.appendChild(card);
  });

  return col;
}

function makeSectionHeading(title, color) {
  const row = F('Heading', 'H', { w: CONTENT_W, gap: 32, crossAlign: 'CENTER' });

  const accent = figma.createRectangle();
  accent.resize(Q_W, 72);
  accent.fills = [{ type: 'SOLID', color }];
  accent.cornerRadius = 12;
  row.appendChild(accent);

  const titleNode = T(title, 56, 'B', C_DARK, A_W);
  row.appendChild(titleNode);
  return row;
}

function makeSeparator() {
  const line = figma.createRectangle();
  line.resize(CONTENT_W, 1);
  line.fills = [{ type: 'SOLID', color: C_LGRAY }];
  return line;
}

function makeBriefSection(secDef, brief) {
  const gData = brief[secDef.id] || {};

  const sec = F(secDef.title, 'V', {
    fill: C_WHITE,
    w: DOC_W, py: 80, px: DOC_PAD, gap: 64,
  });
  sec.primaryAxisSizingMode = 'AUTO';
  sec.counterAxisSizingMode = 'FIXED';
  sec.resize(DOC_W, 100);

  sec.appendChild(makeSectionHeading(secDef.title, secDef.color));

  const list = F('List', 'V', { w: CONTENT_W, gap: 64 });
  list.counterAxisSizingMode = 'FIXED';
  list.resize(CONTENT_W, 100);

  secDef.items.forEach(item => {
    const val = gData[item.field];

    if (secDef.isCompetition && item.field === 'competitors') {
      // Special competitor layout
      const row = F('Point', 'H', { w: CONTENT_W, gap: COL_GAP });
      const qCol = F('Question', 'H', { w: Q_W, gap: 0 });
      qCol.appendChild(T(item.num, 28, 'B', C_GRAY, NUM_W));
      qCol.appendChild(T(item.q,   22, 'S', C_DARK, QTX_W));
      row.appendChild(qCol);
      row.appendChild(makeCompetitorAnswer(val));
      list.appendChild(row);
    } else {
      list.appendChild(makeQAPoint(item.num, item.q, val));
    }
  });

  sec.appendChild(list);
  return sec;
}

function makeBriefHeader(projectName) {
  const header = F('Main screen', 'V', {
    fill: C_DARK, w: DOC_W, py: DOC_PAD, px: DOC_PAD, gap: 48,
  });
  header.primaryAxisSizingMode = 'AUTO';
  header.counterAxisSizingMode = 'FIXED';
  header.resize(DOC_W, 100);

  // Top logo row
  const topRow = F('Logo line', 'H', { w: CONTENT_W, mainAlign: 'SPACE_BETWEEN', crossAlign: 'CENTER' });
  topRow.primaryAxisSizingMode = 'FIXED';
  topRow.resize(CONTENT_W, 10);
  topRow.appendChild(T('LOGO', 18, 'B', C_WHITE));
  topRow.appendChild(T('Creative Brief', 18, 'R', C_GRAY));
  header.appendChild(topRow);

  // Project title + badge
  const titleBlock = F('Head section', 'V', { w: CONTENT_W, gap: 28 });
  titleBlock.counterAxisSizingMode = 'FIXED';
  titleBlock.resize(CONTENT_W, 100);

  titleBlock.appendChild(T(projectName, 96, 'B', C_WHITE, CONTENT_W));

  const badge = F('Badge', 'H', { fill: C_PINK, radius: 8, py: 10, px: 28 });
  badge.appendChild(T('Creative Brief', 22, 'S', C_WHITE));
  titleBlock.appendChild(badge);
  header.appendChild(titleBlock);

  // 3 nav blocks
  const navRow = F('Links', 'H', { w: CONTENT_W, gap: 32 });
  navRow.primaryAxisSizingMode = 'FIXED';
  navRow.resize(CONTENT_W, 100);

  const navW = Math.floor((CONTENT_W - 64) / 3);
  const navDefs = [
    { label: 'Бріф від клієнта',      color: C_PINK,   textColor: C_WHITE },
    { label: 'Комерційна пропозиція',  color: C_YELLOW, textColor: C_DARK  },
    { label: 'Проєкт у Teamwork',      color: C_PINK,   textColor: C_WHITE },
  ];
  navDefs.forEach(nav => {
    const block = F(nav.label, 'V', { fill: nav.color, radius: 12, p: 24, gap: 0, w: navW });
    block.primaryAxisSizingMode = 'FIXED';
    block.counterAxisSizingMode = 'AUTO';
    block.resize(navW, 10);
    block.appendChild(T(nav.label, 26, 'S', nav.textColor, navW - 48));
    navRow.appendChild(block);
  });
  header.appendChild(navRow);
  return header;
}

async function createBrief(data) {
  const { projectName, brief } = data;

  const root = F(`📋 FLOW Brief — ${projectName}`, 'V', { fill: C_WHITE, w: DOC_W });
  root.primaryAxisSizingMode = 'AUTO';
  root.counterAxisSizingMode = 'FIXED';
  root.resize(DOC_W, 100);

  root.appendChild(makeBriefHeader(projectName));

  BRIEF_SECTIONS.forEach((sec, i) => {
    if (i > 0) root.appendChild(makeSeparator());
    root.appendChild(makeBriefSection(sec, brief));
  });

  placeInViewport(root);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE_COMPETITORS — competitor analysis cards layout
// ═══════════════════════════════════════════════════════════════════════════════

const COMP_GROUPS = [
  { id: 'ui_main',        title: 'UI — Main Screen',     emoji: '🖥️', color: { r: 0.97, g: 0.98, b: 1   }, fields: [{ id:'hero', label:'Hero section' }, { id:'layout', label:'Layout' }, { id:'firstImpression', label:'Перше враження' }] },
  { id: 'ui_fonts',       title: 'UI — Fonts',           emoji: '🔤', color: { r: 0.98, g: 0.97, b: 1   }, fields: [{ id:'headings', label:'Заголовки' }, { id:'body', label:'Основний текст' }, { id:'style', label:'Стиль' }] },
  { id: 'ui_colors',      title: 'UI — Colors',          emoji: '🎨', color: { r: 1,    g: 0.97, b: 0.97 }, fields: [{ id:'primary', label:'Палітра' }, { id:'accent', label:'Акценти' }, { id:'mood', label:'Настрій' }] },
  { id: 'ui_decorations', title: 'UI — Decorations',     emoji: '✨', color: { r: 1,    g: 0.99, b: 0.95 }, fields: [{ id:'elements', label:'Елементи' }, { id:'animations', label:'Анімації' }] },
  { id: 'ui_composition', title: 'UI — Composition',     emoji: '📐', color: { r: 0.97, g: 1,    b: 0.98 }, fields: [{ id:'grid', label:'Grid' }, { id:'spacing', label:'Відступи' }, { id:'balance', label:'Баланс' }] },
  { id: 'funnel',         title: 'Структура та воронка', emoji: '🔄', color: { r: 0.97, g: 0.97, b: 1   }, fields: [{ id:'structure', label:'Структура' }, { id:'cta', label:'CTA' }, { id:'userPath', label:'Шлях' }] },
  { id: 'best_practices', title: 'Найкращі практики',   emoji: '⭐', color: { r: 1,    g: 0.99, b: 0.93 }, fields: [{ id:'strengths', label:'Сильні' }, { id:'innovative', label:'Інновації' }] },
  { id: 'ux',             title: 'UX',                   emoji: '🧭', color: { r: 0.97, g: 1,    b: 0.97 }, fields: [{ id:'navigation', label:'Навігація' }, { id:'usability', label:'Зручність' }, { id:'accessibility', label:'Мобайл' }] },
  { id: 'cx',             title: 'CX Part',              emoji: '💬', color: { r: 0.98, g: 0.97, b: 0.99 }, fields: [{ id:'tone', label:'Tone' }, { id:'trust', label:'Довіра' }, { id:'emotional', label:'Емоція' }] },
];

const CONCLUSION_FIELDS = [
  { id: 'works_well',   label: '✅ Що добре працює',      bg: { r: 0.94, g: 1,    b: 0.94 }, stroke: { r: 0.6, g: 0.9, b: 0.6 } },
  { id: 'works_poorly', label: '❌ Що погано / слабко',    bg: { r: 1,    g: 0.94, b: 0.94 }, stroke: { r: 0.9, g: 0.6, b: 0.6 } },
  { id: 'to_remember',  label: '📌 Зафіксувати для роботи', bg: { r: 1,    g: 0.98, b: 0.9  }, stroke: { r: 0.98, g: 0.82, b: 0.52 } },
];

function makeFieldCard(label, value, cardWidth) {
  const frame = F('Card', 'V', { fill: C_WHITE, radius: 8, stroke: C_LGRAY, sw: 1, p: 12, gap: 4, w: cardWidth });
  frame.counterAxisSizingMode = 'FIXED';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.resize(cardWidth, 10);

  const lbl = T(label, 10, 'S', C_GRAY, cardWidth - 24);
  lbl.textCase = 'UPPER';
  frame.appendChild(lbl);
  frame.appendChild(T(value || '—', 13, 'R', value ? C_DARK : C_LGRAY, cardWidth - 24));
  return frame;
}

async function createCompetitors(data) {
  const { projectName, competitors } = data;
  const COL_W = 360, CPAD = 16, CGAP = 12;

  const root = F(`🔍 FLOW Конкуренти — ${projectName}`, 'V', { fill: C_BGALT, p: 32, gap: 24, w: 1 });
  root.primaryAxisSizingMode = 'AUTO';
  root.counterAxisSizingMode = 'AUTO';

  // Header
  const hdr = F('Header', 'V', { gap: 4 });
  hdr.appendChild(T(`🔍 Аналіз конкурентів — ${projectName}`, 22, 'B', C_DARK));
  hdr.appendChild(T(`${competitors.length} конкурент${competitors.length > 1 ? 'и' : ''} · FLOW`, 12, 'R', C_GRAY));
  root.appendChild(hdr);

  const cols = F('Columns', 'H', { gap: 20 });

  competitors.forEach(comp => {
    const col = F(comp.name || 'Конкурент', 'V', { fill: C_WHITE, radius: 12, stroke: C_LGRAY, sw: 1, p: CPAD, gap: CGAP, w: COL_W });
    col.primaryAxisSizingMode = 'AUTO';
    col.counterAxisSizingMode = 'FIXED';
    col.resize(COL_W, 100);

    // Name header
    const nameHdr = F('Name', 'H', { fill: C_DARK, radius: 8, py: 10, px: 14, w: COL_W - CPAD * 2 });
    nameHdr.counterAxisSizingMode = 'FIXED';
    nameHdr.primaryAxisSizingMode = 'AUTO';
    nameHdr.resize(COL_W - CPAD * 2, 10);
    nameHdr.appendChild(T(`🔍  ${comp.name || 'Конкурент'}`, 15, 'B', C_WHITE, COL_W - CPAD * 2 - 28));
    col.appendChild(nameHdr);

    // Analysis groups
    COMP_GROUPS.forEach(g => {
      const gData  = comp[g.id] || {};
      const gFrame = F(`${g.emoji} ${g.title}`, 'V', { fill: g.color, radius: 8, stroke: C_LGRAY, sw: 1, p: 12, gap: 8, w: COL_W - CPAD * 2 });
      gFrame.primaryAxisSizingMode = 'AUTO';
      gFrame.counterAxisSizingMode = 'FIXED';
      gFrame.resize(COL_W - CPAD * 2, 10);

      const gTitle = T(`${g.emoji}  ${g.title}`, 11, 'B', C_DARK, COL_W - CPAD * 2 - 24);
      gFrame.appendChild(gTitle);
      g.fields.forEach(field => gFrame.appendChild(makeFieldCard(field.label, gData[field.id], COL_W - CPAD * 2 - 24)));
      col.appendChild(gFrame);
    });

    // Separator
    const div = figma.createRectangle();
    div.resize(COL_W - CPAD * 2, 2);
    div.fills = [{ type: 'SOLID', color: C_DARK }];
    div.cornerRadius = 1;
    col.appendChild(div);

    // Conclusion
    const conclusion = comp.conclusion || {};
    const concBlock  = F('📌 Висновок', 'V', { fill: { r: 0.99, g: 0.98, b: 0.95 }, radius: 10, stroke: { r: 0.98, g: 0.82, b: 0.52 }, sw: 1.5, p: 12, gap: 10, w: COL_W - CPAD * 2 });
    concBlock.primaryAxisSizingMode = 'AUTO';
    concBlock.counterAxisSizingMode = 'FIXED';
    concBlock.resize(COL_W - CPAD * 2, 10);

    concBlock.appendChild(T('📌  ВИСНОВОК', 11, 'B', { r: 0.45, g: 0.26, b: 0.06 }, COL_W - CPAD * 2 - 24));

    CONCLUSION_FIELDS.forEach(cf => {
      const card = F(cf.label, 'V', { fill: cf.bg, radius: 6, stroke: cf.stroke, sw: 1, py: 8, px: 10, gap: 4, w: COL_W - CPAD * 2 - 24 });
      card.primaryAxisSizingMode = 'AUTO';
      card.counterAxisSizingMode = 'FIXED';
      card.resize(COL_W - CPAD * 2 - 24, 10);
      card.appendChild(T(cf.label, 10, 'S', C_DARK, COL_W - CPAD * 2 - 44));
      const val = conclusion[cf.id];
      const valNode = T(val || '—', 12, 'R', val ? C_DARK : C_LGRAY, COL_W - CPAD * 2 - 44);
      valNode.textAutoResize = 'HEIGHT';
      card.appendChild(valNode);
      concBlock.appendChild(card);
    });

    col.appendChild(concBlock);
    cols.appendChild(col);
  });

  root.appendChild(cols);
  placeInViewport(root);
}

// ─── Message handler ──────────────────────────────────────────────────────────
figma.ui.onmessage = async (msg) => {
  try {
    await loadFont();
    if (msg.type === 'CREATE_BRIEF')        await createBrief(msg.data);
    else if (msg.type === 'CREATE_COMPETITORS') await createCompetitors(msg.data);
    figma.ui.postMessage({ type: 'DONE' });
  } catch (e) {
    figma.ui.postMessage({ type: 'ERROR', message: e.message });
  }
};
