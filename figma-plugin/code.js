// Brief Importer — заповнює існуючий шаблон "Creative Brief" у Figma
figma.showUI(__html__, { width: 280, height: 420, title: 'Brief Importer' });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function child(node, name) {
  if (!('children' in node)) return null;
  return node.children.find(c => c.name === name) || null;
}

function points(listNode) {
  if (!listNode || !('children' in listNode)) return [];
  return listNode.children.filter(c => c.name === 'Point');
}

function lastVisibleText(frame) {
  if (!frame || !('children' in frame)) return null;
  const texts = frame.children.filter(c => c.type === 'TEXT' && !c.hidden);
  return texts[texts.length - 1] || null;
}

async function fill(node, text) {
  if (!node || node.type !== 'TEXT') return;
  if (!text || !text.toString().trim()) return;
  const fonts = node.getRangeAllFontNames(0, node.characters.length);
  for (const font of fonts) {
    await figma.loadFontAsync(font);
  }
  node.characters = text.toString().trim();
}

async function fillAnswerPoint(listOrFrame, pointIndex, text) {
  const pts = Array.isArray(pointIndex)
    ? pointIndex
    : points(listOrFrame);
  const pt = typeof pointIndex === 'number' ? pts[pointIndex] : pointIndex;
  if (!pt) return;
  const answer = child(pt, 'Answer');
  await fill(lastVisibleText(answer), text);
}

// ─── Find "Creative Brief" frame on current page ───────────────────────────
function findBriefFrame() {
  // 1. Check selection first
  for (const sel of figma.currentPage.selection) {
    if (sel.name === 'Creative Brief') return sel;
  }
  // 2. Search entire page
  return figma.currentPage.findOne(n => n.name === 'Creative Brief') || null;
}

// ─── Fill template ──────────────────────────────────────────────────────────
async function fillBriefTemplate(data) {
  const brief  = data.brief || {};
  const pName  = data.projectName || brief.projectName || '';

  const root = findBriefFrame();
  if (!root) {
    throw new Error(
      'Фрейм "Creative Brief" не знайдено.\n' +
      'Відкрий шаблон та спробуй ще раз.'
    );
  }

  // ── Main screen ────────────────────────────────────────────────────────────
  const mainScreen = child(root, 'Main screen');
  if (mainScreen) {
    // Project name → "Head section" → "Main Heading" → first text
    const headSection  = child(mainScreen, 'Head section');
    const mainHeading  = headSection  && child(headSection, 'Main Heading');
    if (mainHeading) {
      const titleText = mainHeading.children.find(c => c.type === 'TEXT');
      await fill(titleText, pName);
    }
    // Short description → "Logo line" → text node
    const logoLine = child(mainScreen, 'Logo line');
    if (logoLine) {
      const shortDesc = logoLine.children.find(c => c.type === 'TEXT');
      await fill(shortDesc, brief.client && brief.client.usp ? brief.client.usp : pName);
    }
  }

  // ── About (Q1–Q4) ──────────────────────────────────────────────────────────
  const c = brief.client || {};
  const aboutFrame = child(root, 'About');
  if (aboutFrame) {
    const list = child(aboutFrame, 'List');
    const pts  = points(list);
    await fillAnswerPoint(null, pts[0], c.who);
    await fillAnswerPoint(null, pts[1], c.usp);
    await fillAnswerPoint(null, pts[2], c.advantages);
    await fillAnswerPoint(null, pts[3], c.disadvantages);
  }

  // ── Goal (Q5–Q6) ───────────────────────────────────────────────────────────
  const g = brief.goal || {};
  const goalFrame = child(root, 'Goal');
  if (goalFrame) {
    const list = child(goalFrame, 'List');
    const pts  = points(list);
    await fillAnswerPoint(null, pts[0], g.keyAction);
    await fillAnswerPoint(null, pts[1], g.purpose);
  }

  // ── Audience (Q7–Q8) ───────────────────────────────────────────────────────
  const a = brief.audience || {};
  // frame name може бути "Audience" або "Aудиторія" (Figma)
  const audienceFrame = child(root, 'Audience') ||
    figma.currentPage.findOne(n =>
      n.parent && n.parent.id === root.id &&
      (n.name === 'Audience' || n.name.toLowerCase().includes('ауд'))
    );
  if (audienceFrame) {
    const list = child(audienceFrame, 'List');
    const pts  = points(list);
    await fillAnswerPoint(null, pts[0], a.who);
    await fillAnswerPoint(null, pts[1], a.buys);
  }

  // ── Wishes (Q9–Q11) ────────────────────────────────────────────────────────
  const w = brief.wishes || {};
  const wishesFrame = child(root, 'Wishes');
  if (wishesFrame) {
    const list = child(wishesFrame, 'List');
    const pts  = points(list);
    await fillAnswerPoint(null, pts[0], w.ui);
    await fillAnswerPoint(null, pts[1], w.structure);
    await fillAnswerPoint(null, pts[2], w.limitations);
  }

  // ── Competition (Q12) ─────────────────────────────────────────────────────
  const comp = brief.competition || {};
  const competitorsText = comp.competitors || '';
  const compFrame = child(root, 'Competition');
  if (compFrame && competitorsText) {
    const list  = child(compFrame, 'List');
    const point = list && list.children.find(c => c.name === 'Point');
    const answer = point && child(point, 'Answer');
    if (answer) {
      // Split competitors into lines/items
      const lines = competitorsText
        .split(/\n|,|;/)
        .map(s => s.trim())
        .filter(Boolean);

      // C1, C2, C3, C4 competitor card frames
      const cards = answer.children.filter(c =>
        c.name.startsWith('C') && 'children' in c
      );

      for (let i = 0; i < cards.length; i++) {
        const compText = lines[i];
        if (!compText) continue;
        const texts = cards[i].children.filter(c => c.type === 'TEXT');
        const textNode = texts[texts.length - 1];
        await fill(textNode, compText);
      }
    }
  }

  // ── Additionally (Q13–Q14) ─────────────────────────────────────────────────
  const ad = brief.additional || {};
  const addFrame = child(root, 'Additionally');
  if (addFrame) {
    // Q13 — inside "List" > "Point"
    const list   = child(addFrame, 'List');
    const pt13   = list && list.children.find(c => c.name === 'Point');
    const ans13  = pt13 && child(pt13, 'Answer');
    await fill(lastVisibleText(ans13), ad.materials);

    // Q14 — direct child "Point" of Additionally (NOT inside List)
    const pt14   = addFrame.children.find(
      c => c.name === 'Point' && c !== list
    );
    const ans14  = pt14 && child(pt14, 'Answer');
    await fill(lastVisibleText(ans14), ad.questions);
  }

  // Scroll to the filled frame
  figma.viewport.scrollAndZoomIntoView([root]);
  figma.currentPage.selection = [root];
}

// ─── Message handler ──────────────────────────────────────────────────────────
figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'CREATE_BRIEF') {
      await fillBriefTemplate(msg.data);
      figma.ui.postMessage({ type: 'DONE' });
    } else if (msg.type === 'CREATE_COMPETITORS') {
      figma.ui.postMessage({ type: 'DONE' });
    }
  } catch (e) {
    figma.ui.postMessage({ type: 'ERROR', message: e.message });
  }
};
