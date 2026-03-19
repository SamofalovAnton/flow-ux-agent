import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Upload, FileText, Download, Plus, Check, User, Sparkles, FolderOpen, ArrowLeft, Trash2, Edit2, Star } from 'lucide-react';

// ─── Storage helpers (window.storage → localStorage fallback) ─────────────────
const storage = {
  async get(key) {
    try {
      if (window.storage?.get) {
        const r = await window.storage.get(key);
        return r ? JSON.parse(r.value) : null;
      }
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      if (window.storage?.set) {
        await window.storage.set(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {}
  },
};

// ─── API helper ───────────────────────────────────────────────────────────────
async function callClaude({ system, messages, signal }) {
  const apiKey = localStorage.getItem('anthropic_api_key');
  const headers = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  if (apiKey) headers['x-api-key'] = apiKey;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20251001',
      max_tokens: 4000,
      system,
      messages,
    }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.content?.filter(i => i.type === 'text').map(i => i.text).join('\n') || '';
}

// ─── Brief structure ──────────────────────────────────────────────────────────
const briefGroups = [
  {
    id: 'client', title: 'Про клієнта', emoji: '👤',
    fields: [
      { id: 'who',          label: 'Хто наш клієнт?' },
      { id: 'usp',          label: 'Унікальна Торгівельна Пропозиція' },
      { id: 'advantages',   label: 'Функціональні переваги' },
      { id: 'disadvantages',label: 'Недоліки бренду' },
    ],
  },
  {
    id: 'goal', title: 'Мета', emoji: '🎯',
    fields: [
      { id: 'keyAction', label: 'Ключова дія на сайті' },
      { id: 'purpose',   label: 'Навіщо клієнту сайт?' },
    ],
  },
  {
    id: 'wishes', title: 'Побажання', emoji: '✨',
    fields: [
      { id: 'ui',          label: 'Побажання по UI' },
      { id: 'structure',   label: 'Побажання по структурі та контенту' },
      { id: 'limitations', label: 'Обмеження для дизайну' },
    ],
  },
  {
    id: 'competition', title: 'Конкуренція', emoji: '🔍',
    fields: [
      { id: 'competitors', label: 'Конкуренти (зі слів клієнта)' },
    ],
  },
  {
    id: 'additional', title: 'Додатково', emoji: '📎',
    fields: [
      { id: 'materials', label: 'Матеріали від клієнта' },
      { id: 'questions', label: 'Питання для уточнення' },
    ],
  },
];

// ─── Competitor analysis structure ───────────────────────────────────────────
const competitorGroups = [
  {
    id: 'ui_main', title: 'UI — Main Screen', emoji: '🖥️',
    fields: [
      { id: 'hero',            label: 'Hero section' },
      { id: 'layout',          label: 'Загальний layout' },
      { id: 'firstImpression', label: 'Перше враження' },
    ],
  },
  {
    id: 'ui_fonts', title: 'UI — Fonts', emoji: '🔤',
    fields: [
      { id: 'headings', label: 'Заголовки' },
      { id: 'body',     label: 'Основний текст' },
      { id: 'style',    label: 'Стиль типографіки' },
    ],
  },
  {
    id: 'ui_colors', title: 'UI — Colors', emoji: '🎨',
    fields: [
      { id: 'primary', label: 'Основна палітра' },
      { id: 'accent',  label: 'Акцентні кольори' },
      { id: 'mood',    label: 'Настрій / емоція' },
    ],
  },
  {
    id: 'ui_decorations', title: 'UI — Decorations', emoji: '✨',
    fields: [
      { id: 'elements',   label: 'Декоративні елементи' },
      { id: 'animations', label: 'Анімації та мікровзаємодії' },
    ],
  },
  {
    id: 'ui_composition', title: 'UI — Composition', emoji: '📐',
    fields: [
      { id: 'grid',    label: 'Grid система' },
      { id: 'spacing', label: 'Відступи та ритм' },
      { id: 'balance', label: 'Баланс елементів' },
    ],
  },
  {
    id: 'funnel', title: 'Структура та воронка продажів', emoji: '🔄',
    fields: [
      { id: 'structure', label: 'Структура сайту' },
      { id: 'cta',       label: 'CTA та точки конверсії' },
      { id: 'userPath',  label: 'Шлях користувача' },
    ],
  },
  {
    id: 'best_practices', title: 'Найкращі практики', emoji: '⭐',
    fields: [
      { id: 'strengths',   label: 'Сильні рішення' },
      { id: 'innovative',  label: 'Інноваційні підходи' },
    ],
  },
  {
    id: 'ux', title: 'UX', emoji: '🧭',
    fields: [
      { id: 'navigation',    label: 'Навігація' },
      { id: 'usability',     label: 'Зручність використання' },
      { id: 'accessibility', label: 'Мобільна адаптація' },
    ],
  },
  {
    id: 'cx', title: 'CX Part', emoji: '💬',
    fields: [
      { id: 'tone',      label: 'Tone of voice' },
      { id: 'trust',     label: 'Елементи довіри' },
      { id: 'emotional', label: 'Емоційний зв\'язок' },
    ],
  },
  {
    id: 'conclusion', title: 'Висновок', emoji: '📌',
    isConclusion: true,
    fields: [
      { id: 'works_well',   label: '✅ Що добре працює' },
      { id: 'works_poorly', label: '❌ Що погано / слабкі місця' },
      { id: 'to_remember',  label: '📌 Зафіксувати для роботи' },
    ],
  },
];

// ─── Modes ────────────────────────────────────────────────────────────────────
const modes = [
  { id: 'brief',       title: 'Бриф & Kickoff',    icon: '📋', description: 'Збір інформації від клієнта' },
  { id: 'competitors', title: 'Аналіз конкурентів', icon: '🔍', description: 'Дизайн, UX, POD, POE, CX' },
  { id: 'sitemap',     title: 'Site Map',            icon: '🗺️', description: 'Структура та архітектура' },
  { id: 'wireframes',  title: 'Wireframes',          icon: '📐', description: 'Структура екранів' },
  { id: 'emotions',    title: 'Емоції & Архетипи',   icon: '🎭', description: 'Емоційний тон' },
  { id: 'moodboard',   title: 'Design Session',      icon: '🎨', description: 'Візуальні референси' },
  { id: 'concept',     title: 'Пошук Ідеї',          icon: '💡', description: 'Brainstorming' },
  { id: 'strategy',    title: 'Design Strategy',     icon: '📊', description: '2 стратегії' },
  { id: 'final',       title: 'Фінальний Концепт',   icon: '🎯', description: 'Hero screen' },
];

const systemPrompts = {
  brief: `Ти — асистент з брифінгу для UX/UI проекту. Збирай інформацію природньо, як в діалозі з клієнтом.

Структура брифу — 5 груп:

**1. Про клієнта**
- Хто наш клієнт? (бізнес, сфера, продукт/послуга)
- Яка Унікальна Торгівельна Пропозиція (УТП)?
- Які функціональні переваги?
- Які є недоліки бренду?

**2. Мета**
- Яка ключова дія на сайті?
- Навіщо клієнту сайт?

**3. Побажання**
- Які побажання по UI?
- Які побажання по структурі та контенту?
- Які є обмеження для дизайну?

**4. Конкуренція**
- Хто наші конкуренти? (записуй точно те, що називає клієнт)

**5. Додатково**
- Які додаткові матеріали надав клієнт? (файли, посилання, референси)
- Які питання варто доуточнити?

Правила ведення брифу:
- Задавай питання природньо, по 1–2 за раз, не перевантажуй
- Коли зібрана інформація по групі — стисло підсумовуй і переходь далі
- Якщо клієнт надає файли або документи — фіксуй їх у "Додатково > Матеріали"
- Конкурентів записуй тільки тих, яких називає сам клієнт, без фантазій
- В "Питання для уточнення" фіксуй все, що залишилось незрозумілим
- Відповідай українською`,
  competitors: `Ти — UX/UI дизайнер-аналітик. Аналізуй сайти конкурентів детально за 9 категоріями.

Дизайнер може надати:
- URL сайту (проаналізуй за описом, якщо не маєш доступу — попроси скріншот)
- Скріншот або зображення сайту
- Опис сайту

Для кожного конкурента проводь СТРУКТУРОВАНИЙ аналіз:

**🖥️ UI — Main Screen**
- Hero section: елементи, головний меседж, візуальний акцент
- Загальний layout: кількість колонок, розміщення блоків
- Перше враження: загальне відчуття від головного екрану

**🔤 UI — Fonts**
- Заголовки: назва шрифту, вага, розмір, характер
- Основний текст: шрифт для body text
- Стиль типографіки: geometric / humanist / serif / display

**🎨 UI — Colors**
- Основна палітра: головні кольори (HEX якщо визначається)
- Акцентні кольори: CTA, hover, highlights
- Настрій/емоція: що відчуває користувач від кольорової схеми

**✨ UI — Decorations**
- Декоративні елементи: іконки, ілюстрації, фото, відео, gradient
- Анімації та мікровзаємодії: що анімується, scroll-ефекти

**📐 UI — Composition**
- Grid система: 12-col, asymmetric, fullwidth, centered
- Відступи та ритм: щільний / повітряний / мінімалістичний
- Баланс елементів: симетрія / асиметрія

**🔄 Структура та воронка продажів**
- Структура сайту: секції на головній сторінці по порядку
- CTA та точки конверсії: де розміщені, скільки, які
- Шлях користувача: як ведуть до цільової дії

**⭐ Найкращі практики**
- Сильні рішення: що варто запозичити
- Інноваційні підходи: нестандартні або сміливі рішення

**🧭 UX**
- Навігація: структура меню, breadcrumbs, search
- Зручність: легко знайти інформацію, ієрархія контенту
- Мобільна адаптація: адаптивність, touch-елементи

**💬 CX Part**
- Tone of voice: формальний / дружній / технічний / натхненний
- Елементи довіри: відгуки, кейси, лічильники, логотипи клієнтів
- Емоційний зв'язок: як бренд взаємодіє з аудиторією

Після аналізу — підсумуй:
**POD** (Points of Difference) — чим вирізняється
**POE** (Points of Equality) — що є стандартом у ніші

Після аналізу КОЖНОГО конкурента — обов'язково формуй висновок у такому форматі:
---
✅ **Що добре працює:** [конкретні сильні сторони]
❌ **Що погано / слабкі місця:** [конкретні проблеми]
📌 **Зафіксувати для роботи:** [що варто взяти / уникнути у нашому проекті]
---

Кожен конкурент — окремий блок аналізу зі своїм висновком.
Відповідай українською. Будь конкретним, з прикладами.`,
  sitemap:     'Ти експерт ІА. Створюй site maps з ієрархією, SEO, навігацією, воронками продажів.',
  wireframes:  'Ти експерт wireframes. Створюй детальні каркаси з grid, компонентами, UX принципами.',
  emotions:    'Ти експерт емоційного дизайну. Використовуй 12 архетипів Юнга, tone of voice.',
  moodboard:   'Ти експерт візуального дизайну. Підбирай шрифти, кольори, imagery, анімації.',
  concept:     'Ти креативний стратег. Генеруй 5-10 ідей через brainstorming, SCAMPER.',
  strategy:    'Ти дизайн-стратег. Створюй 2 різні стратегії: visual, UX, content, technical.',
  final:       'Ти senior UI дизайнер. Описуй hero section: layout, typography, colors, interactions.',
};

const getSystem = (modeId, projectData) => {
  const base = systemPrompts[modeId] + '\n\nВідповідай українською. Будь конкретним та структурованим.';
  const ctx = Object.entries(projectData || {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  return ctx ? `${base}\n\n## Контекст проекту:\n${ctx}` : base;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FlowAgent() {
  const [view, setView]                       = useState('projects');
  const [projects, setProjects]               = useState([]);
  const [loaded, setLoaded]                   = useState(false);
  const [currentProject, setCurrentProject]   = useState(null);
  const [currentMode, setCurrentMode]         = useState('brief');
  const [input, setInput]                     = useState('');
  const [loading, setLoading]                 = useState(false);
  const [abortCtrl, setAbortCtrl]             = useState(null);
  const [showNew, setShowNew]                 = useState(false);
  const [newName, setNewName]                 = useState('');
  const [editingId, setEditingId]             = useState(null);
  const [editName, setEditName]               = useState('');
  const [deletingProject, setDeletingProject] = useState(null);
  const [apiKey, setApiKey]                   = useState(() => localStorage.getItem('anthropic_api_key') || '');
  const [showApiInput, setShowApiInput]       = useState(false);
  const [apiInput, setApiInput]               = useState('');
  const [briefData, setBriefData]                 = useState({});
  const [briefSyncing, setBriefSyncing]           = useState(false);
  const [competitorData, setCompetitorData]         = useState({ competitors: [] });
  const [competitorSyncing, setCompetitorSyncing]   = useState(false);
  const [selectedCompetitorIdx, setSelectedCompetitorIdx] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed]   = useState(false);

  const fileInputRef   = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    (async () => {
      const saved = await storage.get('flow:projects');
      if (saved) setProjects(saved);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) storage.set('flow:projects', projects);
  }, [projects, loaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentProject?.messages, loading]);

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
      name: newName.trim(),
      createdAt: new Date().toISOString(),
      important: false,
      messages: Object.fromEntries(modes.map(m => [m.id, [
        { role: 'assistant', content:
            m.id === 'brief'
              ? `Привіт! Давай почнемо бриф для вашого проекту.\n\nПочнемо з основного: **розкажіть про ваш бізнес** — що це за компанія, чим займаєтесь, який продукт або послуга? 🤝`
              : m.id === 'competitors'
              ? `Привіт! Починаємо аналіз конкурентів. 🔍\n\nНадай мені:\n• **URL сайту** конкурента\n• або **скріншот / зображення** сайту\n\nЯ проведу детальний аналіз за 9 категоріями:\n🖥️ UI (Main Screen, Fonts, Colors, Decorations, Composition)\n🔄 Структура та воронка продажів\n⭐ Найкращі практики\n🧭 UX\n💬 CX Part\n\nЗ яким конкурентом починаємо?`
              : `Привіт! Режим "${m.title}". Готовий допомогти.`
        }
      ]])),
      files: Object.fromEntries(modes.map(m => [m.id, []])),
      projectData: {},
    };
    setProjects(ps => [...ps, proj]);
    setNewName('');
    setShowNew(false);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    const newFiles = [];
    for (const file of files) {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      newFiles.push({ name: file.name, type: file.type, base64, size: (file.size / 1024).toFixed(1) + ' KB' });
    }
    updateProject({
      files: { ...currentProject.files, [currentMode]: [...(currentProject.files[currentMode] || []), ...newFiles] }
    });
    e.target.value = '';
  };

  const sendMessage = async (text = input) => {
    const currFiles = currentProject.files[currentMode] || [];
    if (!text.trim() && !currFiles.length) return;

    const userMsg = { role: 'user', content: text || 'Проаналізуй файли' };
    const history = currentProject.messages[currentMode] || [];
    const withUser = [...history, userMsg];

    updateProject({ messages: { ...currentProject.messages, [currentMode]: withUser } });
    setInput('');
    setLoading(true);
    const controller = new AbortController();
    setAbortCtrl(controller);

    try {
      const apiMessages = withUser
        .reduce((acc, m, i, arr) => {
          if (m.role === 'assistant') {
            acc.push({ role: 'assistant', content: m.content });
          } else {
            const isLast = i === arr.length - 1;
            const contentParts = [];
            if (isLast && currFiles.length) {
              currFiles.forEach(f => {
                if (f.type === 'application/pdf') {
                  contentParts.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.base64 } });
                } else if (f.type.startsWith('image/')) {
                  contentParts.push({ type: 'image', source: { type: 'base64', media_type: f.type, data: f.base64 } });
                }
              });
            }
            contentParts.push({ type: 'text', text: m.content });
            acc.push({ role: 'user', content: contentParts.length === 1 ? contentParts[0].text : contentParts });
          }
          return acc;
        }, []);

      if (apiMessages[0]?.role === 'assistant') apiMessages.shift();

      const aiText = await callClaude({
        system: getSystem(currentMode, currentProject.projectData),
        messages: apiMessages,
        signal: controller.signal,
      });

      updateProject({
        messages: { ...currentProject.messages, [currentMode]: [...withUser, { role: 'assistant', content: aiText }] },
        files:    { ...currentProject.files,    [currentMode]: [] },
      });
    } catch (err) {
      const msg = err.name === 'AbortError'
        ? '⏸️ Генерацію зупинено'
        : `❌ Помилка: ${err.message}`;
      updateProject({
        messages: { ...currentProject.messages, [currentMode]: [...withUser, { role: 'assistant', content: msg }] },
      });
    } finally {
      setLoading(false);
      setAbortCtrl(null);
    }
  };

  const exportProject = () => {
    const all = modes.map(m => {
      const msgs = currentProject.messages[m.id] || [];
      return `\n\n===== ${m.title.toUpperCase()} =====\n\n${msgs.map(msg =>
        `[${msg.role === 'user' ? 'Клієнт' : 'Агент'}]: ${msg.content}`
      ).join('\n\n')}`;
    }).join('\n');
    const blob = new Blob([all], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${currentProject.name}.txt`; a.click();
  };

  const saveData = () => {
    const summary = (currentProject.messages[currentMode] || [])
      .filter(m => m.role === 'assistant').map(m => m.content).join('\n\n');
    updateProject({ projectData: { ...currentProject.projectData, [currentMode]: summary } });
    alert('✅ Збережено в контекст проекту!');
  };

  const copyToFigma = () => {
    const data = currentProject?.projectData?.brief_structured || briefData;
    if (!data || Object.keys(data).length === 0) {
      alert('Спочатку натисни ⚡ Sync, щоб витягти дані брифу.');
      return;
    }
    const payload = JSON.stringify({
      type: 'flow_brief',
      projectName: currentProject.name,
      brief: data,
    });
    navigator.clipboard.writeText(payload).then(() => {
      alert('✅ Скопійовано! Відкрий Figma → плагін "FLOW Brief Importer" → натисни "Paste from FLOW"');
    }).catch(() => alert('⚠ Не вдалось скопіювати — спробуй ще раз'));
  };

  const copyCompetitorToFigma = () => {
    const stored = currentProject?.projectData?.competitor_structured || competitorData;
    const list   = stored?.competitors || [];
    if (!list.length) {
      alert('Спочатку натисни ⚡ Sync аналіз, щоб витягти дані конкурентів.');
      return;
    }
    const payload = JSON.stringify({
      type: 'flow_competitors',
      projectName: currentProject.name,
      competitors: list,
      groups: competitorGroups.map(g => ({ id: g.id, title: g.title, emoji: g.emoji, fields: g.fields })),
    });
    navigator.clipboard.writeText(payload).then(() => {
      alert('✅ Скопійовано! Відкрий Figma → плагін "FLOW Brief Importer" → натисни "Paste from FLOW"');
    }).catch(() => alert('⚠ Не вдалось скопіювати — спробуй ще раз'));
  };

  const extractBrief = async () => {
    const msgs = currentProject?.messages['brief'] || [];
    const conversation = msgs.map(m => `[${m.role === 'user' ? 'Клієнт' : 'Асистент'}]: ${m.content}`).join('\n\n');
    if (msgs.length <= 1) return;
    setBriefSyncing(true);
    try {
      const text = await callClaude({
        system: `Витягни з діалогу брифінгу структуровану інформацію у форматі JSON.
Поверни ТІЛЬКИ JSON, без коментарів, без markdown-блоків.
Структура:
{
  "client": { "who": "", "usp": "", "advantages": "", "disadvantages": "" },
  "goal": { "keyAction": "", "purpose": "" },
  "wishes": { "ui": "", "structure": "", "limitations": "" },
  "competition": { "competitors": "" },
  "additional": { "materials": "", "questions": "" }
}
Якщо інформація відсутня — залишай порожній рядок. Не вигадуй нічого зайвого.`,
        messages: [{ role: 'user', content: `Діалог брифу:\n\n${conversation}` }],
      });
      const json = JSON.parse(text.replace(/```json|```/g, '').trim());
      setBriefData(json);
      updateProject({ projectData: { ...currentProject.projectData, brief_structured: json } });
    } catch (e) {
      console.error('Brief extract error:', e);
    }
    setBriefSyncing(false);
  };

  const extractCompetitors = async () => {
    const msgs = currentProject?.messages['competitors'] || [];
    const conversation = msgs.map(m => `[${m.role === 'user' ? 'Дизайнер' : 'Асистент'}]: ${m.content}`).join('\n\n');
    if (msgs.length <= 1) return;
    setCompetitorSyncing(true);
    try {
      const text = await callClaude({
        system: `Витягни з діалогу аналізу конкурентів структуровану інформацію у форматі JSON.
Поверни ТІЛЬКИ JSON, без коментарів, без markdown-блоків.
Знайди КОЖНОГО конкурента окремо і поверни масив об'єктів.
Структура:
{
  "competitors": [
    {
      "name": "назва або домен конкурента",
      "ui_main":        { "hero": "", "layout": "", "firstImpression": "" },
      "ui_fonts":       { "headings": "", "body": "", "style": "" },
      "ui_colors":      { "primary": "", "accent": "", "mood": "" },
      "ui_decorations": { "elements": "", "animations": "" },
      "ui_composition": { "grid": "", "spacing": "", "balance": "" },
      "funnel":         { "structure": "", "cta": "", "userPath": "" },
      "best_practices": { "strengths": "", "innovative": "" },
      "ux":             { "navigation": "", "usability": "", "accessibility": "" },
      "cx":             { "tone": "", "trust": "", "emotional": "" },
      "conclusion": {
        "works_well":   "",
        "works_poorly": "",
        "to_remember":  ""
      }
    }
  ]
}
Якщо аналізувався лише один конкурент — масив з одного елемента.
Якщо інформація відсутня — залишай порожній рядок. Нічого не вигадуй.`,
        messages: [{ role: 'user', content: `Діалог аналізу конкурентів:\n\n${conversation}` }],
      });
      const json = JSON.parse(text.replace(/```json|```/g, '').trim());
      setCompetitorData(json);
      setSelectedCompetitorIdx(0);
      updateProject({ projectData: { ...currentProject.projectData, competitor_structured: json } });
    } catch (e) {
      console.error('Competitor extract error:', e);
    }
    setCompetitorSyncing(false);
  };

  const saveApiKey = () => {
    const key = apiInput.trim();
    if (!key) return;
    localStorage.setItem('anthropic_api_key', key);
    setApiKey(key);
    setShowApiInput(false);
    setApiInput('');
  };

  // ─── Projects view ─────────────────────────────────────────────────────────
  if (view === 'projects') {
    const sorted = [...projects].sort((a, b) => {
      if (a.important !== b.important) return a.important ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAFA', color: '#1A1A1A', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ padding: '48px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
            <div>
              <h1 style={{ fontSize: '48px', fontWeight: '600', marginBottom: '8px', letterSpacing: '-1px' }}>FLOW</h1>
              <p style={{ fontSize: '16px', color: '#666' }}>Your Design Flow Partner</p>
            </div>
            <button onClick={() => setShowApiInput(true)}
              style={{ marginTop: '8px', padding: '8px 16px', background: apiKey ? '#F0FFF4' : '#FFF8F0', border: apiKey ? '1px solid #9AE6B4' : '1px solid #FBD38D', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: apiKey ? '#276749' : '#744210' }}>
              {apiKey ? '🔑 API Key ✓' : '🔑 Set API Key'}
            </button>
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Your Projects</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            <div onClick={() => setShowNew(true)} style={{ padding: '48px 32px', background: '#fff', border: '2px dashed #E5E5E5', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}><Plus size={28} /></div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>New Project</div>
            </div>

            {sorted.map(p => {
              const completed = modes.filter(m => p.messages[m.id]?.length > 1).length;
              const isEditing = editingId === p.id;
              return (
                <div key={p.id} onClick={() => !isEditing && (setCurrentProject(p), setCurrentMode('brief'), setBriefData(p.projectData?.brief_structured || {}), setCompetitorData(p.projectData?.competitor_structured || { competitors: [] }), setSelectedCompetitorIdx(0), setView('workspace'))}
                  style={{ padding: '28px', background: '#fff', border: p.important ? '2px solid #FFD700' : '1px solid #E5E5E5', borderRadius: '12px', cursor: isEditing ? 'default' : 'pointer', minHeight: '240px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {p.important && <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#FFD700', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>⭐ Important</div>}
                  <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}><FolderOpen size={22} color="#fff" /></div>
                  {isEditing ? (
                    <div style={{ marginBottom: '8px' }}>
                      <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { setProjects(ps => ps.map(x => x.id === p.id ? { ...x, name: editName } : x)); setEditingId(null); } if (e.key === 'Escape') setEditingId(null); }}
                        onClick={e => e.stopPropagation()}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #1A1A1A', borderRadius: '6px', fontSize: '18px', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button onClick={e => { e.stopPropagation(); setProjects(ps => ps.map(x => x.id === p.id ? { ...x, name: editName } : x)); setEditingId(null); }} style={{ flex: 1, padding: '6px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Save</button>
                        <button onClick={e => { e.stopPropagation(); setEditingId(null); }} style={{ flex: 1, padding: '6px', background: '#E5E5E5', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', flex: 1 }}>{p.name}</h3>}
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>{new Date(p.createdAt).toLocaleDateString('uk-UA')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #E5E5E5' }}>
                    <div style={{ fontSize: '13px', color: '#666' }}>{completed}/9 steps</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={e => { e.stopPropagation(); setProjects(ps => ps.map(x => x.id === p.id ? { ...x, important: !x.important } : x)); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: p.important ? '#FFD700' : '#D4D4D4' }}><Star size={18} fill={p.important ? '#FFD700' : 'none'} strokeWidth={1} /></button>
                      <button onClick={e => { e.stopPropagation(); setEditingId(p.id); setEditName(p.name); }} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' }}><Edit2 size={18} strokeWidth={1} /></button>
                      <button onClick={e => { e.stopPropagation(); setDeletingProject(p); }} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: '4px' }}><Trash2 size={18} strokeWidth={1} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* API Key modal */}
        {showApiInput && (
          <div onClick={() => setShowApiInput(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '480px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Anthropic API Key</h2>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Зберігається локально у браузері</p>
              {apiKey && <div style={{ padding: '10px 14px', background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '8px', fontSize: '13px', color: '#276749', marginBottom: '16px' }}>✓ Поточний ключ: {apiKey.slice(0, 12)}...</div>}
              <input autoFocus type="password" value={apiInput} onChange={e => setApiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveApiKey()} placeholder="sk-ant-..." style={{ width: '100%', padding: '14px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowApiInput(false)} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Скасувати</button>
                <button onClick={saveApiKey} disabled={!apiInput.trim()} style={{ padding: '10px 20px', background: apiInput.trim() ? '#1A1A1A' : '#E5E5E5', border: 'none', borderRadius: '8px', color: '#fff', cursor: apiInput.trim() ? 'pointer' : 'not-allowed', fontSize: '14px' }}>Зберегти</button>
              </div>
            </div>
          </div>
        )}

        {/* New project modal */}
        {showNew && (
          <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '480px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>Create New Project</h2>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProject()} placeholder="Project name..." style={{ width: '100%', padding: '16px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '16px', marginBottom: '24px', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowNew(false)} style={{ padding: '12px 24px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                <button onClick={createProject} disabled={!newName.trim()} style={{ padding: '12px 24px', background: newName.trim() ? '#1A1A1A' : '#E5E5E5', border: 'none', borderRadius: '8px', color: '#fff', cursor: newName.trim() ? 'pointer' : 'not-allowed', fontSize: '14px' }}>Create</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete modal */}
        {deletingProject && (
          <div onClick={() => setDeletingProject(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '480px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FEE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}><Trash2 size={24} color="#E53E3E" /></div>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Видалити проект?</h2>
              <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6', marginBottom: '24px' }}>Ви впевнені, що хочете видалити <strong>"{deletingProject.name}"</strong>? Цю дію неможливо скасувати.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setDeletingProject(null)} style={{ padding: '12px 24px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Скасувати</button>
                <button onClick={() => { setProjects(ps => ps.filter(p => p.id !== deletingProject.id)); setDeletingProject(null); }} style={{ padding: '12px 24px', background: '#E53E3E', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>Видалити</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Workspace view ───────────────────────────────────────────────────────
  const currMsgs  = currentProject?.messages[currentMode] || [];
  const currFiles = currentProject?.files[currentMode] || [];
  const currMode  = modes.find(m => m.id === currentMode);
  const canSend   = !loading && (input.trim() || currFiles.length > 0);

  return (
    <div style={{ height: '100vh', background: '#FAFAFA', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1A1A1A' }}>
      {/* Header */}
      <div style={{ padding: '16px 32px', background: '#fff', borderBottom: '1px solid #E5E5E5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setView('projects')} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}><ArrowLeft size={20} /></button>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '2px' }}>{currentProject?.name}</h1>
            <p style={{ fontSize: '11px', color: '#888' }}>FLOW — Your Design Flow Partner</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setShowApiInput(true)} style={{ padding: '8px 12px', background: apiKey ? '#F0FFF4' : '#FFF8F0', border: apiKey ? '1px solid #9AE6B4' : '1px solid #FBD38D', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: apiKey ? '#276749' : '#744210' }}>{apiKey ? '🔑 ✓' : '🔑 API'}</button>
          <button onClick={saveData} style={{ padding: '8px 16px', background: '#1A1A1A', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}><Plus size={14} />Save to Context</button>
          <button onClick={exportProject} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}><Download size={14} />Export</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: sidebarCollapsed ? '56px' : '240px', background: '#fff', borderRight: '1px solid #E5E5E5', display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'width 0.2s ease', overflow: 'hidden' }}>
          {/* Sidebar header */}
          <div style={{ padding: sidebarCollapsed ? '16px 0' : '16px', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', borderBottom: '1px solid #E5E5E5', flexShrink: 0 }}>
            {!sidebarCollapsed && <span style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Process Steps</span>}
            <button onClick={() => setSidebarCollapsed(c => !c)} title={sidebarCollapsed ? 'Expand' : 'Collapse'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#999', display: 'flex', alignItems: 'center', borderRadius: '4px', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d={sidebarCollapsed ? 'M5 2l5 5-5 5' : 'M9 2L4 7l5 5'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          {/* Steps */}
          <div style={{ flex: 1, overflowY: 'auto', padding: sidebarCollapsed ? '12px 8px' : '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {modes.map((m, i) => {
              const active = currentMode === m.id;
              const done   = currentProject?.messages[m.id]?.length > 1;
              return (
                <div key={m.id} onClick={() => setCurrentMode(m.id)} title={sidebarCollapsed ? `${i + 1}. ${m.title}` : undefined}
                  style={{ padding: sidebarCollapsed ? '0' : '12px', background: active ? '#F5F5F5' : '#fff', border: active ? '1px solid #1A1A1A' : '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: '8px', position: 'relative' }}>
                  <div style={{ width: sidebarCollapsed ? '36px' : '24px', height: sidebarCollapsed ? '36px' : '24px', borderRadius: sidebarCollapsed ? '8px' : '4px', background: active ? '#1A1A1A' : '#F5F5F5', color: active ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0 }}>
                    {done && !sidebarCollapsed ? <Check size={12} color={active ? '#fff' : '#22C55E'} /> : i + 1}
                  </div>
                  {!sidebarCollapsed && <>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                      <div style={{ fontSize: '10px', color: '#888' }}>{m.description}</div>
                    </div>
                    {done && <Check size={12} color="#22C55E" />}
                  </>}
                  {sidebarCollapsed && done && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat — Column 2 (center) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', minWidth: 0 }}>
          <div style={{ padding: '16px 32px', borderBottom: '1px solid #E5E5E5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '20px' }}>{currMode?.icon}</span>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>{currMode?.title}</h2>
            </div>
            <p style={{ fontSize: '12px', color: '#888' }}>{currMode?.description}</p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {currMsgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, background: m.role === 'user' ? '#1A1A1A' : '#F5F5F5', border: m.role === 'user' ? 'none' : '1px solid #E5E5E5', color: m.role === 'user' ? '#fff' : '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                </div>
                <div style={{ flex: 1, background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: '12px', padding: '14px 18px', whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '14px' }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F5F5F5', border: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={16} /></div>
                <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: '12px', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1A1A1A', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: `${-0.32 + i * 0.16}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {currFiles.length > 0 && (
            <div style={{ padding: '12px 32px', borderTop: '1px solid #E5E5E5', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {currFiles.map((f, i) => (
                <div key={i} style={{ padding: '5px 10px', background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={12} />{f.name} <span style={{ color: '#888' }}>({f.size})</span>
                  <button onClick={() => updateProject({ files: { ...currentProject.files, [currentMode]: currFiles.filter((_, idx) => idx !== i) } })} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E5E5', background: '#FAFAFA' }}>
            {!apiKey && (
              <div style={{ marginBottom: '10px', padding: '8px 14px', background: '#FFF8F0', border: '1px solid #FBD38D', borderRadius: '8px', fontSize: '13px', color: '#744210', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔑 Потрібен API Key для роботи.
                <button onClick={() => setShowApiInput(true)} style={{ background: 'none', border: 'none', color: '#744210', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px', padding: 0 }}>Додати →</button>
              </div>
            )}
            {/* Unified input box */}
            <div style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept=".pdf,image/*" style={{ display: 'none' }} />
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={currentMode === 'competitors' ? 'Вставте URL або опишіть сайт конкурента...' : 'Напишіть повідомлення...'}
                style={{ width: '100%', padding: '14px 16px 8px', background: 'transparent', border: 'none', fontSize: '14px', resize: 'none', minHeight: '52px', maxHeight: '160px', fontFamily: 'inherit', outline: 'none', lineHeight: '1.6', boxSizing: 'border-box', color: '#1A1A1A' }} />
              {/* Bottom toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px 10px' }}>
                <button onClick={() => fileInputRef.current?.click()} title="Завантажити файл або скріншот"
                  style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#F5F5F5', border: '1px solid #E5E5E5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', flexShrink: 0 }}>
                  <Upload size={15} />
                </button>
                <div style={{ fontSize: '11px', color: '#C0C0C0' }}>Enter — відправити · Shift+Enter — новий рядок</div>
                <button onClick={() => loading ? abortCtrl?.abort() : sendMessage()} disabled={!loading && !canSend}
                  style={{ width: '34px', height: '34px', borderRadius: '50%', background: loading ? '#E53E3E' : (canSend ? '#1A1A1A' : '#E0E0E0'), border: 'none', cursor: loading || canSend ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
                  {loading
                    ? <span style={{ width: '10px', height: '10px', background: '#fff', borderRadius: '2px', display: 'block' }} />
                    : <Send size={15} color="#fff" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel — Column 3 */}
        {currentMode === 'brief' && (
          <div style={{ width: '300px', background: '#FAFAFA', borderLeft: '1px solid #E5E5E5', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E5E5' }}>
              <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '10px' }}>Brief Summary</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(() => {
                  const hasBriefChat = (currentProject?.messages['brief'] || []).some(m => m.role === 'user');
                  const briefBtnDisabled = briefSyncing || !hasBriefChat;
                  return (
                    <button onClick={extractBrief} disabled={briefBtnDisabled}
                      title={!hasBriefChat ? 'Спочатку проведіть бриф у чаті' : ''}
                      style={{ flex: 1, padding: '7px 0', border: 'none', borderRadius: '6px', fontSize: '11px',
                        background: briefBtnDisabled ? '#F0F0F0' : '#1A1A1A',
                        color:      briefBtnDisabled ? '#BBBBBB' : '#fff',
                        cursor:     briefBtnDisabled ? 'not-allowed' : 'pointer',
                      }}>
                      {briefSyncing ? '⏳ Sync...' : '⚡ Sync'}
                    </button>
                  );
                })()}
                <button onClick={copyToFigma} style={{ flex: 1, padding: '7px 0', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '6px', color: '#1A1A1A', fontSize: '11px', cursor: 'pointer' }}>
                  ✦ Copy to Figma
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {briefGroups.map(group => {
                const groupData = (currentProject?.projectData?.brief_structured || briefData)?.[group.id] || {};
                const hasData = group.fields.some(f => groupData[f.id]?.trim());
                return (
                  <div key={group.id} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px' }}>{group.emoji}</span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{group.title}</span>
                      {hasData && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', marginLeft: 'auto', flexShrink: 0 }} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {group.fields.map(field => {
                        const val = groupData[field.id];
                        return (
                          <div key={field.id} style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', padding: '10px 12px' }}>
                            <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', fontWeight: '600' }}>{field.label}</div>
                            <div style={{ fontSize: '12px', color: val ? '#1A1A1A' : '#CCC', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{val || '—'}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Competitor Analysis Panel — Column 3 */}
        {currentMode === 'competitors' && (() => {
          const stored = currentProject?.projectData?.competitor_structured || competitorData;
          const list   = stored?.competitors || [];
          const active = list[selectedCompetitorIdx] || null;
          return (
            <div style={{ width: '320px', background: '#FAFAFA', borderLeft: '1px solid #E5E5E5', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Panel header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E5E5', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '10px' }}>Competitor Analysis</div>
                {(() => {
                  const hasCompChat    = (currentProject?.messages['competitors'] || []).some(m => m.role === 'user');
                  const compBtnDisabled = competitorSyncing || !hasCompChat;
                  const stored         = currentProject?.projectData?.competitor_structured || competitorData;
                  const hasData        = (stored?.competitors || []).length > 0;
                  return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={extractCompetitors} disabled={compBtnDisabled}
                        title={!hasCompChat ? 'Спочатку проаналізуйте конкурентів у чаті' : ''}
                        style={{ flex: 1, padding: '7px 0', border: 'none', borderRadius: '6px', fontSize: '11px',
                          background: compBtnDisabled ? '#F0F0F0' : '#1A1A1A',
                          color:      compBtnDisabled ? '#BBBBBB' : '#fff',
                          cursor:     compBtnDisabled ? 'not-allowed' : 'pointer',
                        }}>
                        {competitorSyncing ? '⏳ Sync...' : '⚡ Sync'}
                      </button>
                      <button onClick={copyCompetitorToFigma} disabled={!hasData}
                        title={!hasData ? 'Спочатку зробіть Sync аналізу' : 'Експортувати в Figma'}
                        style={{ flex: 1, padding: '7px 0', border: '1px solid #E5E5E5', borderRadius: '6px', fontSize: '11px',
                          background: hasData ? '#fff' : '#F8F8F8',
                          color:      hasData ? '#1A1A1A' : '#BBBBBB',
                          cursor:     hasData ? 'pointer' : 'not-allowed',
                        }}>
                        ✦ Figma
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Competitor tabs */}
              {list.length > 0 && (
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #E5E5E5', display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0, background: '#fff' }}>
                  {list.map((comp, idx) => (
                    <button key={idx} onClick={() => setSelectedCompetitorIdx(idx)}
                      title={comp.name}
                      style={{
                        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', border: 'none', whiteSpace: 'nowrap', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis',
                        background: selectedCompetitorIdx === idx ? '#1A1A1A' : '#F0F0F0',
                        color:      selectedCompetitorIdx === idx ? '#fff'     : '#555',
                      }}>
                      {comp.name || `Конкурент ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Competitor data */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {!active ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: '#CCC' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
                    <div style={{ fontSize: '12px', lineHeight: '1.6' }}>Натисни <strong>⚡ Sync аналіз</strong><br/>після того як проаналізуєш конкурентів у чаті</div>
                  </div>
                ) : (
                  <>
                    {/* Analysis groups */}
                    {competitorGroups.filter(g => !g.isConclusion).map(group => {
                      const groupData = active[group.id] || {};
                      const hasData   = group.fields.some(f => groupData[f.id]?.trim());
                      return (
                        <div key={group.id} style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px' }}>{group.emoji}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{group.title}</span>
                            {hasData && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', marginLeft: 'auto', flexShrink: 0 }} />}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {group.fields.map(field => {
                              const val = groupData[field.id];
                              return (
                                <div key={field.id} style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', padding: '10px 12px' }}>
                                  <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px', fontWeight: '600' }}>{field.label}</div>
                                  <div style={{ fontSize: '12px', color: val ? '#1A1A1A' : '#CCC', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{val || '—'}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Conclusion block */}
                    {(() => {
                      const c = active.conclusion || {};
                      const conclusionColors = {
                        works_well:   { bg: '#F0FFF4', border: '#9AE6B4', label: '#276749' },
                        works_poorly: { bg: '#FFF5F5', border: '#FEB2B2', label: '#C53030' },
                        to_remember:  { bg: '#FFFBEB', border: '#FBD38D', label: '#744210' },
                      };
                      const conclusionGroup = competitorGroups.find(g => g.isConclusion);
                      return (
                        <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', paddingTop: '12px', borderTop: '2px solid #1A1A1A' }}>
                            <span style={{ fontSize: '13px' }}>📌</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Висновок</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {conclusionGroup.fields.map(field => {
                              const colors = conclusionColors[field.id];
                              const val    = c[field.id];
                              return (
                                <div key={field.id} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '10px 12px' }}>
                                  <div style={{ fontSize: '10px', color: colors.label, marginBottom: '4px', fontWeight: '700' }}>{field.label}</div>
                                  <div style={{ fontSize: '12px', color: val ? '#1A1A1A' : '#CCC', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{val || '—'}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* API Key modal in workspace */}
      {showApiInput && (
        <div onClick={() => setShowApiInput(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '480px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Anthropic API Key</h2>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Зберігається локально у браузері</p>
            {apiKey && <div style={{ padding: '10px 14px', background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '8px', fontSize: '13px', color: '#276749', marginBottom: '16px' }}>✓ Поточний ключ: {apiKey.slice(0, 12)}...</div>}
            <input autoFocus type="password" value={apiInput} onChange={e => setApiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveApiKey()} placeholder="sk-ant-..." style={{ width: '100%', padding: '14px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowApiInput(false)} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Скасувати</button>
              <button onClick={saveApiKey} disabled={!apiInput.trim()} style={{ padding: '10px 20px', background: apiInput.trim() ? '#1A1A1A' : '#E5E5E5', border: 'none', borderRadius: '8px', color: '#fff', cursor: apiInput.trim() ? 'pointer' : 'not-allowed', fontSize: '14px' }}>Зберегти</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }`}</style>
    </div>
  );
}
