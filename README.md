# FLOW — UX Design Agent

**Premium AI-assisted design workflow platform** for UX/UI designers.

> Built with React 18 + Vite 5 · Powered by Claude API (Anthropic)

---

## What is FLOW?

FLOW is an AI agent that guides designers through the full UX/UI design process — from client briefing to final concept — step by step.

### Process Steps

| # | Step | Description |
|---|------|-------------|
| 1 | 📋 **Бриф & Kickoff** | Structured client brief collection (5 groups) |
| 2 | 🔍 **Аналіз конкурентів** | Competitor analysis (9 categories + conclusions) |
| 3 | 🗺️ **Site Map** | Information architecture |
| 4 | 📐 **Wireframes** | Screen structure |
| 5 | 🎭 **Емоції & Архетипи** | Emotional tone, Jung archetypes |
| 6 | 🎨 **Design Session** | Visual references & moodboard |
| 7 | 💡 **Пошук Ідеї** | Brainstorming & SCAMPER |
| 8 | 📊 **Design Strategy** | 2 strategic directions |
| 9 | 🎯 **Фінальний Концепт** | Hero screen concept |

---

## Key Features

### 📋 Brief Mode
- Natural AI conversation collects client info across 5 structured groups:
  - 👤 Про клієнта (USP, advantages, weaknesses)
  - 🎯 Мета (key action, purpose)
  - ✨ Побажання (UI, structure, limitations)
  - 🔍 Конкуренція (competitors)
  - 📎 Додатково (materials, open questions)
- **⚡ Sync** — Claude extracts structured JSON from conversation
- **✦ Copy to Figma** — exports to clipboard for Figma plugin

### 🔍 Competitor Analysis Mode
- Upload screenshots or paste URLs of competitor sites
- AI analyzes across 9 categories:
  - UI: Main Screen, Fonts, Colors, Decorations, Composition
  - Structure & Sales Funnel
  - Best Practices
  - UX
  - CX Part
- Each competitor gets a **📌 Conclusion** (✅ works well / ❌ weak / 📌 to remember)
- Per-competitor tabs in the right panel
- **⚡ Sync** + **✦ Figma** export

### ✦ Figma Plugin (`/figma-plugin`)
Clipboard bridge — no server needed.

**Brief export** generates a presentation-style document matching the reference design:
- 1920px wide document
- Dark header with project name + "Creative Brief" badge
- 3 navigation blocks (pink / yellow / pink)
- Numbered Q&A layout (question column 565px | answer column 1163px)
- Competitor cards with logo placeholder

**Competitor export** generates:
- Horizontal columns — one per competitor
- 9 analysis group cards with color-coded backgrounds
- 📌 Conclusion block (green / red / yellow cards)

---

## Tech Stack

- **React 18** + **Vite 5** (port 3000)
- **Claude API** (`claude-sonnet-4-5-20251001`) via direct browser fetch
  - `anthropic-dangerous-direct-browser-access: true` header
- **localStorage** for API key + project data
- **Figma Plugin API** — clipboard bridge (no server)
- **lucide-react** icons

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:3000
```

Set your **Anthropic API Key** via the 🔑 button in the app (stored in localStorage).

---

## Figma Plugin Setup

1. Open Figma → **Plugins** → **Development** → **Import plugin from manifest**
2. Select `/figma-plugin/manifest.json`
3. Run plugin: **FLOW Importer**

**Workflow:**
1. In FLOW app: fill brief → **⚡ Sync** → **✦ Copy to Figma**
2. In Figma: open plugin → **Paste from FLOW** → **Create in Figma**

---

## Project Structure

```
/
├── src/
│   ├── FlowAgent.jsx     # Main component (all logic)
│   └── main.jsx          # Entry point
├── figma-plugin/
│   ├── manifest.json     # Plugin manifest
│   ├── code.js           # Plugin logic (creates Figma frames)
│   └── ui.html           # Plugin UI (clipboard bridge)
├── index.html
├── vite.config.js
└── package.json
```

---

*FLOW — Your Design Flow Partner*
