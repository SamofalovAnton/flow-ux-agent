import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Upload, FileText, Download, Plus, Check, User, Sparkles, FolderOpen, ArrowLeft, Trash2, Edit2, Star, ChevronRight } from 'lucide-react';

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
  { id: 'client', title: 'Про клієнта', emoji: '👤', fields: [
    { id: 'who',           label: 'Хто наш клієнт?' },
    { id: 'usp',           label: 'Унікальна Торгівельна Пропозиція' },
    { id: 'advantages',    label: 'Функціональні переваги' },
    { id: 'disadvantages', label: 'Недоліки бренду' },
  ]},
  { id: 'audience', title: 'Аудиторія', emoji: '👥', fields: [
    { id: 'who',  label: 'Хто цільова аудиторія?' },
    { id: 'buys', label: 'Що купують найкраще?' },
  ]},
  { id: 'goal', title: 'Мета', emoji: '🎯', fields: [
    { id: 'keyAction', label: 'Ключова дія на сайті' },
    { id: 'purpose',   label: 'Навіщо клієнту сайт?' },
  ]},
  { id: 'wishes', title: 'Побажання', emoji: '✨', fields: [
    { id: 'ui',          label: 'Побажання по UI' },
    { id: 'structure',   label: 'Побажання по структурі та контенту' },
    { id: 'limitations', label: 'Обмеження для дизайну' },
  ]},
  { id: 'competition', title: 'Конкуренція', emoji: '🔍', fields: [
    { id: 'competitors', label: 'Конкуренти (зі слів клієнта)' },
  ]},
  { id: 'additional', title: 'Додатково', emoji: '📎', fields: [
    { id: 'materials', label: 'Матеріали від клієнта' },
    { id: 'questions', label: 'Питання для уточнення' },
  ]},
];

// ─── Competitor groups ────────────────────────────────────────────────────────
const competitorGroups = [
  { id: 'ui_main',        title: 'UI — Main Screen',              emoji: '🖥️', fields: [{ id: 'hero', label: 'Hero section' }, { id: 'layout', label: 'Загальний layout' }, { id: 'firstImpression', label: 'Перше враження' }] },
  { id: 'ui_fonts',       title: 'UI — Fonts',                    emoji: '🔤', fields: [{ id: 'headings', label: 'Заголовки' }, { id: 'body', label: 'Основний текст' }, { id: 'style', label: 'Стиль типографіки' }] },
  { id: 'ui_colors',      title: 'UI — Colors',                   emoji: '🎨', fields: [{ id: 'primary', label: 'Основна палітра' }, { id: 'accent', label: 'Акцентні кольори' }, { id: 'mood', label: 'Настрій / емоція' }] },
  { id: 'ui_decorations', title: 'UI — Decorations',              emoji: '✨', fields: [{ id: 'elements', label: 'Декоративні елементи' }, { id: 'animations', label: 'Анімації та мікровзаємодії' }] },
  { id: 'ui_composition', title: 'UI — Composition',              emoji: '📐', fields: [{ id: 'grid', label: 'Grid система' }, { id: 'spacing', label: 'Відступи та ритм' }, { id: 'balance', label: 'Баланс елементів' }] },
  { id: 'funnel',         title: 'Структура та воронка продажів', emoji: '🔄', fields: [{ id: 'structure', label: 'Структура сайту' }, { id: 'cta', label: 'CTA та точки конверсії' }, { id: 'userPath', label: 'Шлях користувача' }] },
  { id: 'best_practices', title: 'Найкращі практики',             emoji: '⭐', fields: [{ id: 'strengths', label: 'Сильні рішення' }, { id: 'innovative', label: 'Інноваційні підходи' }] },
  { id: 'ux',             title: 'UX',                            emoji: '🧭', fields: [{ id: 'navigation', label: 'Навігація' }, { id: 'usability', label: 'Зручність використання' }, { id: 'accessibility', label: 'Мобільна адаптація' }] },
  { id: 'cx',             title: 'CX Part',                       emoji: '💬', fields: [{ id: 'tone', label: 'Tone of voice' }, { id: 'trust', label: 'Елементи довіри' }, { id: 'emotional', label: 'Емоційний зв\'язок' }] },
  { id: 'conclusion',     title: 'Висновок',                      emoji: '📌', isConclusion: true, fields: [{ id: 'works_well', label: '✅ Що добре працює' }, { id: 'works_poorly', label: '❌ Що погано / слабкі місця' }, { id: 'to_remember', label: '📌 Зафіксувати для роботи' }] },
];

// ─── Mode structures for steps 3–9 ───────────────────────────────────────────
const modeStructures = {
  sitemap: {
    groups: [
      { id: 'pages',      title: 'Сторінки',  emoji: '📄', fields: [{ id: 'main', label: 'Основні сторінки' }, { id: 'sub', label: 'Підсторінки' }] },
      { id: 'navigation', title: 'Навігація', emoji: '🧭', fields: [{ id: 'menu', label: 'Структура меню' }, { id: 'footer', label: 'Footer' }] },
      { id: 'funnel',     title: 'Воронка',   emoji: '🔄', fields: [{ id: 'entry', label: 'Точки входу' }, { id: 'conversion', label: 'Точки конверсії' }] },
      { id: 'seo',        title: 'SEO',        emoji: '🔍', fields: [{ id: 'priorities', label: 'SEO пріоритети' }] },
    ],
    extractPrompt: 'Витягни структуру сайту у форматі JSON. Поверни ТІЛЬКИ JSON:\n{"pages":{"main":"","sub":""},"navigation":{"menu":"","footer":""},"funnel":{"entry":"","conversion":""},"seo":{"priorities":""}}',
  },
  wireframes: {
    groups: [
      { id: 'screens',    title: 'Екрани',     emoji: '📱', fields: [{ id: 'list', label: 'Список екранів' }, { id: 'main', label: 'Головний екран' }] },
      { id: 'components', title: 'Компоненти', emoji: '🧩', fields: [{ id: 'header', label: 'Header' }, { id: 'hero', label: 'Hero section' }, { id: 'cards', label: 'Картки / блоки' }] },
      { id: 'ux',         title: 'UX Notes',   emoji: '🧭', fields: [{ id: 'interactions', label: 'Взаємодії' }, { id: 'grid', label: 'Grid система' }] },
    ],
    extractPrompt: 'Витягни структуру wireframes у форматі JSON. Поверни ТІЛЬКИ JSON:\n{"screens":{"list":"","main":""},"components":{"header":"","hero":"","cards":""},"ux":{"interactions":"","grid":""}}',
  },
  emotions: {
    groups: [
      { id: 'archetype', title: 'Архетип',      emoji: '🎭', fields: [{ id: 'main', label: 'Основний архетип' }, { id: 'secondary', label: 'Додатковий архетип' }] },
      { id: 'tone',      title: 'Tone of Voice', emoji: '🗣️', fields: [{ id: 'style', label: 'Стиль комунікації' }, { id: 'keywords', label: 'Ключові слова' }] },
      { id: 'emotion',   title: 'Емоція',        emoji: '💫', fields: [{ id: 'primary', label: 'Основна емоція' }, { id: 'userFeeling', label: 'Що відчуває користувач' }] },
    ],
    extractPrompt: 'Витягни архетип та емоції у форматі JSON. Поверни ТІЛЬКИ JSON:\n{"archetype":{"main":"","secondary":""},"tone":{"style":"","keywords":""},"emotion":{"primary":"","userFeeling":""}}',
  },
  moodboard: {
    groups: [
      { id: 'typography', title: 'Типографіка', emoji: '🔤', fields: [{ id: 'heading', label: 'Шрифт заголовків' }, { id: 'body', label: 'Шрифт тексту' }] },
      { id: 'colors',     title: 'Кольори',     emoji: '🎨', fields: [{ id: 'primary', label: 'Основні кольори' }, { id: 'accent', label: 'Акцентні' }, { id: 'background', label: 'Фон' }] },
      { id: 'imagery',    title: 'Imagery',      emoji: '🖼️', fields: [{ id: 'style', label: 'Стиль зображень' }, { id: 'decorations', label: 'Декоративні елементи' }] },
      { id: 'animation',  title: 'Анімація',     emoji: '✨', fields: [{ id: 'type', label: 'Тип анімацій' }, { id: 'feel', label: 'Відчуття руху' }] },
    ],
    extractPrompt: 'Витягни дизайн-рішення у форматі JSON. Поверни ТІЛЬКИ JSON:\n{"typography":{"heading":"","body":""},"colors":{"primary":"","accent":"","background":""},"imagery":{"style":"","decorations":""},"animation":{"type":"","feel":""}}',
  },
  concept: {
    groups: [
      { id: 'ideas',    title: 'Ідеї',            emoji: '💡', fields: [{ id: 'list', label: 'Всі ідеї' }, { id: 'top3', label: 'Топ 3 концепти' }] },
      { id: 'selected', title: 'Обраний концепт', emoji: '⭐', fields: [{ id: 'name', label: 'Назва концепту' }, { id: 'description', label: 'Опис' }, { id: 'rationale', label: 'Чому цей?' }] },
    ],
    extractPrompt: 'Витягни концепти дизайну у форматі JSON. Поверни ТІЛЬКИ JSON:\n{"ideas":{"list":"","top3":""},"selected":{"name":"","description":"","rationale":""}}',
  },
  strategy: {
    groups: [
      { id: 'strategy1',      title: 'Стратегія 1',  emoji: '📊', fields: [{ id: 'name', label: 'Назва' }, { id: 'visual', label: 'Візуальний напрям' }, { id: 'ux', label: 'UX підхід' }] },
      { id: 'strategy2',      title: 'Стратегія 2',  emoji: '📈', fields: [{ id: 'name', label: 'Назва' }, { id: 'visual', label: 'Візуальний напрям' }, { id: 'ux', label: 'UX підхід' }] },
      { id: 'recommendation', title: 'Рекомендація', emoji: '🎯', fields: [{ id: 'choice', label: 'Рекомендована стратегія' }, { id: 'reason', label: 'Обґрунтування' }] },
    ],
    extractPrompt: 'Витягни 2 дизайн-стратегії у форматі JSON. Поверни ТІЛЬКИ JSON:\n{"strategy1":{"name":"","visual":"","ux":""},"strategy2":{"name":"","visual":"","ux":""},"recommendation":{"choice":"","reason":""}}',
  },
  final: {
    groups: [
      { id: 'hero',         title: 'Hero Screen', emoji: '🎯', fields: [{ id: 'layout', label: 'Layout / структура' }, { id: 'headline', label: 'Headline' }, { id: 'visual', label: 'Головний візуал' }] },
      { id: 'typography',   title: 'Типографіка', emoji: '🔤', fields: [{ id: 'fonts', label: 'Шрифти' }, { id: 'hierarchy', label: 'Ієрархія' }] },
      { id: 'colors',       title: 'Кольори',     emoji: '🎨', fields: [{ id: 'palette', label: 'Палітра' }, { id: 'application', label: 'Застосування' }] },
      { id: 'interactions', title: 'Взаємодії',   emoji: '✨', fields: [{ id: 'animations', label: 'Анімації' }, { id: 'transitions', label: 'Переходи' }] },
    ],
    extractPrompt: 'Витягни фінальний концепт дизайну у форматі JSON. Поверни ТІЛЬКИ JSON:\n{"hero":{"layout":"","headline":"","visual":""},"typography":{"fonts":"","hierarchy":""},"colors":{"palette":"","application":""},"interactions":{"animations":"","transitions":""}}',
  },
};

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

// ─── System prompts ───────────────────────────────────────────────────────────
const systemPrompts = {
  brief: `Ти — асистент з брифінгу для UX/UI проекту. Збирай інформацію природньо, як в діалозі з клієнтом.

Структура брифу — 6 груп:

**1. Про клієнта**
- Хто наш клієнт? (бізнес, сфера, продукт/послуга)
- Яка Унікальна Торгівельна Пропозиція (УТП)?
- Які функціональні переваги?
- Які є недоліки бренду?

**2. Аудиторія**
- Хто цільова аудиторія? (вік, інтереси, болі, потреби)
- Що купують найкраще? (популярні послуги/товари)

**3. Мета**
- Яка ключова дія на сайті?
- Навіщо клієнту сайт?

**4. Побажання**
- Які побажання по UI? (стиль, референси, настрій)
- Які побажання по структурі та контенту?
- Які є обмеження для дизайну?

**5. Конкуренція**
- Хто наші конкуренти? (записуй точно те, що називає клієнт)

**6. Додатково**
- Які додаткові матеріали надав клієнт?
- Які питання варто доуточнити?

Правила ведення брифу:
- Задавай питання природньо, по 1–2 за раз
- Стисло підсумовуй групу і переходь далі
- Конкурентів записуй тільки зі слів клієнта
- Відповідай українською`,

  competitors: `Ти — UX/UI дизайнер-аналітик. Аналізуй сайти конкурентів детально за 9 категоріями.

Важливо: якщо отримав URL — опиши що знаєш про цей сайт з загальних знань. Якщо не маєш достатньо інформації — попроси завантажити скріншот або детально описати сайт.

Для кожного конкурента проводь ОКРЕМИЙ структурований аналіз:

**🖥️ UI — Main Screen:** Hero section, layout, перше враження
**🔤 UI — Fonts:** Шрифти заголовків і тексту, стиль типографіки
**🎨 UI — Colors:** Палітра (HEX якщо можливо), акценти, настрій
**✨ UI — Decorations:** Іконки, ілюстрації, анімації, scroll-ефекти
**📐 UI — Composition:** Grid, відступи, баланс
**🔄 Структура та воронка:** Секції на головній, CTA, шлях користувача
**⭐ Найкращі практики:** Сильні рішення, інноваційні підходи
**🧭 UX:** Навігація, зручність, мобільна адаптація
**💬 CX Part:** Tone of voice, елементи довіри, емоційний зв'язок

Після кожного конкурента — висновок:
✅ Що добре працює
❌ Що слабко / проблемні місця
📌 Що зафіксувати для нашого проекту

Відповідай українською. Кожен конкурент — окремий блок.`,

  sitemap: `Ти — спеціаліст з інформаційної архітектури та site mapping.

Допомагай дизайнеру побудувати повну структуру сайту.

Аналізуй та пропонуй:
**📄 Сторінки:** Які сторінки потрібні (головна, каталог, про нас, контакти, блог тощо)
**🧭 Навігація:** Головне меню, підменю, footer-навігація, breadcrumbs
**🔄 Воронка:** Шлях від першого візиту до конверсії, точки виходу
**🔍 SEO:** Ключові URL-структури, пріоритетні сторінки
**📱 Mobile first:** Особливості мобільної навігації

Структуруй у вигляді ієрархії. Запитай про:
- Тип бізнесу та цілі сайту
- Кількість послуг/товарів
- Чи є блог, портфоліо, кейси
- Цільову дію (замовлення, дзвінок, заявка)

Відповідай українською.`,

  wireframes: `Ти — UX-архітект, спеціаліст з wireframing.

Допомагай дизайнеру проектувати структуру екранів.

Аналізуй та пропонуй:
**📱 Екрани:** Список усіх екранів для wireframe в пріоритеті
**🧩 Компоненти:** Header, Hero, Features, Testimonials, CTA, Footer
**📐 Grid:** Колонки, відступи, breakpoints (1440 / 1024 / 375)
**🧭 UX Flow:** Як користувач переміщується між екранами
**♿ Accessibility:** Контраст, розміри кнопок, читабельність

Для кожного екрану описуй:
- Які блоки і в якому порядку
- Розміщення CTA
- Ієрархія контенту

Відповідай українською.`,

  emotions: `Ти — спеціаліст з емоційного дизайну та брендингу.

Використовуй 12 архетипів Юнга та методи емоційного проектування.

Аналізуй:
**🎭 Архетипи Юнга:** Герой, Творець, Дослідник, Мудрець, Коханець, Простак, Правитель, Шут, Бунтар, Магічний, Піклувальник, Бранець
**🗣️ Tone of Voice:** Формальний/неформальний, дружній/авторитетний, натхненний/технічний
**💫 Емоції:** Яке головне відчуття при контакті з брендом?
**🎯 Асоціації:** 5-7 ключових слів що описують бренд

Запитай:
- Цінності бренду
- Як клієнт хоче щоб його сприймали
- Яких емоцій має зазнати відвідувач сайту
- Референси брендів з правильним відчуттям

Відповідай українською.`,

  moodboard: `Ти — арт-директор та візуальний дизайнер.

Допомагай дизайнеру визначити візуальну мову проекту.

Аналізуй та пропонуй конкретно:
**🔤 Типографіка:** Конкретні шрифти (Google Fonts або premium), їх характер та поєднання
**🎨 Кольори:** Точна палітра (HEX), основний + акцентний + фон + текст
**🖼️ Imagery:** Фото чи ілюстрації, стиль, настрій, color grading
**✨ Декоративні елементи:** Лінії, форми, текстури, паттерни, градієнти
**🎬 Анімації:** Швидкість, характер руху (плавний/динамічний), що анімується

Пов'язуй з архетипом та емоціями з попереднього кроку.
Відповідай українською.`,

  concept: `Ти — креативний директор та дизайн-стратег.

Генеруй та аналізуй концепти дизайну через brainstorming.

Методи:
**💡 Brainstorming:** 5-10 різних концепт-ідей
**🔄 SCAMPER:** Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse
**🎯 How Might We:** "Як ми можемо..." формулювання задач
**🌐 Референси:** Аналізуй приклади з різних ніш

Для кожного концепту:
- Назва та коротка ідея (1 речення)
- Ключова метафора або образ
- Як виглядав би hero screen

Допомагай обрати один концепт та обґрунтуй вибір.
Відповідай українською.`,

  strategy: `Ти — дизайн-стратег та senior UX/UI дизайнер.

Розроби 2 різні дизайн-стратегії на основі зібраної інформації.

Для кожної стратегії:
**📊 Назва та концепція:** Коротка назва + суть підходу
**🎨 Візуальний напрям:** Кольори, шрифти, стиль, настрій
**🧭 UX підхід:** Структура, навігація, ключові рішення
**📝 Контент-стратегія:** Як подавати інформацію
**⚡ Складність реалізації:** Оцінка трудозатрат

Стратегії мають бути принципово РІЗНИМИ.
В кінці — рекомендуй одну з поясненням чому.
Відповідай українською.`,

  final: `Ти — senior UI дизайнер, спеціаліст з презентації концептів.

Описуй фінальний дизайн-концепт детально для реалізації у Figma.

**🎯 Hero Screen:** Layout, композиція, головний меседж — що бачить перше
**🔤 Типографіка:** Конкретні шрифти, розміри, вага, ієрархія
**🎨 Кольорова схема:** Точна палітра (HEX), де і як застосовується
**✨ Анімації:** Що і як анімується, scroll-ефекти, hover-стани
**📱 Адаптивність:** Як виглядає на мобільному
**🧩 Ключові компоненти:** Унікальні UI-елементи проекту

Будь максимально конкретним.
Відповідай українською.`,
};

const getSystem = (modeId, projectData) => {
  const base = systemPrompts[modeId] || '';
  const structured = Object.entries(projectData || {})
    .filter(([k]) => k.endsWith('_structured') && projectData[k])
    .map(([k, v]) => `## ${k.replace('_structured', '')}:\n${JSON.stringify(v, null, 2)}`)
    .join('\n\n');
  return structured ? `${base}\n\n## Контекст проекту (попередні кроки):\n${structured}` : base;
};

const getInitialMessage = (modeId) => ({
  brief:       'Привіт! Давай почнемо бриф. 🤝\n\nРозкажіть про ваш бізнес — що це за компанія, чим займаєтесь, який продукт або послуга?',
  competitors: 'Привіт! Починаємо аналіз конкурентів. 🔍\n\nНадай скріншот сайту конкурента або URL (з поясненням — я не маю доступу до інтернету, але можу проаналізувати по опису чи завантаженому скріншоту).\n\nЯ проведу аналіз за 9 категоріями: UI, UX, CX, воронка продажів.\n\nЗ якого конкурента починаємо?',
  sitemap:     'Будуємо Site Map. 🗺️\n\nРозкажи про структуру сайту — скільки сторінок планується, які основні розділи? Який тип бізнесу і яка ціль сайту?',
  wireframes:  'Переходимо до Wireframes. 📐\n\nЯкі екрани потрібно спроектувати першочергово? Починаємо з головної — що має бути в Hero-секції?',
  emotions:    'Визначаємо емоційний тон проекту. 🎭\n\nЯк клієнт хоче щоб сприймали його бренд? Які 3 слова найкраще описують відчуття від компанії?',
  moodboard:   'Design Session — формуємо візуальну мову. 🎨\n\nНадай референси (скріншоти сайтів що подобаються) або опиши бажаний стиль. Мінімалізм, розкіш, енергія, довіра?',
  concept:     'Пошук ідеї — brainstorming! 💡\n\nОпиши проект у 2-3 реченнях і я згенерую 5-10 концепт-ідей. Яку головну метафору або образ хочемо передати?',
  strategy:    'Розробляємо Design Strategy. 📊\n\nНа основі зібраної інформації підготую 2 різні стратегії. Підтверди пріоритети або додай що важливо врахувати.',
  final:       'Фінальний концепт! 🎯\n\nОпишемо hero screen у деталях. Яка головна ідея обраного концепту? Підготую детальний опис для реалізації у Figma.',
}[modeId] || `Привіт! Готовий допомогти з "${modeId}".`);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FlowAgent() {
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
  // Brief
  const [briefData, setBriefData]         = useState({});
  const [briefSyncing, setBriefSyncing]   = useState(false);
  // Competitors
  const [competitorData, setCompetitorData]   = useState({ competitors: [] });
  const [competitorSyncing, setCompetitorSyncing] = useState(false);
  const [selectedCompIdx, setSelectedCompIdx] = useState(0);
  // Generic modes 3-9
  const [modeData, setModeData]           = useState({});
  const [modeSyncing, setModeSyncing]     = useState({});
  // UI
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

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
      completedAt: null,
      completedSteps: [],
      messages: Object.fromEntries(modes.map(m => [m.id, [{ role: 'assistant', content: getInitialMessage(m.id) }]])),
      files: Object.fromEntries(modes.map(m => [m.id, []])),
      projectData: {},
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
    setView('workspace');
  };

  const markStepDone = () => {
    const steps = currentProject?.completedSteps || [];
    if (!steps.includes(currentMode)) {
      updateProject({ completedSteps: [...steps, currentMode] });
    }
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
    const userMsg = { role: 'user', content: text || 'Проаналізуй файли' };
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
      const msg = err.name === 'AbortError' ? '⏸️ Зупинено' : `❌ Помилка: ${err.message}`;
      updateProject({ messages: { ...currentProject.messages, [currentMode]: [...withUser, { role: 'assistant', content: msg }] } });
    } finally { setLoading(false); setAbortCtrl(null); }
  };

  const exportProject = () => {
    const parts = [
      `FLOW — ${currentProject.name}`,
      `Дата: ${new Date().toLocaleDateString('uk-UA')}`,
      currentProject.completedAt ? `✅ Завершено: ${new Date(currentProject.completedAt).toLocaleDateString('uk-UA')}` : '',
      '', '='.repeat(60),
    ];
    modes.forEach(m => {
      const msgs = currentProject.messages[m.id] || [];
      parts.push(`\n${m.icon} ${m.title.toUpperCase()}\n${'─'.repeat(40)}`);
      msgs.forEach(msg => parts.push(`\n[${msg.role === 'user' ? 'Дизайнер' : 'Агент'}]:\n${msg.content}`));
      const structured = currentProject.projectData?.[`${m.id}_structured`];
      if (structured) parts.push(`\n[Структуровані дані]:\n${JSON.stringify(structured, null, 2)}`);
    });
    const blob = new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${currentProject.name}.txt`; a.click();
  };

  // ─── Extract functions ────────────────────────────────────────────────────
  const extractBrief = async () => {
    const msgs = currentProject?.messages['brief'] || [];
    if (msgs.length <= 1) return;
    setBriefSyncing(true);
    try {
      const conv = msgs.map(m => `[${m.role === 'user' ? 'Клієнт' : 'Асистент'}]: ${m.content}`).join('\n\n');
      const text = await callClaude({
        system: 'Витягни з діалогу брифінгу структуровану інформацію. Поверни ТІЛЬКИ JSON:\n{"client":{"who":"","usp":"","advantages":"","disadvantages":""},"audience":{"who":"","buys":""},"goal":{"keyAction":"","purpose":""},"wishes":{"ui":"","structure":"","limitations":""},"competition":{"competitors":""},"additional":{"materials":"","questions":""}}',
        messages: [{ role: 'user', content: `Діалог брифу:\n\n${conv}` }],
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
      const conv = msgs.map(m => `[${m.role === 'user' ? 'Дизайнер' : 'Асистент'}]: ${m.content}`).join('\n\n');
      const text = await callClaude({
        system: 'Витягни аналіз конкурентів. Поверни ТІЛЬКИ JSON:\n{"competitors":[{"name":"","ui_main":{"hero":"","layout":"","firstImpression":""},"ui_fonts":{"headings":"","body":"","style":""},"ui_colors":{"primary":"","accent":"","mood":""},"ui_decorations":{"elements":"","animations":""},"ui_composition":{"grid":"","spacing":"","balance":""},"funnel":{"structure":"","cta":"","userPath":""},"best_practices":{"strengths":"","innovative":""},"ux":{"navigation":"","usability":"","accessibility":""},"cx":{"tone":"","trust":"","emotional":""},"conclusion":{"works_well":"","works_poorly":"","to_remember":""}}]}',
        messages: [{ role: 'user', content: `Діалог:\n\n${conv}` }],
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
      const conv = msgs.map(m => `[${m.role === 'user' ? 'Дизайнер' : 'Асистент'}]: ${m.content}`).join('\n\n');
      const text = await callClaude({
        system: modeStructures[modeId].extractPrompt + '\nЯкщо інформація відсутня — залишай порожній рядок.',
        messages: [{ role: 'user', content: `Діалог:\n\n${conv}` }],
      });
      const json = JSON.parse(text.replace(/```json|```/g, '').trim());
      setModeData(prev => ({ ...prev, [modeId]: json }));
      updateProject({ projectData: { ...currentProject.projectData, [`${modeId}_structured`]: json } });
    } catch (e) { console.error(`Extract ${modeId}:`, e); }
    setModeSyncing(prev => ({ ...prev, [modeId]: false }));
  };

  // ─── Figma export ─────────────────────────────────────────────────────────
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
      .then(() => alert('✅ Скопійовано! Відкрий Figma → плагін "FLOW Importer" → "Paste from FLOW"'))
      .catch(() => alert('⚠ Не вдалось скопіювати'));
  };

  const saveApiKey = () => {
    const key = apiInput.trim();
    if (!key) return;
    localStorage.setItem('anthropic_api_key', key);
    setApiKey(key);
    setShowApiInput(false);
    setApiInput('');
  };

  // ─── Modal helpers ────────────────────────────────────────────────────────
  const ModalWrap = ({ onClose, children }) => (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '480px' }}>
        {children}
      </div>
    </div>
  );

  // ─── Projects view ────────────────────────────────────────────────────────
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
              <p style={{ fontSize: '16px', color: '#666' }}>Дизайн-помічник для вашої команди</p>
            </div>
            <button onClick={() => setShowApiInput(true)}
              style={{ marginTop: '8px', padding: '8px 16px', background: apiKey ? '#F0FFF4' : '#FFF8F0', border: apiKey ? '1px solid #9AE6B4' : '1px solid #FBD38D', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: apiKey ? '#276749' : '#744210' }}>
              {apiKey ? '🔑 API Key ✓' : '🔑 Додати API Key'}
            </button>
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Проекти</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            <div onClick={() => setShowNew(true)} style={{ padding: '48px 32px', background: '#fff', border: '2px dashed #E5E5E5', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}><Plus size={28} /></div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>Новий проект</div>
            </div>

            {sorted.map(p => {
              const completedCount = (p.completedSteps || []).length;
              const isEditing = editingId === p.id;
              const isComplete = !!p.completedAt;
              return (
                <div key={p.id} onClick={() => !isEditing && openProject(p)}
                  style={{ padding: '28px', background: '#fff', border: p.important ? '2px solid #FFD700' : isComplete ? '2px solid #22C55E' : '1px solid #E5E5E5', borderRadius: '12px', cursor: isEditing ? 'default' : 'pointer', minHeight: '240px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {isComplete && <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#22C55E', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', color: '#fff' }}>✅ Завершено</div>}
                  {p.important && !isComplete && <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#FFD700', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>⭐ Важливий</div>}
                  <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}><FolderOpen size={22} color="#fff" /></div>
                  {isEditing ? (
                    <div style={{ marginBottom: '8px' }}>
                      <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { setProjects(ps => ps.map(x => x.id === p.id ? { ...x, name: editName } : x)); setEditingId(null); } if (e.key === 'Escape') setEditingId(null); }}
                        onClick={e => e.stopPropagation()}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #1A1A1A', borderRadius: '6px', fontSize: '18px', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button onClick={e => { e.stopPropagation(); setProjects(ps => ps.map(x => x.id === p.id ? { ...x, name: editName } : x)); setEditingId(null); }} style={{ flex: 1, padding: '6px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Зберегти</button>
                        <button onClick={e => { e.stopPropagation(); setEditingId(null); }} style={{ flex: 1, padding: '6px', background: '#E5E5E5', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Скасувати</button>
                      </div>
                    </div>
                  ) : <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', flex: 1 }}>{p.name}</h3>}
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>{new Date(p.createdAt).toLocaleDateString('uk-UA')}</div>
                  {/* Progress bar */}
                  <div style={{ display: 'flex', gap: '3px', marginBottom: '12px' }}>
                    {modes.map(m => {
                      const done = (p.completedSteps || []).includes(m.id);
                      const hasChat = (p.messages[m.id] || []).length > 1;
                      return <div key={m.id} title={m.title} style={{ flex: 1, height: '4px', borderRadius: '2px', background: done ? '#22C55E' : hasChat ? '#1A1A1A' : '#E5E5E5' }} />;
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #E5E5E5' }}>
                    <div style={{ fontSize: '13px', color: '#666' }}>{isComplete ? 'Проект завершено 🎉' : `${completedCount}/9 кроків`}</div>
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
          <ModalWrap onClose={() => setShowApiInput(false)}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Anthropic API Key</h2>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Зберігається локально у вашому браузері</p>
            {apiKey && <div style={{ padding: '10px 14px', background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '8px', fontSize: '13px', color: '#276749', marginBottom: '16px' }}>✓ Поточний ключ: {apiKey.slice(0, 12)}...</div>}
            <input autoFocus type="password" value={apiInput} onChange={e => setApiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveApiKey()} placeholder="sk-ant-..." style={{ width: '100%', padding: '14px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowApiInput(false)} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Скасувати</button>
              <button onClick={saveApiKey} disabled={!apiInput.trim()} style={{ padding: '10px 20px', background: apiInput.trim() ? '#1A1A1A' : '#E5E5E5', border: 'none', borderRadius: '8px', color: '#fff', cursor: apiInput.trim() ? 'pointer' : 'not-allowed', fontSize: '14px' }}>Зберегти</button>
            </div>
          </ModalWrap>
        )}

        {/* New project modal */}
        {showNew && (
          <ModalWrap onClose={() => setShowNew(false)}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>Новий проект</h2>
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createProject()} placeholder="Назва проекту..." style={{ width: '100%', padding: '16px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '16px', marginBottom: '24px', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNew(false)} style={{ padding: '12px 24px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Скасувати</button>
              <button onClick={createProject} disabled={!newName.trim()} style={{ padding: '12px 24px', background: newName.trim() ? '#1A1A1A' : '#E5E5E5', border: 'none', borderRadius: '8px', color: '#fff', cursor: newName.trim() ? 'pointer' : 'not-allowed', fontSize: '14px' }}>Створити</button>
            </div>
          </ModalWrap>
        )}

        {/* Delete modal */}
        {deletingProject && (
          <ModalWrap onClose={() => setDeletingProject(null)}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FEE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}><Trash2 size={24} color="#E53E3E" /></div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Видалити проект?</h2>
            <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6', marginBottom: '24px' }}>Ви впевнені, що хочете видалити <strong>"{deletingProject.name}"</strong>? Цю дію неможливо скасувати.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeletingProject(null)} style={{ padding: '12px 24px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Скасувати</button>
              <button onClick={() => { setProjects(ps => ps.filter(p => p.id !== deletingProject.id)); setDeletingProject(null); }} style={{ padding: '12px 24px', background: '#E53E3E', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>Видалити</button>
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

  // Derived sync states
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
    <div style={{ height: '100vh', background: '#FAFAFA', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1A1A1A' }}>
      {/* Header */}
      <div style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid #E5E5E5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setView('projects')} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}><ArrowLeft size={20} /></button>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '1px' }}>{currentProject?.name}</h1>
            <p style={{ fontSize: '11px', color: '#888' }}>FLOW · {(currentProject?.completedSteps || []).length}/9 кроків</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setShowApiInput(true)} style={{ padding: '7px 12px', background: apiKey ? '#F0FFF4' : '#FFF8F0', border: apiKey ? '1px solid #9AE6B4' : '1px solid #FBD38D', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: apiKey ? '#276749' : '#744210' }}>{apiKey ? '🔑 ✓' : '🔑 API'}</button>
          <button onClick={exportProject} style={{ padding: '7px 14px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}><Download size={13} />Експорт</button>
          {!currentProject?.completedAt && (
            <button onClick={() => setShowCompleteConfirm(true)}
              style={{ padding: '7px 14px', background: allDone ? '#22C55E' : '#F5F5F5', border: allDone ? 'none' : '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: allDone ? '#fff' : '#999', fontWeight: '600' }}>
              {allDone ? '🎉 Завершити проект' : `✓ Завершити (${(currentProject?.completedSteps || []).length}/9)`}
            </button>
          )}
          {currentProject?.completedAt && <div style={{ padding: '7px 14px', background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '8px', fontSize: '12px', color: '#276749', fontWeight: '600' }}>✅ Завершено</div>}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: sidebarCollapsed ? '56px' : '220px', background: '#fff', borderRight: '1px solid #E5E5E5', display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'width 0.2s ease', overflow: 'hidden' }}>
          <div style={{ padding: sidebarCollapsed ? '12px 0' : '12px 12px', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', borderBottom: '1px solid #E5E5E5', flexShrink: 0 }}>
            {!sidebarCollapsed && <span style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Кроки</span>}
            <button onClick={() => setSidebarCollapsed(c => !c)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#999', display: 'flex', alignItems: 'center', borderRadius: '4px' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d={sidebarCollapsed ? 'M5 2l5 5-5 5' : 'M9 2L4 7l5 5'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: sidebarCollapsed ? '8px 6px' : '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {modes.map((m, i) => {
              const active = currentMode === m.id;
              const done   = (currentProject?.completedSteps || []).includes(m.id);
              const hasMsg = (currentProject?.messages[m.id] || []).length > 1;
              return (
                <div key={m.id} onClick={() => setCurrentMode(m.id)} title={sidebarCollapsed ? `${i + 1}. ${m.title}` : undefined}
                  style={{ padding: sidebarCollapsed ? '0' : '10px 10px', background: active ? '#F5F5F5' : 'transparent', border: active ? '1px solid #1A1A1A' : '1px solid transparent', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: '8px', position: 'relative' }}>
                  <div style={{ width: sidebarCollapsed ? '36px' : '22px', height: sidebarCollapsed ? '36px' : '22px', borderRadius: sidebarCollapsed ? '8px' : '4px', background: done ? '#22C55E' : active ? '#1A1A1A' : '#F0F0F0', color: done || active ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0 }}>
                    {done ? <Check size={sidebarCollapsed ? 14 : 11} color="#fff" /> : (sidebarCollapsed ? <span style={{fontSize:'13px'}}>{m.icon}</span> : i + 1)}
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
          </div>
        </div>

        {/* Chat — Column 2 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', minWidth: 0, borderRight: '1px solid #E5E5E5' }}>
          {/* Chat header */}
          <div style={{ padding: '12px 24px', borderBottom: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontSize: '18px' }}>{currMode?.icon}</span>
                <h2 style={{ fontSize: '16px', fontWeight: '600' }}>{currMode?.title}</h2>
                <span style={{ fontSize: '11px', color: '#999', background: '#F5F5F5', padding: '2px 7px', borderRadius: '10px' }}>Крок {modeIdx + 1}/9</span>
              </div>
              <p style={{ fontSize: '11px', color: '#999' }}>{currMode?.description}</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {!(currentProject?.completedSteps || []).includes(currentMode) && hasChat && (
                <button onClick={markStepDone} style={{ padding: '6px 12px', background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#276749', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={11} />Крок виконано
                </button>
              )}
              {!isLastMode && (
                <button onClick={goNextStep} style={{ padding: '6px 12px', background: '#1A1A1A', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Далі <ChevronRight size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {currMsgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0, background: m.role === 'user' ? '#1A1A1A' : '#F5F5F5', border: m.role === 'user' ? 'none' : '1px solid #E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.role === 'user' ? <User size={14} color="#fff" /> : <Sparkles size={14} />}
                </div>
                <div style={{ flex: 1, background: m.role === 'user' ? '#F5F5F5' : '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: '10px', padding: '12px 16px', whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '14px' }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#F5F5F5', border: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={14} /></div>
                <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>{[0,1,2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1A1A1A', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: `${-0.32 + i * 0.16}s` }} />)}</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Files preview */}
          {currFiles.length > 0 && (
            <div style={{ padding: '10px 24px', borderTop: '1px solid #E5E5E5', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {currFiles.map((f, i) => (
                <div key={i} style={{ padding: '4px 10px', background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FileText size={11} />{f.name} <span style={{ color: '#888' }}>({f.size})</span>
                  <button onClick={() => updateProject({ files: { ...currentProject.files, [currentMode]: currFiles.filter((_, idx) => idx !== i) } })} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Input area */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E5E5', background: '#FAFAFA', flexShrink: 0 }}>
            {!apiKey && (
              <div style={{ marginBottom: '8px', padding: '7px 12px', background: '#FFF8F0', border: '1px solid #FBD38D', borderRadius: '8px', fontSize: '12px', color: '#744210', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔑 Потрібен API Key
                <button onClick={() => setShowApiInput(true)} style={{ background: 'none', border: 'none', color: '#744210', cursor: 'pointer', textDecoration: 'underline', fontSize: '12px', padding: 0 }}>Додати →</button>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept=".pdf,image/*" style={{ display: 'none' }} />
            <div style={{ background: '#fff', border: '1px solid #E0E0E0', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={currentMode === 'competitors' ? 'Надай скріншот або опишіть сайт конкурента...' : 'Напишіть повідомлення... (Enter — відправити)'}
                style={{ width: '100%', padding: '12px 14px 6px', background: 'transparent', border: 'none', fontSize: '14px', resize: 'none', minHeight: '46px', maxHeight: '140px', fontFamily: 'inherit', outline: 'none', lineHeight: '1.6', boxSizing: 'border-box', color: '#1A1A1A' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 8px' }}>
                <button onClick={() => fileInputRef.current?.click()} title="Завантажити файл або скріншот"
                  style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F5F5F5', border: '1px solid #E5E5E5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                  <Upload size={13} />
                </button>
                <div style={{ fontSize: '10px', color: '#C0C0C0' }}>Shift+Enter — новий рядок</div>
                <button onClick={() => loading ? abortCtrl?.abort() : sendMessage()} disabled={!loading && !canSend}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: loading ? '#E53E3E' : (canSend ? '#1A1A1A' : '#E0E0E0'), border: 'none', cursor: loading || canSend ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
                  {loading ? <span style={{ width: '9px', height: '9px', background: '#fff', borderRadius: '2px', display: 'block' }} /> : <Send size={13} color="#fff" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — Column 3 */}
        <RightPanel
          currentMode={currentMode}
          currentProject={currentProject}
          briefGroups={briefGroups}
          briefData={briefData}
          briefSyncing={briefSyncing}
          competitorGroups={competitorGroups}
          competitorData={competitorData}
          competitorSyncing={competitorSyncing}
          selectedCompIdx={selectedCompIdx}
          setSelectedCompIdx={setSelectedCompIdx}
          modeStructures={modeStructures}
          modeData={modeData}
          modeSyncing={modeSyncing}
          hasChat={hasChat}
          isSyncing={isSyncing}
          hasStructured={hasStructured}
          handleSync={handleSync}
          copyToFigma={copyToFigma}
        />
      </div>

      {/* API Key modal in workspace */}
      {showApiInput && (
        <ModalWrap onClose={() => setShowApiInput(false)}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Anthropic API Key</h2>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Зберігається локально у вашому браузері</p>
          {apiKey && <div style={{ padding: '10px 14px', background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '8px', fontSize: '13px', color: '#276749', marginBottom: '16px' }}>✓ Поточний ключ: {apiKey.slice(0, 12)}...</div>}
          <input autoFocus type="password" value={apiInput} onChange={e => setApiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveApiKey()} placeholder="sk-ant-..." style={{ width: '100%', padding: '14px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowApiInput(false)} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Скасувати</button>
            <button onClick={saveApiKey} disabled={!apiInput.trim()} style={{ padding: '10px 20px', background: apiInput.trim() ? '#1A1A1A' : '#E5E5E5', border: 'none', borderRadius: '8px', color: '#fff', cursor: apiInput.trim() ? 'pointer' : 'not-allowed', fontSize: '14px' }}>Зберегти</button>
          </div>
        </ModalWrap>
      )}

      {/* Complete project confirm */}
      {showCompleteConfirm && (
        <ModalWrap onClose={() => setShowCompleteConfirm(false)}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Завершити проект?</h2>
          <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6', marginBottom: '24px' }}>Проект <strong>"{currentProject?.name}"</strong> буде позначено як завершений. Ви завжди зможете продовжити роботу.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowCompleteConfirm(false)} style={{ padding: '12px 24px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Скасувати</button>
            <button onClick={completeProject} style={{ padding: '12px 24px', background: '#22C55E', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Завершити проект ✓</button>
          </div>
        </ModalWrap>
      )}

      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }`}</style>
    </div>
  );
}

// ─── Right Panel Component ────────────────────────────────────────────────────
function RightPanel({ currentMode, currentProject, briefGroups, briefData, briefSyncing, competitorGroups, competitorData, competitorSyncing, selectedCompIdx, setSelectedCompIdx, modeStructures, modeData, modeSyncing, hasChat, isSyncing, hasStructured, handleSync, copyToFigma }) {

  const PanelField = ({ label, value, colors }) => (
    <div style={{ background: colors?.bg || '#fff', border: `1px solid ${colors?.border || '#E5E5E5'}`, borderRadius: '8px', padding: '9px 11px', marginBottom: '5px' }}>
      <div style={{ fontSize: '10px', color: colors?.label || '#999', marginBottom: '3px', fontWeight: '600' }}>{label}</div>
      <div style={{ fontSize: '12px', color: value ? '#1A1A1A' : '#CCC', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{value || '—'}</div>
    </div>
  );

  const PanelHeader = ({ title, modeLabel }) => {
    const syncDisabled = isSyncing || !hasChat;
    const figmaDisabled = !hasStructured;
    return (
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #E5E5E5', flexShrink: 0 }}>
        <div style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', marginBottom: '8px' }}>{title}</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={handleSync} disabled={syncDisabled}
            title={!hasChat ? 'Спочатку проведіть діалог у чаті' : ''}
            style={{ flex: 1, padding: '6px 0', border: 'none', borderRadius: '6px', fontSize: '11px', background: syncDisabled ? '#F0F0F0' : '#1A1A1A', color: syncDisabled ? '#BBB' : '#fff', cursor: syncDisabled ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
            {isSyncing ? '⏳ Sync...' : '⚡ Sync'}
          </button>
          <button onClick={() => copyToFigma(currentMode)} disabled={figmaDisabled}
            title={figmaDisabled ? 'Спочатку зробіть Sync' : 'Експортувати в Figma'}
            style={{ flex: 1, padding: '6px 0', borderRadius: '6px', fontSize: '11px', background: figmaDisabled ? '#F8F8F8' : '#fff', border: figmaDisabled ? '1px solid #F0F0F0' : '1px solid #E5E5E5', color: figmaDisabled ? '#CCC' : '#1A1A1A', cursor: figmaDisabled ? 'not-allowed' : 'pointer' }}>
            ✦ Figma
          </button>
        </div>
      </div>
    );
  };

  const panelStyle = { width: '300px', background: '#FAFAFA', borderLeft: '1px solid #E5E5E5', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 };

  // ── Brief panel ────────────────────────────────────────────────────────────
  if (currentMode === 'brief') {
    const data = currentProject?.projectData?.brief_structured || briefData || {};
    return (
      <div style={panelStyle}>
        <PanelHeader title="Brief Summary" />
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {briefGroups.map(group => {
            const groupData = data[group.id] || {};
            const hasData = group.fields.some(f => groupData[f.id]?.trim());
            return (
              <div key={group.id} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px' }}>{group.emoji}</span>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{group.title}</span>
                  {hasData && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C55E', marginLeft: 'auto' }} />}
                </div>
                {group.fields.map(f => <PanelField key={f.id} label={f.label} value={groupData[f.id]} />)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Competitor panel ───────────────────────────────────────────────────────
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
      <div style={{ ...panelStyle, width: '320px' }}>
        <PanelHeader title="Competitor Analysis" />
        {list.length > 0 && (
          <div style={{ padding: '7px 10px', borderBottom: '1px solid #E5E5E5', display: 'flex', gap: '5px', flexWrap: 'wrap', flexShrink: 0, background: '#fff' }}>
            {list.map((comp, idx) => (
              <button key={idx} onClick={() => setSelectedCompIdx(idx)}
                style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', border: 'none', background: selectedCompIdx === idx ? '#1A1A1A' : '#F0F0F0', color: selectedCompIdx === idx ? '#fff' : '#555', whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {comp.name || `Конкурент ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {!active ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#CCC' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔍</div>
              <div style={{ fontSize: '12px', lineHeight: '1.6' }}>Натисни <strong>⚡ Sync</strong><br/>після аналізу конкурентів у чаті</div>
            </div>
          ) : (
            <>
              {competitorGroups.filter(g => !g.isConclusion).map(group => {
                const gd = active[group.id] || {};
                const hasData = group.fields.some(f => gd[f.id]?.trim());
                return (
                  <div key={group.id} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px' }}>{group.emoji}</span>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{group.title}</span>
                      {hasData && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C55E', marginLeft: 'auto' }} />}
                    </div>
                    {group.fields.map(f => <PanelField key={f.id} label={f.label} value={gd[f.id]} />)}
                  </div>
                );
              })}
              {/* Conclusion */}
              {(() => {
                const c = active.conclusion || {};
                const cg = competitorGroups.find(g => g.isConclusion);
                return (
                  <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '2px solid #1A1A1A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px' }}>📌</span>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Висновок</span>
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

  // ── Generic mode panel (steps 3–9) ─────────────────────────────────────────
  const structure = modeStructures[currentMode];
  if (!structure) return null;

  const data = currentProject?.projectData?.[`${currentMode}_structured`] || modeData[currentMode] || null;

  return (
    <div style={panelStyle}>
      <PanelHeader title={modes.find(m => m.id === currentMode)?.title || currentMode} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {!data ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#CCC' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>{modes.find(m => m.id === currentMode)?.icon}</div>
            <div style={{ fontSize: '12px', lineHeight: '1.6' }}>Натисни <strong>⚡ Sync</strong><br/>після роботи у чаті</div>
          </div>
        ) : (
          structure.groups.map(group => {
            const gd = data[group.id] || {};
            const hasData = group.fields.some(f => gd[f.id]?.trim());
            return (
              <div key={group.id} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px' }}>{group.emoji}</span>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{group.title}</span>
                  {hasData && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C55E', marginLeft: 'auto' }} />}
                </div>
                {group.fields.map(f => (
                  <div key={f.id} style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', padding: '9px 11px', marginBottom: '5px' }}>
                    <div style={{ fontSize: '10px', color: '#999', marginBottom: '3px', fontWeight: '600' }}>{f.label}</div>
                    <div style={{ fontSize: '12px', color: gd[f.id] ? '#1A1A1A' : '#CCC', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{gd[f.id] || '—'}</div>
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
