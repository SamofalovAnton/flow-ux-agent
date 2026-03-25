import React, { useState, useRef, useEffect, useCallback } from 'react';
// Material Design Icons via Google Fonts (see index.html)
const Icon = ({ n, s = 20, style, ...rest }) => (
  <span className="material-icons" style={{ fontSize: s, lineHeight: 1, userSelect: 'none', display: 'inline-flex', alignItems: 'center', ...style }} {...rest}>{n}</span>
);
import AuthPage from './AuthPage';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Instrument Serif', Georgia, serif";

// ─── Storage helpers ──────────────────────────────────────────────────────────
const storage = {
  async get(key) {
    try {
      if (window.storage?.get) { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
      const v = localStorage.getItem(key); return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      if (window.storage?.set) await window.storage.set(key, JSON.stringify(value));
      else localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

// ─── API helper ───────────────────────────────────────────────────────────────
async function callClaude({ system, messages, signal }) {
  const apiKey = localStorage.getItem('anthropic_api_key');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4000, system, messages }),
    signal,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
  const d = await res.json();
  return d.content?.filter(i => i.type === 'text').map(i => i.text).join('\n') || '';
}

// ─── Brief groups ─────────────────────────────────────────────────────────────
const briefGroups = [
  { id: 'client', title: 'About the Client', emoji: '👤', fields: [
    { id: 'who',           label: 'Who is our client?' },
    { id: 'usp',           label: 'Unique Selling Proposition' },
    { id: 'advantages',    label: 'Functional advantages' },
    { id: 'disadvantages', label: 'Brand weaknesses' },
  ]},
  { id: 'audience', title: 'Audience', emoji: '👥', fields: [
    { id: 'who',  label: 'Who is the target audience?' },
    { id: 'buys', label: 'What sells best?' },
  ]},
  { id: 'goal', title: 'Goals', emoji: '🎯', fields: [
    { id: 'keyAction', label: 'Key action on the site' },
    { id: 'purpose',   label: 'Why does the client need a site?' },
  ]},
  { id: 'wishes', title: 'Wishes', emoji: '✨', fields: [
    { id: 'ui',          label: 'UI preferences' },
    { id: 'structure',   label: 'Structure & content preferences' },
    { id: 'limitations', label: 'Design limitations' },
  ]},
  { id: 'competition', title: 'Competition', emoji: '🔍', fields: [
    { id: 'competitors', label: 'Competitors (as told by client)' },
  ]},
  { id: 'additional', title: 'Additional', emoji: '📎', fields: [
    { id: 'materials', label: 'Client materials' },
    { id: 'questions', label: 'Questions to clarify' },
  ]},
];

// ─── Competitor groups ────────────────────────────────────────────────────────
const competitorGroups = [
  { id: 'ui_main',        title: 'UI — Main Screen',          emoji: '🖥️', fields: [{ id: 'hero', label: 'Hero section' }, { id: 'layout', label: 'Overall layout' }, { id: 'firstImpression', label: 'First impression' }] },
  { id: 'ui_fonts',       title: 'UI — Fonts',                emoji: '🔤', fields: [{ id: 'headings', label: 'Headings' }, { id: 'body', label: 'Body text' }, { id: 'style', label: 'Typography style' }] },
  { id: 'ui_colors',      title: 'UI — Colors',               emoji: '🎨', fields: [{ id: 'primary', label: 'Main palette' }, { id: 'accent', label: 'Accent colors' }, { id: 'mood', label: 'Mood / emotion' }] },
  { id: 'ui_decorations', title: 'UI — Decorations',          emoji: '✨', fields: [{ id: 'elements', label: 'Decorative elements' }, { id: 'animations', label: 'Animations & micro-interactions' }] },
  { id: 'ui_composition', title: 'UI — Composition',          emoji: '📐', fields: [{ id: 'grid', label: 'Grid system' }, { id: 'spacing', label: 'Spacing & rhythm' }, { id: 'balance', label: 'Element balance' }] },
  { id: 'funnel',         title: 'Structure & Sales Funnel',  emoji: '🔄', fields: [{ id: 'structure', label: 'Site structure' }, { id: 'cta', label: 'CTA & conversion points' }, { id: 'userPath', label: 'User journey' }] },
  { id: 'best_practices', title: 'Best Practices',            emoji: '⭐', fields: [{ id: 'strengths', label: 'Strong decisions' }, { id: 'innovative', label: 'Innovative approaches' }] },
  { id: 'ux',             title: 'UX',                        emoji: '🧭', fields: [{ id: 'navigation', label: 'Navigation' }, { id: 'usability', label: 'Usability' }, { id: 'accessibility', label: 'Mobile adaptation' }] },
  { id: 'cx',             title: 'CX Part',                   emoji: '💬', fields: [{ id: 'tone', label: 'Tone of voice' }, { id: 'trust', label: 'Trust elements' }, { id: 'emotional', label: 'Emotional connection' }] },
  { id: 'conclusion',     title: 'Conclusion', emoji: '📌', isConclusion: true, fields: [{ id: 'works_well', label: '✅ What works well' }, { id: 'works_poorly', label: '❌ What doesn\'t work / weaknesses' }, { id: 'to_remember', label: '📌 Key takeaways' }] },
];

// ─── Mode structures for steps 3–9 ───────────────────────────────────────────
const modeStructures = {
  sitemap: {
    groups: [
      { id: 'pages',      title: 'Pages',      emoji: '📄', fields: [{ id: 'main', label: 'Main pages' }, { id: 'sub', label: 'Sub-pages' }] },
      { id: 'navigation', title: 'Navigation', emoji: '🧭', fields: [{ id: 'menu', label: 'Menu structure' }, { id: 'footer', label: 'Footer' }] },
      { id: 'funnel',     title: 'Funnel',     emoji: '🔄', fields: [{ id: 'entry', label: 'Entry points' }, { id: 'conversion', label: 'Conversion points' }] },
      { id: 'seo',        title: 'SEO',        emoji: '🔍', fields: [{ id: 'priorities', label: 'SEO priorities' }] },
    ],
    extractPrompt: 'Extract the site structure from the conversation as JSON. Return ONLY JSON:\n{"pages":{"main":"","sub":""},"navigation":{"menu":"","footer":""},"funnel":{"entry":"","conversion":""},"seo":{"priorities":""}}',
  },
  wireframes: {
    groups: [
      { id: 'screens',    title: 'Screens',    emoji: '📱', fields: [{ id: 'list', label: 'Screen list' }, { id: 'main', label: 'Main screen' }] },
      { id: 'components', title: 'Components', emoji: '🧩', fields: [{ id: 'header', label: 'Header' }, { id: 'hero', label: 'Hero section' }, { id: 'cards', label: 'Cards / blocks' }] },
      { id: 'ux',         title: 'UX Notes',   emoji: '🧭', fields: [{ id: 'interactions', label: 'Interactions' }, { id: 'grid', label: 'Grid system' }] },
    ],
    extractPrompt: 'Extract the wireframe structure from the conversation as JSON. Return ONLY JSON:\n{"screens":{"list":"","main":""},"components":{"header":"","hero":"","cards":""},"ux":{"interactions":"","grid":""}}',
  },
  emotions: {
    groups: [
      { id: 'archetype', title: 'Archetype',     emoji: '🎭', fields: [{ id: 'main', label: 'Main archetype' }, { id: 'secondary', label: 'Secondary archetype' }] },
      { id: 'tone',      title: 'Tone of Voice', emoji: '🗣️', fields: [{ id: 'style', label: 'Communication style' }, { id: 'keywords', label: 'Keywords' }] },
      { id: 'emotion',   title: 'Emotion',       emoji: '💫', fields: [{ id: 'primary', label: 'Primary emotion' }, { id: 'userFeeling', label: 'What the user feels' }] },
    ],
    extractPrompt: 'Extract archetype and emotions from the conversation as JSON. Return ONLY JSON:\n{"archetype":{"main":"","secondary":""},"tone":{"style":"","keywords":""},"emotion":{"primary":"","userFeeling":""}}',
  },
  moodboard: {
    groups: [
      { id: 'typography', title: 'Typography', emoji: '🔤', fields: [{ id: 'heading', label: 'Heading font' }, { id: 'body', label: 'Body font' }] },
      { id: 'colors',     title: 'Colors',     emoji: '🎨', fields: [{ id: 'primary', label: 'Main colors' }, { id: 'accent', label: 'Accents' }, { id: 'background', label: 'Background' }] },
      { id: 'imagery',    title: 'Imagery',    emoji: '🖼️', fields: [{ id: 'style', label: 'Image style' }, { id: 'decorations', label: 'Decorative elements' }] },
      { id: 'animation',  title: 'Animation',  emoji: '✨', fields: [{ id: 'type', label: 'Animation type' }, { id: 'feel', label: 'Motion feel' }] },
    ],
    extractPrompt: 'Extract design decisions from the conversation as JSON. Return ONLY JSON:\n{"typography":{"heading":"","body":""},"colors":{"primary":"","accent":"","background":""},"imagery":{"style":"","decorations":""},"animation":{"type":"","feel":""}}',
  },
  concept: {
    groups: [
      { id: 'ideas',    title: 'Ideas',            emoji: '💡', fields: [{ id: 'list', label: 'All ideas' }, { id: 'top3', label: 'Top 3 concepts' }] },
      { id: 'selected', title: 'Selected Concept', emoji: '⭐', fields: [{ id: 'name', label: 'Concept name' }, { id: 'description', label: 'Description' }, { id: 'rationale', label: 'Why this one?' }] },
    ],
    extractPrompt: 'Extract design concepts from the conversation as JSON. Return ONLY JSON:\n{"ideas":{"list":"","top3":""},"selected":{"name":"","description":"","rationale":""}}',
  },
  strategy: {
    groups: [
      { id: 'strategy1',      title: 'Strategy 1',     emoji: '📊', fields: [{ id: 'name', label: 'Name' }, { id: 'visual', label: 'Visual direction' }, { id: 'ux', label: 'UX approach' }] },
      { id: 'strategy2',      title: 'Strategy 2',     emoji: '📈', fields: [{ id: 'name', label: 'Name' }, { id: 'visual', label: 'Visual direction' }, { id: 'ux', label: 'UX approach' }] },
      { id: 'recommendation', title: 'Recommendation', emoji: '🎯', fields: [{ id: 'choice', label: 'Recommended strategy' }, { id: 'reason', label: 'Rationale' }] },
    ],
    extractPrompt: 'Extract 2 design strategies from the conversation as JSON. Return ONLY JSON:\n{"strategy1":{"name":"","visual":"","ux":""},"strategy2":{"name":"","visual":"","ux":""},"recommendation":{"choice":"","reason":""}}',
  },
  final: {
    groups: [
      { id: 'hero',         title: 'Hero Screen', emoji: '🎯', fields: [{ id: 'layout', label: 'Layout / structure' }, { id: 'headline', label: 'Headline' }, { id: 'visual', label: 'Main visual' }] },
      { id: 'typography',   title: 'Typography',  emoji: '🔤', fields: [{ id: 'fonts', label: 'Fonts' }, { id: 'hierarchy', label: 'Hierarchy' }] },
      { id: 'colors',       title: 'Colors',      emoji: '🎨', fields: [{ id: 'palette', label: 'Palette' }, { id: 'application', label: 'Application' }] },
      { id: 'interactions', title: 'Interactions', emoji: '✨', fields: [{ id: 'animations', label: 'Animations' }, { id: 'transitions', label: 'Transitions' }] },
    ],
    extractPrompt: 'Extract the final design concept from the conversation as JSON. Return ONLY JSON:\n{"hero":{"layout":"","headline":"","visual":""},"typography":{"fonts":"","hierarchy":""},"colors":{"palette":"","application":""},"interactions":{"animations":"","transitions":""}}',
  },
};

// ─── Modes ────────────────────────────────────────────────────────────────────
const modes = [
  { id: 'brief',       title: 'Brief & Kickoff',      icon: 'assignment',      description: 'Client information gathering' },
  { id: 'competitors', title: 'Competitor Analysis',  icon: 'manage_search',   description: 'Design, UX, POD, POE, CX' },
  { id: 'sitemap',     title: 'Site Map',              icon: 'account_tree',    description: 'Structure & architecture' },
  { id: 'wireframes',  title: 'Wireframes',            icon: 'space_dashboard', description: 'Screen structure' },
  { id: 'emotions',    title: 'Emotions & Archetypes', icon: 'psychology',      description: 'Emotional tone' },
  { id: 'moodboard',   title: 'Design Session',        icon: 'palette',         description: 'Visual references' },
  { id: 'concept',     title: 'Concept Search',        icon: 'lightbulb',       description: 'Brainstorming' },
  { id: 'strategy',    title: 'Design Strategy',       icon: 'insights',        description: '2 strategies' },
  { id: 'final',       title: 'Final Concept',         icon: 'gps_fixed',       description: 'Hero screen' },
];

// ─── System prompts (in English — Claude will respond in English) ─────────────
const systemPrompts = {
  brief: `You are a briefing assistant for a UX/UI design project. Collect information naturally, as in a conversation with the client.

Brief structure — 6 groups:

**1. About the Client**
- Who is our client? (business, industry, product/service)
- What is the Unique Selling Proposition (USP)?
- What are the functional advantages?
- What are the brand weaknesses?

**2. Audience**
- Who is the target audience? (age, interests, pain points, needs)
- What sells best? (popular services/products)

**3. Goals**
- What is the key action on the site?
- Why does the client need a site?

**4. Wishes**
- UI preferences? (style, references, mood)
- Structure & content preferences?
- Design limitations?

**5. Competition**
- Who are the competitors? (record exactly what the client says)

**6. Additional**
- What additional materials did the client provide?
- What questions need clarification?

Rules:
- Ask questions naturally, 1–2 at a time
- Summarize each group briefly before moving on
- Record only competitors the client mentions
- Respond in English`,

  competitors: `You are a UX/UI design analyst. Analyze competitor websites in detail across 9 categories.

Important: if you receive a URL — describe what you know about that site from your knowledge. If you don't have enough information — ask for a screenshot or a detailed description.

For each competitor, provide a SEPARATE structured analysis:

**🖥️ UI — Main Screen:** Hero section, layout, first impression
**🔤 UI — Fonts:** Heading and body fonts, typography style
**🎨 UI — Colors:** Palette (HEX if possible), accents, mood
**✨ UI — Decorations:** Icons, illustrations, animations, scroll effects
**📐 UI — Composition:** Grid, spacing, balance
**🔄 Structure & Funnel:** Sections on the homepage, CTA, user journey
**⭐ Best Practices:** Strong decisions, innovative approaches
**🧭 UX:** Navigation, usability, mobile adaptation
**💬 CX Part:** Tone of voice, trust elements, emotional connection

After each competitor — conclusion:
✅ What works well
❌ What doesn't work / weaknesses
📌 Key takeaways for our project

Respond in English. Each competitor is a separate block.`,

  sitemap: `You are an information architecture and site mapping specialist.

Help the designer build a complete site structure.

Analyze and propose:
**📄 Pages:** What pages are needed (home, catalog, about, contact, blog, etc.)
**🧭 Navigation:** Main menu, sub-menus, footer navigation, breadcrumbs
**🔄 Funnel:** Journey from first visit to conversion, exit points
**🔍 SEO:** Key URL structures, priority pages
**📱 Mobile first:** Mobile navigation specifics

Structure as a hierarchy. Ask about:
- Business type and site goals
- Number of services/products
- Whether there's a blog, portfolio, case studies
- Target action (order, call, inquiry)

Respond in English.`,

  wireframes: `You are a UX architect and wireframing specialist.

Help the designer structure screen layouts.

Analyze and propose:
**📱 Screens:** Priority list of screens for wireframing
**🧩 Components:** Header, Hero, Features, Testimonials, CTA, Footer
**📐 Grid:** Columns, spacing, breakpoints (1440 / 1024 / 375)
**🧭 UX Flow:** How the user moves between screens
**♿ Accessibility:** Contrast, button sizes, readability

For each screen describe:
- What blocks and in what order
- CTA placement
- Content hierarchy

Respond in English.`,

  emotions: `You are an emotional design and branding specialist.

Use Jung's 12 archetypes and emotional design methods.

Analyze:
**🎭 Jung's Archetypes:** Hero, Creator, Explorer, Sage, Lover, Innocent, Ruler, Jester, Rebel, Magician, Caregiver, Orphan
**🗣️ Tone of Voice:** Formal/informal, friendly/authoritative, inspiring/technical
**💫 Emotions:** What is the primary feeling when interacting with the brand?
**🎯 Associations:** 5-7 key words that describe the brand

Ask about:
- Brand values
- How the client wants to be perceived
- What emotions should the visitor experience
- Reference brands with the right feel

Respond in English.`,

  moodboard: `You are an art director and visual designer.

Help the designer define the visual language of the project.

Analyze and propose specifically:
**🔤 Typography:** Specific fonts (Google Fonts or premium), their character and pairings
**🎨 Colors:** Exact palette (HEX) — primary, accent, background, text
**🖼️ Imagery:** Photos or illustrations, style, mood, color grading
**✨ Decorative elements:** Lines, shapes, textures, patterns, gradients
**🎬 Animations:** Speed, motion character (smooth/dynamic), what animates

Connect with archetypes and emotions from the previous step.
Respond in English.`,

  concept: `You are a creative director and design strategist.

Generate and analyze design concepts through brainstorming.

Methods:
**💡 Brainstorming:** 5-10 different concept ideas
**🔄 SCAMPER:** Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse
**🎯 How Might We:** "How might we..." problem framing
**🌐 References:** Analyze examples from different industries

For each concept:
- Name and brief idea (1 sentence)
- Key metaphor or image
- What the hero screen would look like

Help choose one concept and justify the choice.
Respond in English.`,

  strategy: `You are a design strategist and senior UX/UI designer.

Develop 2 distinct design strategies based on collected information.

For each strategy:
**📊 Name & Concept:** Short name + core approach
**🎨 Visual Direction:** Colors, fonts, style, mood
**🧭 UX Approach:** Structure, navigation, key decisions
**📝 Content Strategy:** How to present information
**⚡ Implementation Complexity:** Effort estimate

Strategies must be fundamentally DIFFERENT.
At the end — recommend one with justification.
Respond in English.`,

  final: `You are a senior UI designer specializing in concept presentation.

Describe the final design concept in detail for Figma implementation.

**🎯 Hero Screen:** Layout, composition, main message — what users see first
**🔤 Typography:** Specific fonts, sizes, weight, hierarchy
**🎨 Color Scheme:** Exact palette (HEX), where and how it's applied
**✨ Animations:** What animates and how, scroll effects, hover states
**📱 Responsiveness:** How it looks on mobile
**🧩 Key Components:** Unique UI elements of the project

Be as specific as possible.
Respond in English.`,
};

const getSystem = (modeId, projectData) => {
  const base = systemPrompts[modeId] || '';
  const structured = Object.entries(projectData || {})
    .filter(([k]) => k.endsWith('_structured') && projectData[k])
    .map(([k, v]) => `## ${k.replace('_structured', '')}:\n${JSON.stringify(v, null, 2)}`)
    .join('\n\n');
  return structured ? `${base}\n\n## Project context (previous steps):\n${structured}` : base;
};

const getInitialMessage = (modeId) => ({
  brief:       'Hi! Let\'s start the project brief. 🤝\n\nTell me about your business — what is the company, what do you do, what product or service do you offer?',
  competitors: 'Hi! Let\'s start the competitor analysis. 🔍\n\nPlease provide a screenshot of the competitor\'s site or a URL (note: I can\'t browse the internet, so a screenshot or description gives better results).\n\nI\'ll analyze across 9 categories: UI, UX, CX, Sales Funnel.\n\nWhich competitor shall we start with?',
  sitemap:     'Let\'s build the Site Map. 🗺️\n\nTell me about the site structure — how many pages are planned, what are the main sections? What type of business and what is the site\'s goal?',
  wireframes:  'Moving to Wireframes. 📐\n\nWhich screens should we design first? Let\'s start with the homepage — what should be in the Hero section?',
  emotions:    'Defining the emotional tone of the project. 🎭\n\nHow does the client want their brand to be perceived? What 3 words best describe the feeling of the company?',
  moodboard:   'Design Session — defining the visual language. 🎨\n\nProvide references (screenshots of sites you like) or describe the desired style. Minimalism, luxury, energy, trust?',
  concept:     'Concept Search — brainstorming time! 💡\n\nDescribe the project in 2-3 sentences and I\'ll generate 5-10 concept ideas. What main metaphor or image do we want to convey?',
  strategy:    'Developing the Design Strategy. 📊\n\nBased on the collected information I\'ll prepare 2 different strategies. Confirm priorities or add anything important to consider.',
  final:       'Final Concept! 🎯\n\nLet\'s describe the hero screen in detail. What is the core idea of the selected concept? I\'ll prepare a detailed description for Figma implementation.',
}[modeId] || `Hi! Ready to help with "${modeId}".`);

// ─── Auth gate wrapper ────────────────────────────────────────────────────────
export default function FlowAgent() {
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('flow:session') || 'null'); } catch { return null; }
  });
  if (!currentUser) return <AuthPage onLogin={(user) => setCurrentUser(user)} />;
  return <FlowApp currentUser={currentUser} onLogout={() => { localStorage.removeItem('flow:session'); setCurrentUser(null); }} />;
}

function FlowApp({ currentUser, onLogout }) {
  const [view, setView]                   = useState('projects');
  const [projects, setProjects]           = useState([]);
  const [loaded, setLoaded]               = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentMode, setCurrentMode]     = useState('brief');
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [abortCtrl, setAbortCtrl]         = useState(null);
  const [showNew, setShowNew]             = useState(false);
  const [newName, setNewName]             = useState('');
  const [editingId, setEditingId]         = useState(null);
  const [editName, setEditName]           = useState('');
  const [deletingProject, setDeletingProject] = useState(null);
  const [apiKey, setApiKey]               = useState(() => localStorage.getItem('anthropic_api_key') || '');
  const [showApiInput, setShowApiInput]   = useState(false);
  const [apiInput, setApiInput]           = useState('');
  const [briefData, setBriefData]         = useState({});
  const [briefSyncing, setBriefSyncing]   = useState(false);
  const [competitorData, setCompetitorData]   = useState({ competitors: [] });
  const [competitorSyncing, setCompetitorSyncing] = useState(false);
  const [selectedCompIdx, setSelectedCompIdx] = useState(0);
  const [modeData, setModeData]           = useState({});
  const [modeSyncing, setModeSyncing]     = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [projectTab, setProjectTab]               = useState('active'); // 'active' | 'archive'
  const [figmaModal, setFigmaModal]               = useState(null); // { projectName, type }
  const [rightPanelWidth, setRightPanelWidth]     = useState(300);
  const [selectedCallId, setSelectedCallId]       = useState(null);
  const [callSearch, setCallSearch]               = useState('');
  const [callAnalyzing, setCallAnalyzing]         = useState(false);

  const fileInputRef   = useRef(null);
  const messagesEndRef = useRef(null);
  const isDraggingRef  = useRef(false);
  const dragStartRef   = useRef({ x: 0, width: 0 });
  const importRef      = useRef(null);

  useEffect(() => {
    (async () => {
      const saved = await storage.get('flow:projects');
      if (saved) setProjects(saved.filter(p => !p.userId || p.userId === currentUser.userId));
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // Merge: keep other users' projects + current user's projects
    (async () => {
      const all = await storage.get('flow:projects') || [];
      const others = all.filter(p => p.userId && p.userId !== currentUser.userId);
      storage.set('flow:projects', [...others, ...projects]);
    })();
  }, [projects, loaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentProject?.messages, loading]);

  // ─── Resize right panel ───────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      if (!isDraggingRef.current) return;
      const delta = dragStartRef.current.x - e.clientX;
      const newW  = Math.min(600, Math.max(220, dragStartRef.current.width + delta));
      setRightPanelWidth(newW);
    };
    const onUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const updateProject = useCallback((updates) => {
    setCurrentProject(prev => {
      const updated = { ...prev, ...updates };
      setProjects(ps => ps.map(p => p.id === updated.id ? updated : p));
      return updated;
    });
  }, []);

  const createProject = () => {
    if (!newName.trim()) return;
    const proj = {
      id: Date.now().toString(),
      userId: currentUser.userId,
      name: newName.trim(),
      createdAt: new Date().toISOString(),
      important: false,
      completedAt: null,
      completedSteps: [],
      messages: Object.fromEntries(modes.map(m => [m.id, [{ role: 'assistant', content: getInitialMessage(m.id) }]])),
      files: Object.fromEntries(modes.map(m => [m.id, []])),
      projectData: {},
      calls: [],
    };
    setProjects(ps => [...ps, proj]);
    setNewName('');
    setShowNew(false);
  };

  const openProject = (p) => {
    setCurrentProject(p);
    setCurrentMode('brief');
    setBriefData(p.projectData?.brief_structured || {});
    setCompetitorData(p.projectData?.competitor_structured || { competitors: [] });
    setSelectedCompIdx(0);
    const restored = {};
    Object.keys(modeStructures).forEach(id => {
      if (p.projectData?.[`${id}_structured`]) restored[id] = p.projectData[`${id}_structured`];
    });
    setModeData(restored);
    setSelectedCallId(null);
    setCallSearch('');
    setView('workspace');
  };

  const markStepDone = () => {
    const steps = currentProject?.completedSteps || [];
    if (!steps.includes(currentMode)) updateProject({ completedSteps: [...steps, currentMode] });
  };

  const goNextStep = () => {
    const idx = modes.findIndex(m => m.id === currentMode);
    if (idx < modes.length - 1) setCurrentMode(modes[idx + 1].id);
  };

  const completeProject = () => {
    updateProject({ completedAt: new Date().toISOString(), completedSteps: modes.map(m => m.id) });
    setShowCompleteConfirm(false);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const newFiles = [];
    for (const file of files) {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      newFiles.push({ name: file.name, type: file.type, base64, size: (file.size / 1024).toFixed(1) + ' KB' });
    }
    updateProject({ files: { ...currentProject.files, [currentMode]: [...(currentProject.files[currentMode] || []), ...newFiles] } });
    e.target.value = '';
  };

  const sendMessage = async (text = input) => {
    const currFiles = currentProject.files[currentMode] || [];
    if (!text.trim() && !currFiles.length) return;
    const userMsg = { role: 'user', content: text || 'Analyze the files' };
    const history = currentProject.messages[currentMode] || [];
    const withUser = [...history, userMsg];
    updateProject({ messages: { ...currentProject.messages, [currentMode]: withUser } });
    setInput('');
    setLoading(true);
    const controller = new AbortController();
    setAbortCtrl(controller);
    try {
      const apiMessages = withUser.reduce((acc, m, i, arr) => {
        if (m.role === 'assistant') { acc.push({ role: 'assistant', content: m.content }); }
        else {
          const isLast = i === arr.length - 1;
          const parts = [];
          if (isLast && currFiles.length) {
            currFiles.forEach(f => {
              if (f.type === 'application/pdf') parts.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.base64 } });
              else if (f.type.startsWith('image/')) parts.push({ type: 'image', source: { type: 'base64', media_type: f.type, data: f.base64 } });
            });
          }
          parts.push({ type: 'text', text: m.content });
          acc.push({ role: 'user', content: parts.length === 1 ? parts[0].text : parts });
        }
        return acc;
      }, []);
      if (apiMessages[0]?.role === 'assistant') apiMessages.shift();
      const aiText = await callClaude({ system: getSystem(currentMode, currentProject.projectData), messages: apiMessages, signal: controller.signal });
      updateProject({
        messages: { ...currentProject.messages, [currentMode]: [...withUser, { role: 'assistant', content: aiText }] },
        files:    { ...currentProject.files,    [currentMode]: [] },
      });
    } catch (err) {
      const msg = err.name === 'AbortError' ? '⏸️ Stopped' : `❌ Error: ${err.message}`;
      updateProject({ messages: { ...currentProject.messages, [currentMode]: [...withUser, { role: 'assistant', content: msg }] } });
    } finally { setLoading(false); setAbortCtrl(null); }
  };

  const exportProject = () => {
    const parts = [
      `FLOW — ${currentProject.name}`,
      `Date: ${new Date().toLocaleDateString('en-US')}`,
      currentProject.completedAt ? `✅ Completed: ${new Date(currentProject.completedAt).toLocaleDateString('en-US')}` : '',
      '', '='.repeat(60),
    ];
    modes.forEach(m => {
      const msgs = currentProject.messages[m.id] || [];
      parts.push(`\n${m.icon} ${m.title.toUpperCase()}\n${'─'.repeat(40)}`);
      msgs.forEach(msg => parts.push(`\n[${msg.role === 'user' ? 'Designer' : 'Agent'}]:\n${msg.content}`));
      const structured = currentProject.projectData?.[`${m.id}_structured`];
      if (structured) parts.push(`\n[Structured data]:\n${JSON.stringify(structured, null, 2)}`);
    });
    const blob = new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${currentProject.name}.txt`; a.click();
  };

  const extractBrief = async () => {
    const msgs = currentProject?.messages['brief'] || [];
    if (msgs.length <= 1) return;
    setBriefSyncing(true);
    try {
      const conv = msgs.map(m => `[${m.role === 'user' ? 'Client' : 'Assistant'}]: ${m.content}`).join('\n\n');
      const text = await callClaude({
        system: 'Extract structured brief information from the conversation. Return ONLY JSON:\n{"client":{"who":"","usp":"","advantages":"","disadvantages":""},"audience":{"who":"","buys":""},"goal":{"keyAction":"","purpose":""},"wishes":{"ui":"","structure":"","limitations":""},"competition":{"competitors":""},"additional":{"materials":"","questions":""}}',
        messages: [{ role: 'user', content: `Brief conversation:\n\n${conv}` }],
      });
      const json = JSON.parse(text.replace(/```json|```/g, '').trim());
      setBriefData(json);
      updateProject({ projectData: { ...currentProject.projectData, brief_structured: json } });
    } catch (e) { console.error('Brief extract:', e); }
    setBriefSyncing(false);
  };

  const extractCompetitors = async () => {
    const msgs = currentProject?.messages['competitors'] || [];
    if (msgs.length <= 1) return;
    setCompetitorSyncing(true);
    try {
      const conv = msgs.map(m => `[${m.role === 'user' ? 'Designer' : 'Assistant'}]: ${m.content}`).join('\n\n');
      const text = await callClaude({
        system: 'Extract competitor analysis. Return ONLY JSON:\n{"competitors":[{"name":"","ui_main":{"hero":"","layout":"","firstImpression":""},"ui_fonts":{"headings":"","body":"","style":""},"ui_colors":{"primary":"","accent":"","mood":""},"ui_decorations":{"elements":"","animations":""},"ui_composition":{"grid":"","spacing":"","balance":""},"funnel":{"structure":"","cta":"","userPath":""},"best_practices":{"strengths":"","innovative":""},"ux":{"navigation":"","usability":"","accessibility":""},"cx":{"tone":"","trust":"","emotional":""},"conclusion":{"works_well":"","works_poorly":"","to_remember":""}}]}',
        messages: [{ role: 'user', content: `Competitor analysis conversation:\n\n${conv}` }],
      });
      const json = JSON.parse(text.replace(/```json|```/g, '').trim());
      setCompetitorData(json);
      setSelectedCompIdx(0);
      updateProject({ projectData: { ...currentProject.projectData, competitor_structured: json } });
    } catch (e) { console.error('Competitor extract:', e); }
    setCompetitorSyncing(false);
  };

  const extractMode = async (modeId) => {
    const msgs = currentProject?.messages[modeId] || [];
    if (msgs.length <= 1) return;
    setModeSyncing(prev => ({ ...prev, [modeId]: true }));
    try {
      const conv = msgs.map(m => `[${m.role === 'user' ? 'Designer' : 'Assistant'}]: ${m.content}`).join('\n\n');
      const text = await callClaude({
        system: modeStructures[modeId].extractPrompt + '\nLeave empty strings where information is missing.',
        messages: [{ role: 'user', content: `Conversation:\n\n${conv}` }],
      });
      const json = JSON.parse(text.replace(/```json|```/g, '').trim());
      setModeData(prev => ({ ...prev, [modeId]: json }));
      updateProject({ projectData: { ...currentProject.projectData, [`${modeId}_structured`]: json } });
    } catch (e) { console.error(`Extract ${modeId}:`, e); }
    setModeSyncing(prev => ({ ...prev, [modeId]: false }));
  };

  const copyToFigma = (type) => {
    let payload = '';
    if (type === 'brief') {
      const data = currentProject?.projectData?.brief_structured || briefData;
      payload = JSON.stringify({ type: 'flow_brief', projectName: currentProject.name, brief: data });
    } else if (type === 'competitors') {
      const stored = currentProject?.projectData?.competitor_structured || competitorData;
      payload = JSON.stringify({ type: 'flow_competitors', projectName: currentProject.name, competitors: stored?.competitors || [], groups: competitorGroups.map(g => ({ id: g.id, title: g.title, emoji: g.emoji, fields: g.fields })) });
    } else {
      const data = currentProject?.projectData?.[`${type}_structured`] || modeData[type];
      const mode = modes.find(m => m.id === type);
      payload = JSON.stringify({ type: 'flow_mode', modeId: type, modeTitle: mode?.title, projectName: currentProject.name, data, groups: modeStructures[type]?.groups });
    }
    navigator.clipboard.writeText(payload)
      .then(() => setFigmaModal({ projectName: currentProject.name, type }))
      .catch(() => alert('⚠ Copy failed — please try again'));
  };

  const saveApiKey = () => {
    const key = apiInput.trim();
    if (!key) return;
    localStorage.setItem('anthropic_api_key', key);
    setApiKey(key);
    setShowApiInput(false);
    setApiInput('');
  };

  // ─── Backup / Restore ─────────────────────────────────────────────────────
  const exportAllProjects = () => {
    const data = { version: 1, exportedAt: new Date().toISOString(), projects };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `flow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const importProjects = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed   = JSON.parse(ev.target.result);
        const imported = Array.isArray(parsed) ? parsed : (parsed.projects || []);
        const valid    = imported.filter(p => p.id && p.name);
        setProjects(prev => {
          const merged = [...prev];
          valid.forEach(p => {
            const idx = merged.findIndex(x => x.id === p.id);
            if (idx === -1) merged.push({ ...p, userId: currentUser.userId });
            else merged[idx] = { ...merged[idx], ...p };
          });
          return merged;
        });
      } catch { alert('Invalid backup file'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ─── Call helpers ─────────────────────────────────────────────────────────
  const createCall = () => {
    const call = {
      id: Date.now().toString(),
      title: 'Call ' + new Date().toLocaleDateString('en-US'),
      date: new Date().toISOString(),
      transcript: '',
      tasks: [],
      summary: '',
      analyzedAt: null,
    };
    updateProject({ calls: [...(currentProject?.calls || []), call] });
    setSelectedCallId(call.id);
  };

  const updateCall = (callId, updates) => {
    const calls = (currentProject?.calls || []).map(c => c.id === callId ? { ...c, ...updates } : c);
    updateProject({ calls });
  };

  const deleteCall = (callId) => {
    updateProject({ calls: (currentProject?.calls || []).filter(c => c.id !== callId) });
    if (selectedCallId === callId) setSelectedCallId(null);
  };

  const analyzeCall = async (call) => {
    if (!call.transcript.trim() || !apiKey) return;
    setCallAnalyzing(true);
    try {
      const text = await callClaude({
        system: `You are a project manager. Analyze the call transcript and extract action items and a brief summary.
Return ONLY valid JSON (no markdown fences):
{"tasks":[{"text":"action item","done":false}],"summary":"2-3 sentence summary"}`,
        messages: [{ role: 'user', content: `Transcript:\n\n${call.transcript}` }],
      });
      const json = JSON.parse(text.replace(/```json|```/g, '').trim());
      updateCall(call.id, {
        tasks: json.tasks || [],
        summary: json.summary || '',
        analyzedAt: new Date().toISOString(),
      });
    } catch (e) { console.error('analyzeCall:', e); }
    setCallAnalyzing(false);
  };

  // ─── Modal wrapper ────────────────────────────────────────────────────────
  const ModalWrap = ({ onClose, children }) => (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '480px', fontFamily: FONT_BODY }}>
        {children}
      </div>
    </div>
  );

  // ─── Projects view ────────────────────────────────────────────────────────
  if (view === 'projects') {
    const archiveProject   = (id) => setProjects(ps => ps.map(p => p.id === id ? { ...p, archived: true }  : p));
    const unarchiveProject = (id) => setProjects(ps => ps.map(p => p.id === id ? { ...p, archived: false } : p));

    const filtered = projects.filter(p => projectTab === 'archive' ? p.archived : !p.archived);
    const sorted = [...filtered].sort((a, b) => {
      if (a.important !== b.important) return a.important ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const tabBtn = (tab, label, count) => (
      <button onClick={() => setProjectTab(tab)} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: FONT_BODY, background: projectTab === tab ? '#1A1A1A' : 'transparent', color: projectTab === tab ? '#fff' : '#888' }}>
        {label}{count > 0 ? ` (${count})` : ''}
      </button>
    );

    return (
      <div style={{ minHeight: '100vh', background: '#FAFAFA', color: '#1A1A1A', fontFamily: FONT_BODY }}>
        <div style={{ padding: '48px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
            <div>
              <h1 style={{ fontSize: '56px', fontWeight: '400', marginBottom: '8px', letterSpacing: '-1px', fontFamily: FONT_DISPLAY, fontStyle: 'italic' }}>FLOW</h1>
              <p style={{ fontSize: '15px', color: '#666', fontFamily: FONT_BODY }}>Your Design Flow Partner</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
              <button onClick={() => setShowApiInput(true)}
                style={{ padding: '8px 16px', background: apiKey ? '#F0FFF4' : '#FFF8F0', border: apiKey ? '1px solid #9AE6B4' : '1px solid #FBD38D', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: apiKey ? '#276749' : '#744210', fontFamily: FONT_BODY }}>
                {apiKey ? '🔑 API Key ✓' : '🔑 Add API Key'}
              </button>
              <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={importProjects} />
              <button onClick={exportAllProjects} title="Export all projects to JSON backup"
                style={{ padding: '8px 14px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#444', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Icon n="download" s={15} />Backup
              </button>
              <button onClick={() => importRef.current?.click()} title="Restore projects from JSON backup"
                style={{ padding: '8px 14px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#444', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Icon n="upload" s={15} />Restore
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px 6px 8px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px' }}>
                {currentUser.picture
                  ? <img src={currentUser.picture} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: currentUser.avatarColor || '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                      {currentUser.name?.charAt(0).toUpperCase()}
                    </div>
                }
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1A1A1A' }}>{currentUser.name}</div>
                  <div style={{ fontSize: '11px', color: '#999' }}>{currentUser.email}</div>
                </div>
                <button onClick={onLogout} title="Sign out" style={{ marginLeft: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}>
                  <Icon n="logout" s={18} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '4px', background: '#F0F0F0', padding: '4px', borderRadius: '10px' }}>
              {tabBtn('active', 'Active', projects.filter(p => !p.archived).length)}
              {tabBtn('archive', 'Archive', projects.filter(p => p.archived).length)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {/* New project card — only on active tab */}
            {projectTab === 'active' && (
              <div onClick={() => setShowNew(true)} style={{ padding: '48px 32px', background: '#fff', border: '2px dashed #E5E5E5', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}><Icon n="add" s={28} style={{ color: '#666' }} /></div>
                <div style={{ fontSize: '15px', fontWeight: '600' }}>New Project</div>
              </div>
            )}

            {/* Empty archive state */}
            {projectTab === 'archive' && sorted.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 20px', color: '#BBB' }}>
                <Icon n="archive" s={40} style={{ marginBottom: '16px', opacity: 0.4, color: '#999' }} />
                <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>Archive is empty</div>
                <div style={{ fontSize: '13px' }}>Completed projects can be moved here</div>
              </div>
            )}

            {sorted.map(p => {
              const completedCount = (p.completedSteps || []).length;
              const isEditing = editingId === p.id;
              const isComplete = !!p.completedAt;
              return (
                <div key={p.id} onClick={() => !isEditing && !p.archived && openProject(p)}
                  style={{ padding: '28px', background: p.archived ? '#F9F9F9' : '#fff', border: p.important ? '2px solid #FFD700' : isComplete ? '2px solid #22C55E' : '1px solid #E5E5E5', borderRadius: '12px', cursor: isEditing || p.archived ? 'default' : 'pointer', minHeight: '220px', display: 'flex', flexDirection: 'column', position: 'relative', opacity: p.archived ? 0.85 : 1 }}>
                  {isComplete && !p.archived && <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#22C55E', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', color: '#fff' }}>✅ Completed</div>}
                  {p.archived && <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#E5E5E5', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', color: '#888', display: 'flex', alignItems: 'center', gap: '4px' }}><Icon n="archive" s={14} /> Archived</div>}
                  {p.important && !isComplete && !p.archived && <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#FFD700', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>⭐ Priority</div>}
                  <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: p.archived ? '#DDD' : '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}><Icon n="folder_open" s={22} style={{ color: '#fff' }} /></div>
                  {isEditing ? (
                    <div style={{ marginBottom: '8px' }}>
                      <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { setProjects(ps => ps.map(x => x.id === p.id ? { ...x, name: editName } : x)); setEditingId(null); } if (e.key === 'Escape') setEditingId(null); }}
                        onClick={e => e.stopPropagation()}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #1A1A1A', borderRadius: '6px', fontSize: '18px', fontWeight: '600', outline: 'none', boxSizing: 'border-box', fontFamily: FONT_BODY }} />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button onClick={e => { e.stopPropagation(); setProjects(ps => ps.map(x => x.id === p.id ? { ...x, name: editName } : x)); setEditingId(null); }} style={{ flex: 1, padding: '6px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: FONT_BODY }}>Save</button>
                        <button onClick={e => { e.stopPropagation(); setEditingId(null); }} style={{ flex: 1, padding: '6px', background: '#E5E5E5', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: FONT_BODY }}>Cancel</button>
                      </div>
                    </div>
                  ) : <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', flex: 1, fontFamily: FONT_BODY }}>{p.name}</h3>}
                  <div style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>{new Date(p.createdAt).toLocaleDateString('en-US')}</div>
                  <div style={{ display: 'flex', gap: '3px', marginBottom: '12px' }}>
                    {modes.map(m => {
                      const done = (p.completedSteps || []).includes(m.id);
                      const hasChat = (p.messages[m.id] || []).length > 1;
                      return <div key={m.id} title={m.title} style={{ flex: 1, height: '4px', borderRadius: '2px', background: done ? '#22C55E' : hasChat ? '#1A1A1A' : '#E5E5E5' }} />;
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #E5E5E5' }}>
                    <div style={{ fontSize: '13px', color: '#666' }}>{isComplete ? 'Project complete 🎉' : `${completedCount}/9 steps`}</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {p.archived ? (
                        <button onClick={e => { e.stopPropagation(); unarchiveProject(p.id); }} title="Restore from archive" style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontFamily: FONT_BODY }}>
                          <Icon n="unarchive" s={16} /> Restore
                        </button>
                      ) : (
                        <>
                          <button onClick={e => { e.stopPropagation(); setProjects(ps => ps.map(x => x.id === p.id ? { ...x, important: !x.important } : x)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: p.important ? '#F59E0B' : '#CCC' }}><Icon n="star" s={20} /></button>
                          <button onClick={e => { e.stopPropagation(); setEditingId(p.id); setEditName(p.name); }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}><Icon n="edit" s={20} /></button>
                          {isComplete && <button onClick={e => { e.stopPropagation(); archiveProject(p.id); }} title="Move to archive" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}><Icon n="archive" s={20} /></button>}
                          <button onClick={e => { e.stopPropagation(); setDeletingProject(p); }} style={{ background: 'none', border: 'none', color: '#CCC', cursor: 'pointer', padding: '4px' }}><Icon n="delete" s={20} /></button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showApiInput && (
          <ModalWrap onClose={() => setShowApiInput(false)}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Anthropic API Key</h2>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Stored locally in your browser</p>
            {apiKey && <div style={{ padding: '10px 14px', background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '8px', fontSize: '13px', color: '#276749', marginBottom: '16px' }}>✓ Current key: {apiKey.slice(0, 12)}...</div>}
            <input autoFocus type="password" value={apiInput} onChange={e => setApiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveApiKey()} placeholder="sk-ant-..." style={{ width: '100%', padding: '14px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowApiInput(false)} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontFamily: FONT_BODY }}>Cancel</button>
              <button onClick={saveApiKey} disabled={!apiInput.trim()} style={{ padding: '10px 20px', background: apiInput.trim() ? '#1A1A1A' : '#E5E5E5', border: 'none', borderRadius: '8px', color: '#fff', cursor: apiInput.trim() ? 'pointer' : 'not-allowed', fontSize: '14px', fontFamily: FONT_BODY }}>Save</button>
            </div>
          </ModalWrap>
        )}

        {showNew && (
          <ModalWrap onClose={() => setShowNew(false)}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>New Project</h2>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProject()} placeholder="Project name..." style={{ width: '100%', padding: '16px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '16px', marginBottom: '24px', outline: 'none', boxSizing: 'border-box', fontFamily: FONT_BODY }} />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNew(false)} style={{ padding: '12px 24px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontFamily: FONT_BODY }}>Cancel</button>
              <button onClick={createProject} disabled={!newName.trim()} style={{ padding: '12px 24px', background: newName.trim() ? '#1A1A1A' : '#E5E5E5', border: 'none', borderRadius: '8px', color: '#fff', cursor: newName.trim() ? 'pointer' : 'not-allowed', fontSize: '14px', fontFamily: FONT_BODY }}>Create</button>
            </div>
          </ModalWrap>
        )}

        {deletingProject && (
          <ModalWrap onClose={() => setDeletingProject(null)}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FEE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}><Icon n="delete" s={24} style={{ color: '#E53E3E' }} /></div>
            <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '8px' }}>Delete project?</h2>
            <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6', marginBottom: '24px' }}>Are you sure you want to delete <strong>"{deletingProject.name}"</strong>? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeletingProject(null)} style={{ padding: '12px 24px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontFamily: FONT_BODY }}>Cancel</button>
              <button onClick={() => { setProjects(ps => ps.filter(p => p.id !== deletingProject.id)); setDeletingProject(null); }} style={{ padding: '12px 24px', background: '#E53E3E', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontFamily: FONT_BODY }}>Delete</button>
            </div>
          </ModalWrap>
        )}
      </div>
    );
  }

  // ─── Workspace view ───────────────────────────────────────────────────────
  const currMsgs  = currentProject?.messages[currentMode] || [];
  const currFiles = currentProject?.files[currentMode] || [];
  const currMode  = modes.find(m => m.id === currentMode);
  const canSend   = !loading && (input.trim() || currFiles.length > 0);
  const modeIdx   = modes.findIndex(m => m.id === currentMode);
  const hasChat   = currMsgs.some(m => m.role === 'user');
  const isLastMode = modeIdx === modes.length - 1;
  const allDone   = (currentProject?.completedSteps || []).length === modes.length;

  const isSyncing = currentMode === 'brief' ? briefSyncing
    : currentMode === 'competitors' ? competitorSyncing
    : modeSyncing[currentMode] || false;

  const hasStructured = currentMode === 'brief'
    ? Object.keys(currentProject?.projectData?.brief_structured || briefData || {}).length > 0
    : currentMode === 'competitors'
    ? (currentProject?.projectData?.competitor_structured?.competitors || competitorData?.competitors || []).length > 0
    : !!(currentProject?.projectData?.[`${currentMode}_structured`] || modeData[currentMode]);

  const handleSync = () => {
    if (currentMode === 'brief') extractBrief();
    else if (currentMode === 'competitors') extractCompetitors();
    else extractMode(currentMode);
  };

  return (
    <div style={{ height: '100vh', background: '#E4E4E4', display: 'flex', flexDirection: 'column', fontFamily: FONT_BODY, color: '#1A1A1A' }}>

      {/* Figma Export Modal */}
      {figmaModal && (
        <div onClick={() => setFigmaModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '420px', fontFamily: FONT_BODY, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '22px' }}>✦</div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>Дані скопійовано!</h2>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '24px', lineHeight: '1.5' }}>
              <strong>{figmaModal.projectName}</strong> готовий до імпорту.<br/>
              Відкрий Figma і запусти плагін <strong>Brief Importer</strong> — він автоматично зчитає дані.
            </p>
            <div style={{ background: '#F5F5F5', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', fontSize: '12px', color: '#444', lineHeight: '1.8' }}>
              <div>1. Відкрий <strong>Figma Desktop</strong></div>
              <div>2. Плагіни → <strong>Brief Importer</strong> → Run</div>
              <div>3. Плагін автоматично знайде дані ✓</div>
              <div>4. Натисни <strong>Create in Figma</strong></div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="figma://" target="_blank" rel="noreferrer"
                style={{ flex: 1, padding: '11px', background: '#1A1A1A', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                ✦ Відкрити Figma
              </a>
              <button onClick={() => setFigmaModal(null)}
                style={{ flex: 1, padding: '11px', background: '#fff', border: '1px solid #E5E5E5', color: '#1A1A1A', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '12px 24px', background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setView('projects')} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#444' }}><Icon n="arrow_back" s={22} /></button>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '1px' }}>{currentProject?.name}</h1>
            <p style={{ fontSize: '11px', color: '#888' }}>FLOW · {(currentProject?.completedSteps || []).length}/9 steps</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setShowApiInput(true)} style={{ padding: '7px 12px', background: apiKey ? '#F0FFF4' : '#FFF8F0', border: '0px solid #1A1A1A', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: apiKey ? '#276749' : '#744210' }}>{apiKey ? '🔑 ✓' : '🔑 API'}</button>
          <button onClick={exportProject} style={{ padding: '7px 14px', background: '#fff', border: '0px solid #1A1A1A', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}><Icon n="download" s={16} />Export</button>
          {!currentProject?.completedAt && (
            <button onClick={() => setShowCompleteConfirm(true)}
              style={{ padding: '7px 14px', background: allDone ? '#22C55E' : '#F5F5F5', border: '0px solid #1A1A1A', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: allDone ? '#fff' : '#999', fontWeight: '600' }}>
              {allDone ? '🎉 Complete Project' : `✓ Complete (${(currentProject?.completedSteps || []).length}/9)`}
            </button>
          )}
          {currentProject?.completedAt && <div style={{ padding: '7px 14px', background: '#F0FFF4', border: '0px solid #1A1A1A', borderRadius: '8px', fontSize: '12px', color: '#276749', fontWeight: '600' }}>✅ Completed</div>}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#E4E4E4', gap: '8px', padding: '8px' }}>
        {/* Sidebar */}
        <div style={{ width: sidebarCollapsed ? '56px' : '220px', background: '#fff', borderRadius: '10px', display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'width 0.2s ease', overflow: 'hidden' }}>
          <div style={{ padding: sidebarCollapsed ? '12px 0' : '12px 12px', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', borderBottom: '1px solid #E5E5E5', flexShrink: 0 }}>
            {!sidebarCollapsed && <span style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Process Steps</span>}
            <button onClick={() => setSidebarCollapsed(c => !c)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#999', display: 'flex', alignItems: 'center', borderRadius: '4px' }}>
              <Icon n={sidebarCollapsed ? 'chevron_right' : 'chevron_left'} s={18} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: sidebarCollapsed ? '8px 6px' : '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {modes.map((m, i) => {
              const active = currentMode === m.id;
              const done   = (currentProject?.completedSteps || []).includes(m.id);
              const hasMsg = (currentProject?.messages[m.id] || []).length > 1;
              return (
                <div key={m.id} onClick={() => setCurrentMode(m.id)} title={sidebarCollapsed ? `${i + 1}. ${m.title}` : undefined}
                  style={{ padding: sidebarCollapsed ? '0' : '10px', background: active ? '#F5F5F5' : 'transparent', border: active ? '1px solid #1A1A1A' : '1px solid transparent', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: '8px', position: 'relative' }}>
                  <div style={{ width: sidebarCollapsed ? '36px' : '22px', height: sidebarCollapsed ? '36px' : '22px', borderRadius: sidebarCollapsed ? '8px' : '4px', background: done ? '#22C55E' : active ? '#1A1A1A' : '#F0F0F0', color: done || active ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0, overflow: 'hidden' }}>
                    {done ? <Icon n="check" s={sidebarCollapsed ? 16 : 13} style={{ color: '#fff' }} /> : (sidebarCollapsed ? <Icon n={m.icon} s={16} style={{ color: active ? '#fff' : '#888' }} /> : i + 1)}
                  </div>
                  {!sidebarCollapsed && (
                    <>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                        <div style={{ fontSize: '10px', color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.description}</div>
                      </div>
                      {hasMsg && !done && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1A1A1A', flexShrink: 0 }} />}
                    </>
                  )}
                  {sidebarCollapsed && done && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} />}
                </div>
              );
            })}

            {/* ── Client Calls ── */}
            <div style={{ height: '1px', background: '#E5E5E5', margin: '6px 0' }} />
            <div onClick={() => setCurrentMode('calls')}
              title={sidebarCollapsed ? 'Client Calls' : undefined}
              style={{ padding: sidebarCollapsed ? '0' : '10px', background: currentMode === 'calls' ? '#F5F5F5' : 'transparent', border: currentMode === 'calls' ? '1px solid #1A1A1A' : '1px solid transparent', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: '8px' }}>
              <div style={{ width: sidebarCollapsed ? '36px' : '22px', height: sidebarCollapsed ? '36px' : '22px', borderRadius: sidebarCollapsed ? '8px' : '4px', background: currentMode === 'calls' ? '#1A1A1A' : '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon n="phone" s={sidebarCollapsed ? 18 : 14} style={{ color: currentMode === 'calls' ? '#fff' : '#888' }} />
              </div>
              {!sidebarCollapsed && (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Client Calls</div>
                    <div style={{ fontSize: '10px', color: '#999', whiteSpace: 'nowrap' }}>Transcripts & tasks</div>
                  </div>
                  {(currentProject?.calls || []).length > 0 && (
                    <span style={{ fontSize: '10px', background: '#E5E5E5', color: '#666', padding: '1px 6px', borderRadius: '10px', fontWeight: '600' }}>
                      {(currentProject.calls).length}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {currentMode === 'calls' ? (
          <CallsView
            currentProject={currentProject}
            updateCall={updateCall}
            createCall={createCall}
            deleteCall={deleteCall}
            analyzeCall={analyzeCall}
            callAnalyzing={callAnalyzing}
            selectedCallId={selectedCallId}
            setSelectedCallId={setSelectedCallId}
            callSearch={callSearch}
            setCallSearch={setCallSearch}
            apiKey={apiKey}
            FONT_BODY={FONT_BODY}
          />
        ) : <>

        {/* Chat — Column 2 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', minWidth: 0, borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 24px', borderBottom: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <Icon n={currMode?.icon} s={20} style={{ color: '#444' }} />
                <h2 style={{ fontSize: '16px', fontWeight: '600' }}>{currMode?.title}</h2>
                <span style={{ fontSize: '11px', color: '#999', background: '#F5F5F5', padding: '2px 7px', borderRadius: '10px' }}>Step {modeIdx + 1}/9</span>
              </div>
              <p style={{ fontSize: '11px', color: '#999' }}>{currMode?.description}</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {!(currentProject?.completedSteps || []).includes(currentMode) && hasChat && (
                <button onClick={markStepDone} style={{ padding: '6px 12px', background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#276749', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon n="check" s={14} />Step done
                </button>
              )}
              {!isLastMode && (
                <button onClick={goNextStep} style={{ padding: '6px 12px', background: '#1A1A1A', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Next <Icon n="chevron_right" s={16} />
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {currMsgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0, background: m.role === 'user' ? '#1A1A1A' : '#F5F5F5', border: m.role === 'user' ? 'none' : '1px solid #E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.role === 'user' ? <Icon n="person" s={18} style={{ color: '#fff' }} /> : <Icon n="auto_awesome" s={16} style={{ color: '#888' }} />}
                </div>
                <div style={{ flex: 1, background: m.role === 'user' ? '#F5F5F5' : '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: '10px', padding: '12px 16px', whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '14px' }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#F5F5F5', border: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="auto_awesome" s={16} style={{ color: '#888' }} /></div>
                <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>{[0,1,2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1A1A1A', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: `${-0.32 + i * 0.16}s` }} />)}</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {currFiles.length > 0 && (
            <div style={{ padding: '10px 24px', borderTop: '1px solid #E5E5E5', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {currFiles.map((f, i) => (
                <div key={i} style={{ padding: '4px 10px', background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Icon n="description" s={14} />{f.name} <span style={{ color: '#888' }}>({f.size})</span>
                  <button onClick={() => updateProject({ files: { ...currentProject.files, [currentMode]: currFiles.filter((_, idx) => idx !== i) } })} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E5E5', background: '#FAFAFA', flexShrink: 0 }}>
            {!apiKey && (
              <div style={{ marginBottom: '8px', padding: '7px 12px', background: '#FFF8F0', border: '1px solid #FBD38D', borderRadius: '8px', fontSize: '12px', color: '#744210', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔑 API Key required
                <button onClick={() => setShowApiInput(true)} style={{ background: 'none', border: 'none', color: '#744210', cursor: 'pointer', textDecoration: 'underline', fontSize: '12px', padding: 0, fontFamily: FONT_BODY }}>Add →</button>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept=".pdf,image/*" style={{ display: 'none' }} />
            <div style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={currentMode === 'competitors' ? 'Upload a screenshot or describe the competitor site...' : 'Write a message... (Enter to send)'}
                style={{ width: '100%', padding: '12px 14px 6px', background: 'transparent', border: 'none', fontSize: '14px', resize: 'none', minHeight: '46px', maxHeight: '140px', fontFamily: FONT_BODY, outline: 'none', lineHeight: '1.6', boxSizing: 'border-box', color: '#1A1A1A' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 8px' }}>
                <button onClick={() => fileInputRef.current?.click()} title="Upload file or screenshot"
                  style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F5F5F5', border: '1px solid #E5E5E5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                  <Icon n="upload" s={18} />
                </button>
                <div style={{ fontSize: '10px', color: '#C0C0C0' }}>Shift+Enter — new line</div>
                <button onClick={() => loading ? abortCtrl?.abort() : sendMessage()} disabled={!loading && !canSend}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: loading ? '#E53E3E' : (canSend ? '#1A1A1A' : '#E0E0E0'), border: 'none', cursor: loading || canSend ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
                  {loading ? <span style={{ width: '9px', height: '9px', background: '#fff', borderRadius: '2px', display: 'block' }} /> : <Icon n="send" s={18} style={{ color: '#fff' }} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — Column 3 (resize handle is absolute overlay on left edge) */}
        <div style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
          <div
            onMouseDown={e => {
              isDraggingRef.current = true;
              dragStartRef.current  = { x: e.clientX, width: rightPanelWidth };
              document.body.style.cursor     = 'col-resize';
              document.body.style.userSelect = 'none';
              e.preventDefault();
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            style={{ position: 'absolute', left: '-8px', top: 0, bottom: 0, width: '16px', cursor: 'col-resize', zIndex: 20, borderRadius: '8px', transition: 'background 0.15s' }}
          />
          <RightPanel
          currentMode={currentMode}
          currentProject={currentProject}
          briefGroups={briefGroups}
          briefData={briefData}
          competitorGroups={competitorGroups}
          competitorData={competitorData}
          selectedCompIdx={selectedCompIdx}
          setSelectedCompIdx={setSelectedCompIdx}
          modeStructures={modeStructures}
          modeData={modeData}
          modes={modes}
          hasChat={hasChat}
          isSyncing={isSyncing}
          hasStructured={hasStructured}
          handleSync={handleSync}
          copyToFigma={copyToFigma}
          FONT_BODY={FONT_BODY}
          width={rightPanelWidth}
        />
        </div>
        </>}
      </div>

      {showApiInput && (
        <ModalWrap onClose={() => setShowApiInput(false)}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Anthropic API Key</h2>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Stored locally in your browser</p>
          {apiKey && <div style={{ padding: '10px 14px', background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '8px', fontSize: '13px', color: '#276749', marginBottom: '16px' }}>✓ Current key: {apiKey.slice(0, 12)}...</div>}
          <input autoFocus type="password" value={apiInput} onChange={e => setApiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveApiKey()} placeholder="sk-ant-..." style={{ width: '100%', padding: '14px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowApiInput(false)} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontFamily: FONT_BODY }}>Cancel</button>
            <button onClick={saveApiKey} disabled={!apiInput.trim()} style={{ padding: '10px 20px', background: apiInput.trim() ? '#1A1A1A' : '#E5E5E5', border: 'none', borderRadius: '8px', color: '#fff', cursor: apiInput.trim() ? 'pointer' : 'not-allowed', fontSize: '14px', fontFamily: FONT_BODY }}>Save</button>
          </div>
        </ModalWrap>
      )}

      {showCompleteConfirm && (
        <ModalWrap onClose={() => setShowCompleteConfirm(false)}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Complete project?</h2>
          <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6', marginBottom: '24px' }}>Mark <strong>"{currentProject?.name}"</strong> as completed. You can always continue working on it.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowCompleteConfirm(false)} style={{ padding: '12px 24px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontFamily: FONT_BODY }}>Cancel</button>
            <button onClick={completeProject} style={{ padding: '12px 24px', background: '#22C55E', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: FONT_BODY }}>Complete ✓</button>
          </div>
        </ModalWrap>
      )}

      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }`}</style>
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────
function RightPanel({ currentMode, currentProject, briefGroups, briefData, competitorGroups, competitorData, selectedCompIdx, setSelectedCompIdx, modeStructures, modeData, modes, hasChat, isSyncing, hasStructured, handleSync, copyToFigma, FONT_BODY, width }) {

  const PanelField = ({ label, value, colors }) => (
    <div style={{ background: colors?.bg || '#fff', border: `1px solid ${colors?.border || '#E5E5E5'}`, borderRadius: '8px', padding: '9px 11px', marginBottom: '5px' }}>
      <div style={{ fontSize: '10px', color: colors?.label || '#999', marginBottom: '3px', fontWeight: '600', fontFamily: FONT_BODY }}>{label}</div>
      <div style={{ fontSize: '12px', color: value ? '#1A1A1A' : '#CCC', lineHeight: '1.5', whiteSpace: 'pre-wrap', fontFamily: FONT_BODY }}>{value || '—'}</div>
    </div>
  );

  const syncDisabled = isSyncing || !hasChat;
  const figmaDisabled = !hasStructured;

  const PanelHeader = ({ title }) => (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid #E5E5E5', flexShrink: 0 }}>
      <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '8px', fontFamily: FONT_BODY }}>{title}</div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={handleSync} disabled={syncDisabled}
          title={!hasChat ? 'Start a conversation in the chat first' : ''}
          style={{ flex: 1, padding: '6px 0', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '600', background: syncDisabled ? '#F0F0F0' : '#1A1A1A', color: syncDisabled ? '#BBB' : '#fff', cursor: syncDisabled ? 'not-allowed' : 'pointer', fontFamily: FONT_BODY }}>
          {isSyncing ? '⏳ Sync...' : '⚡ Sync'}
        </button>
        <button onClick={() => copyToFigma(currentMode)} disabled={figmaDisabled}
          title={figmaDisabled ? 'Sync first to enable Figma export' : 'Export to Figma'}
          style={{ flex: 1, padding: '6px 0', borderRadius: '6px', fontSize: '11px', background: figmaDisabled ? '#F8F8F8' : '#fff', border: figmaDisabled ? '1px solid #F0F0F0' : '1px solid #E5E5E5', color: figmaDisabled ? '#CCC' : '#1A1A1A', cursor: figmaDisabled ? 'not-allowed' : 'pointer', fontFamily: FONT_BODY }}>
          ✦ Figma
        </button>
      </div>
    </div>
  );

  const panelStyle = { width: `${width || 300}px`, background: '#FAFAFA', borderRadius: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 };

  if (currentMode === 'brief') {
    const data = currentProject?.projectData?.brief_structured || briefData || {};
    return (
      <div style={panelStyle}>
        <PanelHeader title="Brief Summary" />
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {briefGroups.map(group => {
            const gd = data[group.id] || {};
            const hasData = group.fields.some(f => gd[f.id]?.trim());
            return (
              <div key={group.id} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px' }}>{group.emoji}</span>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: FONT_BODY }}>{group.title}</span>
                  {hasData && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C55E', marginLeft: 'auto' }} />}
                </div>
                {group.fields.map(f => <PanelField key={f.id} label={f.label} value={gd[f.id]} />)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (currentMode === 'competitors') {
    const stored = currentProject?.projectData?.competitor_structured || competitorData;
    const list   = stored?.competitors || [];
    const active = list[selectedCompIdx] || null;
    const conclusionColors = {
      works_well:   { bg: '#F0FFF4', border: '#9AE6B4', label: '#276749' },
      works_poorly: { bg: '#FFF5F5', border: '#FEB2B2', label: '#C53030' },
      to_remember:  { bg: '#FFFBEB', border: '#FBD38D', label: '#744210' },
    };
    return (
      <div style={{ ...panelStyle, width: `${Math.max(width || 300, 320)}px` }}>
        <PanelHeader title="Competitor Analysis" />
        {list.length > 0 && (
          <div style={{ padding: '7px 10px', borderBottom: '1px solid #E5E5E5', display: 'flex', gap: '5px', flexWrap: 'wrap', flexShrink: 0, background: '#fff' }}>
            {list.map((comp, idx) => (
              <button key={idx} onClick={() => setSelectedCompIdx(idx)}
                style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', border: 'none', background: selectedCompIdx === idx ? '#1A1A1A' : '#F0F0F0', color: selectedCompIdx === idx ? '#fff' : '#555', whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: FONT_BODY }}>
                {comp.name || `Competitor ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {!active ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#CCC' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔍</div>
              <div style={{ fontSize: '12px', lineHeight: '1.6', fontFamily: FONT_BODY }}>Press <strong>⚡ Sync</strong><br/>after analyzing competitors in chat</div>
            </div>
          ) : (
            <>
              {competitorGroups.filter(g => !g.isConclusion).map(group => {
                const gd = active[group.id] || {};
                const hasData = group.fields.some(f => gd[f.id]?.trim());
                return (
                  <div key={group.id} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px' }}>{group.emoji}</span>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: FONT_BODY }}>{group.title}</span>
                      {hasData && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C55E', marginLeft: 'auto' }} />}
                    </div>
                    {group.fields.map(f => <PanelField key={f.id} label={f.label} value={gd[f.id]} />)}
                  </div>
                );
              })}
              {(() => {
                const c = active.conclusion || {};
                const cg = competitorGroups.find(g => g.isConclusion);
                return (
                  <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '2px solid #1A1A1A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px' }}>📌</span>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: FONT_BODY }}>Conclusion</span>
                    </div>
                    {cg.fields.map(f => <PanelField key={f.id} label={f.label} value={c[f.id]} colors={conclusionColors[f.id]} />)}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    );
  }

  const structure = modeStructures[currentMode];
  if (!structure) return null;
  const data = currentProject?.projectData?.[`${currentMode}_structured`] || modeData[currentMode] || null;
  const currModeInfo = modes.find(m => m.id === currentMode);

  return (
    <div style={panelStyle}>
      <PanelHeader title={currModeInfo?.title || currentMode} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {!data ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#CCC' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>{currModeInfo?.icon}</div>
            <div style={{ fontSize: '12px', lineHeight: '1.6', fontFamily: FONT_BODY }}>Press <strong>⚡ Sync</strong><br/>after working in the chat</div>
          </div>
        ) : (
          structure.groups.map(group => {
            const gd = data[group.id] || {};
            const hasData = group.fields.some(f => gd[f.id]?.trim());
            return (
              <div key={group.id} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px' }}>{group.emoji}</span>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: FONT_BODY }}>{group.title}</span>
                  {hasData && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C55E', marginLeft: 'auto' }} />}
                </div>
                {group.fields.map(f => (
                  <div key={f.id} style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', padding: '9px 11px', marginBottom: '5px' }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '3px', fontWeight: '600', fontFamily: FONT_BODY }}>{f.label}</div>
                    <div style={{ fontSize: '12px', color: gd[f.id] ? '#1A1A1A' : '#CCC', lineHeight: '1.5', whiteSpace: 'pre-wrap', fontFamily: FONT_BODY }}>{gd[f.id] || '—'}</div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Calls View ───────────────────────────────────────────────────────────────
function CallsView({ currentProject, updateCall, createCall, deleteCall, analyzeCall, callAnalyzing, selectedCallId, setSelectedCallId, callSearch, setCallSearch, apiKey, FONT_BODY }) {
  const calls        = currentProject?.calls || [];
  const filtered     = calls.filter(c =>
    c.title.toLowerCase().includes(callSearch.toLowerCase()) ||
    c.transcript.toLowerCase().includes(callSearch.toLowerCase())
  );
  const selectedCall = calls.find(c => c.id === selectedCallId) || null;

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput,   setTitleInput]   = useState('');

  const commitTitle = () => {
    if (titleInput.trim()) updateCall(selectedCall.id, { title: titleInput.trim() });
    setEditingTitle(false);
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {/* ── Calls list ── */}
      <div style={{ width: '260px', background: '#FAFAFA', borderRight: '1px solid #E5E5E5', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #E5E5E5', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#999', fontFamily: FONT_BODY }}>Client Calls</span>
            <button onClick={createCall}
              style={{ width: '26px', height: '26px', background: '#1A1A1A', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', lineHeight: 1 }}>+</button>
          </div>
          <input value={callSearch} onChange={e => setCallSearch(e.target.value)} placeholder="Search calls..."
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: FONT_BODY }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 12px', color: '#CCC' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>📞</div>
              <div style={{ fontSize: '12px', lineHeight: '1.6', fontFamily: FONT_BODY }}>
                {callSearch ? 'No results' : 'No calls yet.\nClick + to add one.'}
              </div>
            </div>
          ) : filtered.map(c => {
            const active    = c.id === selectedCallId;
            const taskTotal = (c.tasks || []).length;
            const taskDone  = (c.tasks || []).filter(t => t.done).length;
            return (
              <div key={c.id} onClick={() => setSelectedCallId(c.id)}
                style={{ padding: '10px 12px', marginBottom: '4px', background: active ? '#fff' : 'transparent', border: active ? '1px solid #1A1A1A' : '1px solid transparent', borderRadius: '8px', cursor: 'pointer' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '3px', fontFamily: FONT_BODY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#999', fontFamily: FONT_BODY }}>{new Date(c.date).toLocaleDateString('en-US')}</span>
                  {taskTotal > 0 && (
                    <span style={{ fontSize: '10px', background: taskDone === taskTotal ? '#F0FFF4' : '#F5F5F5', color: taskDone === taskTotal ? '#276749' : '#666', padding: '1px 6px', borderRadius: '8px', fontWeight: '600', fontFamily: FONT_BODY }}>
                      {taskDone}/{taskTotal}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── No call selected ── */}
      {!selectedCall ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', gap: '12px', color: '#CCC' }}>
          <div style={{ fontSize: '40px' }}>📞</div>
          <div style={{ fontSize: '14px', fontFamily: FONT_BODY }}>Select a call or create a new one</div>
          <button onClick={createCall}
            style={{ padding: '9px 22px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontFamily: FONT_BODY }}>
            + New Call
          </button>
        </div>
      ) : (

        /* ── Selected call: transcript + tasks ── */
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Transcript column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRight: '1px solid #E5E5E5', overflow: 'hidden' }}>

            {/* Call header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              {editingTitle ? (
                <input autoFocus value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                  style={{ flex: 1, fontSize: '15px', fontWeight: '600', border: '1px solid #1A1A1A', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontFamily: FONT_BODY }} />
              ) : (
                <div onClick={() => { setEditingTitle(true); setTitleInput(selectedCall.title); }}
                  title="Click to rename"
                  style={{ flex: 1, fontSize: '15px', fontWeight: '600', cursor: 'text', fontFamily: FONT_BODY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedCall.title}
                </div>
              )}

              <input type="date" value={selectedCall.date.slice(0, 10)}
                onChange={e => updateCall(selectedCall.id, { date: new Date(e.target.value + 'T12:00:00').toISOString() })}
                style={{ padding: '4px 8px', border: '1px solid #E5E5E5', borderRadius: '6px', fontSize: '12px', outline: 'none', fontFamily: FONT_BODY }} />

              {!apiKey && (
                <span style={{ fontSize: '11px', color: '#F59E0B', background: '#FFFBEB', padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>API key needed</span>
              )}

              <button onClick={() => analyzeCall(selectedCall)}
                disabled={callAnalyzing || !selectedCall.transcript.trim() || !apiKey}
                style={{ padding: '7px 14px', background: callAnalyzing ? '#999' : '#1A1A1A', color: '#fff', border: 'none', borderRadius: '8px', cursor: callAnalyzing || !selectedCall.transcript.trim() || !apiKey ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', fontFamily: FONT_BODY, opacity: (!selectedCall.transcript.trim() || !apiKey) ? 0.5 : 1 }}>
                {callAnalyzing ? '⏳ Analyzing...' : '✦ Analyze'}
              </button>

              <button onClick={() => { if (window.confirm('Delete this call?')) deleteCall(selectedCall.id); }}
                title="Delete call"
                style={{ width: '30px', height: '30px', background: 'none', border: '1px solid #E5E5E5', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#AAA', flexShrink: 0, fontSize: '15px' }}>
                🗑
              </button>
            </div>

            {/* Transcript label */}
            <div style={{ padding: '8px 20px 2px', fontSize: '10px', color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: FONT_BODY, flexShrink: 0 }}>
              Transcript
            </div>

            {/* Textarea */}
            <textarea value={selectedCall.transcript}
              onChange={e => updateCall(selectedCall.id, { transcript: e.target.value })}
              placeholder="Paste or type the call transcript here..."
              style={{ flex: 1, padding: '8px 20px 20px', border: 'none', outline: 'none', resize: 'none', fontSize: '14px', lineHeight: '1.75', fontFamily: FONT_BODY, color: '#1A1A1A', background: '#fff' }} />
          </div>

          {/* Tasks panel */}
          <div style={{ width: '300px', background: '#FAFAFA', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #E5E5E5', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', fontFamily: FONT_BODY }}>
                Action Items
                {selectedCall.analyzedAt && <span style={{ marginLeft: '6px', color: '#22C55E' }}>✓ analyzed</span>}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {/* Summary block */}
              {selectedCall.summary && (
                <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '5px', fontFamily: FONT_BODY }}>Summary</div>
                  <div style={{ fontSize: '12px', color: '#444', lineHeight: '1.6', fontFamily: FONT_BODY }}>{selectedCall.summary}</div>
                </div>
              )}

              {/* Task list */}
              {(selectedCall.tasks || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: '#CCC', fontSize: '12px', lineHeight: '1.6', fontFamily: FONT_BODY }}>
                  {selectedCall.transcript.trim()
                    ? 'Click ✦ Analyze to extract tasks from the transcript'
                    : 'Add a transcript, then click ✦ Analyze'}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', fontFamily: FONT_BODY }}>
                    {(selectedCall.tasks).filter(t => t.done).length}/{(selectedCall.tasks).length} completed
                  </div>
                  {(selectedCall.tasks).map((task, idx) => (
                    <div key={idx}
                      onClick={() => updateCall(selectedCall.id, {
                        tasks: selectedCall.tasks.map((t, i) => i === idx ? { ...t, done: !t.done } : t)
                      })}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', marginBottom: '5px', cursor: 'pointer', opacity: task.done ? 0.55 : 1 }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${task.done ? '#22C55E' : '#CCC'}`, background: task.done ? '#22C55E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        {task.done && <span style={{ color: '#fff', fontSize: '10px', fontWeight: '700' }}>✓</span>}
                      </div>
                      <span style={{ fontSize: '12px', lineHeight: '1.5', fontFamily: FONT_BODY, color: '#1A1A1A', textDecoration: task.done ? 'line-through' : 'none' }}>{task.text}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Manual task input */}
              <AddTaskInput FONT_BODY={FONT_BODY}
                onAdd={text => updateCall(selectedCall.id, {
                  tasks: [...(selectedCall.tasks || []), { id: Date.now().toString(), text, done: false }]
                })} />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Add Task Input ───────────────────────────────────────────────────────────
function AddTaskInput({ onAdd, FONT_BODY }) {
  const [text, setText] = useState('');
  const submit = () => { if (text.trim()) { onAdd(text.trim()); setText(''); } };
  return (
    <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
      <input value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Add task manually..."
        style={{ flex: 1, padding: '7px 10px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '12px', outline: 'none', fontFamily: FONT_BODY }} />
      <button onClick={submit}
        style={{ padding: '7px 10px', background: text.trim() ? '#1A1A1A' : '#E5E5E5', border: 'none', borderRadius: '8px', cursor: text.trim() ? 'pointer' : 'not-allowed', fontSize: '13px', color: '#fff', fontFamily: FONT_BODY }}>+</button>
    </div>
  );
}
