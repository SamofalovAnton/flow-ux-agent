import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, FileText, Download, Plus, Check, User, Sparkles, FolderOpen, ArrowLeft, Trash2, FileDown, Edit2, Star, Key } from 'lucide-react';

export default function UXDesignAgent() {
  const [view, setView] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentMode, setCurrentMode] = useState('brief');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [editName, setEditName] = useState('');
  const [deletingProject, setDeletingProject] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('design_projects');
    if (saved) setProjects(JSON.parse(saved));
    const savedKey = localStorage.getItem('anthropic_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('design_projects', JSON.stringify(projects));
    }
  }, [projects]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentProject?.messages, loading]);

  const modes = [
    { id: 'brief', title: 'Бриф & Kickoff', icon: '📋', description: 'Збір інформації від клієнта', exportable: true },
    { id: 'competitors', title: 'Аналіз конкурентів', icon: '🔍', description: 'Дизайн, UX, POD, POE, CX', exportable: true },
    { id: 'sitemap', title: 'Site Map', icon: '🗺️', description: 'Структура та архітектура', exportable: true },
    { id: 'wireframes', title: 'Wireframes', icon: '📐', description: 'Структура екранів', exportable: true },
    { id: 'emotions', title: 'Емоції & Архетипи', icon: '🎭', description: 'Емоційний тон', exportable: true },
    { id: 'moodboard', title: 'Design Session', icon: '🎨', description: 'Візуальні референси', exportable: true },
    { id: 'concept', title: 'Пошук Ідеї', icon: '💡', description: 'Brainstorming', exportable: true },
    { id: 'strategy', title: 'Design Strategy', icon: '📊', description: '2 стратегії', exportable: true },
    { id: 'final', title: 'Фінальний Концепт', icon: '🎯', description: 'Hero screen', exportable: true }
  ];

  const getSystemPrompt = (modeId) => {
    const prompts = {
      brief: 'Ти експерт з брифінгів. Збирай інформацію: бізнес, УТП, переваги, недоліки, ЦА, UI побажання, конкуренти.',
      competitors: 'Ти експерт з UX/UI аналізу. Аналізуй: дизайн, кольори, типографіку, UX patterns, POE, POD, CX.',
      sitemap: 'Ти експерт ІА. Створюй site maps з ієрархією, SEO, навігацією, воронками продажів.',
      wireframes: 'Ти експерт wireframes. Створюй детальні каркаси з grid, компонентами, UX принципами.',
      emotions: 'Ти експерт емоційного дизайну. Використовуй 12 архетипів Юнга, tone of voice.',
      moodboard: 'Ти експерт візуального дизайну. Підбирай шрифти, кольори, imagery, анімації.',
      concept: 'Ти креативний стратег. Генеруй 5-10 ідей через brainstorming, SCAMPER.',
      strategy: 'Ти дизайн-стратег. Створюй 2 різні стратегії: visual, UX, content, technical.',
      final: 'Ти senior UI дизайнер. Описуй hero section: layout, typography, colors, interactions.'
    };
    return prompts[modeId] + '\n\nВідповідай українською. Будь конкретним та структурованим.';
  };

  const saveApiKey = () => {
    const key = apiKeyInput.trim();
    if (!key) return;
    setApiKey(key);
    localStorage.setItem('anthropic_api_key', key);
    setShowApiKey(false);
    setApiKeyInput('');
  };

  const createNewProject = () => {
    if (!newProjectName.trim()) return;
    const newProj = {
      id: Date.now().toString(),
      name: newProjectName,
      createdAt: new Date().toISOString(),
      important: false,
      messages: {},
      files: {},
      projectData: {}
    };
    modes.forEach(m => {
      newProj.messages[m.id] = [{ role: 'assistant', content: `Привіт! Режим "${m.title}". Готовий допомогти.` }];
      newProj.files[m.id] = [];
    });
    setProjects([...projects, newProj]);
    setNewProjectName('');
    setShowNewProject(false);
  };

  const toggleImportant = (id, e) => {
    e.stopPropagation();
    setProjects(projects.map(p => p.id === id ? { ...p, important: !p.important } : p));
  };

  const startEditProject = (project, e) => {
    e.stopPropagation();
    setEditingProject(project.id);
    setEditName(project.name);
  };

  const saveEditProject = (id) => {
    if (!editName.trim()) return;
    setProjects(projects.map(p => p.id === id ? { ...p, name: editName } : p));
    setEditingProject(null);
    setEditName('');
  };

  const cancelEdit = () => {
    setEditingProject(null);
    setEditName('');
  };

  const openProject = (p) => {
    setCurrentProject(p);
    setCurrentMode('brief');
    setView('workspace');
  };

  const deleteProject = (project, e) => {
    e.stopPropagation();
    setDeletingProject(project);
  };

  const confirmDelete = () => {
    setProjects(projects.filter(p => p.id !== deletingProject.id));
    setDeletingProject(null);
  };

  const cancelDelete = () => {
    setDeletingProject(null);
  };

  const updateProject = (updates) => {
    const updated = { ...currentProject, ...updates };
    setCurrentProject(updated);
    setProjects(projects.map(p => p.id === currentProject.id ? updated : p));
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
      newFiles.push({ name: file.name, type: file.type, base64, size: (file.size / 1024).toFixed(2) + ' KB' });
    }
    updateProject({ files: { ...currentProject.files, [currentMode]: [...(currentProject.files[currentMode] || []), ...newFiles] } });
  };

  const sendMessage = async (text = input) => {
    if (!text.trim() && (!currentProject.files[currentMode] || !currentProject.files[currentMode].length)) return;

    if (!apiKey) {
      setShowApiKey(true);
      return;
    }

    const userMsg = { role: 'user', content: text || 'Проаналізуй файли' };
    const currMsgs = currentProject.messages[currentMode] || [];
    const updated = [...currMsgs, userMsg];

    updateProject({ messages: { ...currentProject.messages, [currentMode]: updated } });
    setInput('');
    setLoading(true);
    const controller = new AbortController();
    setAbortController(controller);
    try {
      const apiMsgs = [{
        role: 'user',
        content: [
          ...(currentProject.files[currentMode] || []).map(f => {
            if (f.type === 'application/pdf') return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.base64 } };
            if (f.type.startsWith('image/')) return { type: 'image', source: { type: 'base64', media_type: f.type, data: f.base64 } };
            return null;
          }).filter(Boolean),
          { type: 'text', text: text + `\n\nКонтекст: ${JSON.stringify(currentProject.projectData)}` }
        ]
      }];
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20251001',
          max_tokens: 4000,
          system: getSystemPrompt(currentMode),
          messages: apiMsgs
        }),
        signal: controller.signal
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const aiText = data.content?.filter(i => i.type === 'text').map(i => i.text).join('\n') || 'Помилка';
      const aiMsg = { role: 'assistant', content: aiText };

      updateProject({
        messages: { ...currentProject.messages, [currentMode]: [...updated, aiMsg] },
        files: { ...currentProject.files, [currentMode]: [] }
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        updateProject({
          messages: { ...currentProject.messages, [currentMode]: [...updated, { role: 'assistant', content: '⏸️ Генерацію зупинено' }] }
        });
      } else {
        updateProject({
          messages: { ...currentProject.messages, [currentMode]: [...updated, { role: 'assistant', content: `❌ Помилка: ${err.message}` }] }
        });
      }
    }
    setLoading(false);
    setAbortController(null);
  };

  const stopGeneration = () => {
    if (abortController) abortController.abort();
  };

  const generateBriefStructure = async () => {
    const content = (currentProject.messages['brief'] || []).filter(m => m.role === 'assistant').map(m => m.content).join('\n\n');
    setLoading(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20251001',
          max_tokens: 4000,
          system: 'Структуруй бриф у JSON: projectName, projectDescription, about{client,usp,advantages,disadvantages}, audience{target,bestSelling}, wishes{ui,structure,limitations}, competition[], additionally{materials,questions}. Якщо немає даних - пусті строки. Тільки JSON без коментарів.',
          messages: [{ role: 'user', content: `Структуруй:\n\n${content}` }]
        })
      });
      const data = await res.json();
      let json = data.content.filter(i => i.type === 'text').map(i => i.text).join('').replace(/```json|```/g, '').trim();
      const structured = JSON.parse(json);
      const blob = new Blob([JSON.stringify(structured, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject.name}_brief_figma.json`;
      a.click();
    } catch (err) {
      alert('Помилка структурування: ' + err.message);
    }
    setLoading(false);
  };

  const exportToFigma = () => {
    if (currentMode === 'brief') { generateBriefStructure(); return; }
    const content = (currentProject.messages[currentMode] || []).filter(m => m.role === 'assistant').map(m => m.content).join('\n\n');
    const data = { projectName: currentProject.name, mode: modes.find(m => m.id === currentMode).title, content, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name}_${currentMode}_figma.json`;
    a.click();
  };

  const saveData = () => {
    const summary = (currentProject.messages[currentMode] || []).filter(m => m.role === 'assistant').map(m => m.content).join('\n\n');
    updateProject({ projectData: { ...currentProject.projectData, [currentMode]: summary } });
    alert('Збережено!');
  };

  const exportProject = () => {
    const all = modes.map(m => {
      const msgs = currentProject.messages[m.id] || [];
      return `\n\n===== ${m.title.toUpperCase()} =====\n\n${msgs.map(msg => `[${msg.role === 'user' ? 'Клієнт' : 'Агент'}]: ${msg.content}`).join('\n\n')}`;
    }).join('\n');
    const blob = new Blob([all], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name}.txt`;
    a.click();
  };

  // ── API Key Modal ──────────────────────────────────────────────────────────
  const ApiKeyModal = () => (
    <div onClick={() => setShowApiKey(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '480px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Key size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '600' }}>API Key</h2>
            <p style={{ fontSize: '13px', color: '#666' }}>Зберігається локально у браузері</p>
          </div>
        </div>
        {apiKey && (
          <div style={{ padding: '10px 14px', background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '8px', fontSize: '13px', color: '#276749', marginBottom: '16px' }}>
            ✓ API Key вже збережено: {apiKey.slice(0, 10)}...
          </div>
        )}
        <input
          autoFocus
          type="password"
          value={apiKeyInput}
          onChange={e => setApiKeyInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveApiKey()}
          placeholder="sk-ant-..."
          style={{ width: '100%', padding: '14px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', outline: 'none', fontFamily: 'monospace' }}
        />
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowApiKey(false)} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Скасувати</button>
          <button onClick={saveApiKey} disabled={!apiKeyInput.trim()} style={{ padding: '10px 20px', background: apiKeyInput.trim() ? '#1A1A1A' : '#E5E5E5', border: 'none', borderRadius: '8px', color: '#fff', cursor: apiKeyInput.trim() ? 'pointer' : 'not-allowed', fontSize: '14px' }}>Зберегти</button>
        </div>
      </div>
    </div>
  );

  // ── Projects View ──────────────────────────────────────────────────────────
  if (view === 'projects') {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAFA', color: '#1A1A1A', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ padding: '48px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
            <div>
              <h1 style={{ fontSize: '48px', fontWeight: '600', marginBottom: '8px', letterSpacing: '-1px' }}>FLOW</h1>
              <p style={{ fontSize: '16px', color: '#666' }}>Your Design Flow Partner</p>
            </div>
            <button onClick={() => setShowApiKey(true)} title="Налаштувати API Key" style={{ padding: '10px 16px', background: apiKey ? '#F0FFF4' : '#FFF8F0', border: apiKey ? '1px solid #9AE6B4' : '1px solid #FBD38D', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: apiKey ? '#276749' : '#744210' }}>
              <Key size={14} />
              {apiKey ? 'API Key ✓' : 'Set API Key'}
            </button>
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>Your Projects</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            <div onClick={() => setShowNewProject(true)} style={{ padding: '48px 32px', background: '#fff', border: '2px dashed #E5E5E5', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}><Plus size={28} /></div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>New Project</div>
            </div>

            {projects.sort((a, b) => {
              if (a.important && !b.important) return -1;
              if (!a.important && b.important) return 1;
              return new Date(b.createdAt) - new Date(a.createdAt);
            }).map(p => {
              const completed = modes.filter(m => p.messages[m.id]?.length > 1).length;
              const isEditing = editingProject === p.id;
              return (
                <div key={p.id} onClick={() => !isEditing && openProject(p)} style={{ padding: '28px', background: '#fff', border: p.important ? '2px solid #FFD700' : '1px solid #E5E5E5', borderRadius: '12px', cursor: isEditing ? 'default' : 'pointer', minHeight: '240px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {p.important && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#FFD700', color: '#1A1A1A', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>⭐ Important</div>
                  )}
                  <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}><FolderOpen size={22} color="#fff" /></div>
                  {isEditing ? (
                    <div style={{ marginBottom: '8px' }}>
                      <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveEditProject(p.id); if (e.key === 'Escape') cancelEdit(); }} onClick={e => e.stopPropagation()} style={{ width: '100%', padding: '8px 12px', border: '1px solid #1A1A1A', borderRadius: '6px', fontSize: '18px', fontWeight: '600', outline: 'none' }} />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button onClick={e => { e.stopPropagation(); saveEditProject(p.id); }} style={{ flex: 1, padding: '6px 12px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Save</button>
                        <button onClick={e => { e.stopPropagation(); cancelEdit(); }} style={{ flex: 1, padding: '6px 12px', background: '#E5E5E5', color: '#1A1A1A', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', flex: 1 }}>{p.name}</h3>
                  )}
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>{new Date(p.createdAt).toLocaleDateString('uk-UA')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #E5E5E5' }}>
                    <div style={{ fontSize: '13px', color: '#666' }}>{completed}/9 steps</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={e => toggleImportant(p.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: p.important ? '#FFD700' : '#D4D4D4' }}><Star size={18} fill={p.important ? '#FFD700' : 'none'} strokeWidth={1} /></button>
                      <button onClick={e => startEditProject(p, e)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' }}><Edit2 size={18} strokeWidth={1} /></button>
                      <button onClick={e => deleteProject(p, e)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: '4px' }}><Trash2 size={18} strokeWidth={1} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showApiKey && <ApiKeyModal />}

        {showNewProject && (
          <div onClick={() => setShowNewProject(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '480px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>Create New Project</h2>
              <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createNewProject()} placeholder="Project name..." style={{ width: '100%', padding: '16px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '16px', marginBottom: '24px', outline: 'none' }} />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowNewProject(false)} style={{ padding: '12px 24px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                <button onClick={createNewProject} disabled={!newProjectName.trim()} style={{ padding: '12px 24px', background: newProjectName.trim() ? '#1A1A1A' : '#E5E5E5', border: 'none', borderRadius: '8px', color: '#fff', cursor: newProjectName.trim() ? 'pointer' : 'not-allowed', fontSize: '14px' }}>Create</button>
              </div>
            </div>
          </div>
        )}

        {deletingProject && (
          <div onClick={cancelDelete} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '480px' }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FEE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}><Trash2 size={24} color="#E53E3E" strokeWidth={1.5} /></div>
                <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Видалити проект?</h2>
                <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6' }}>Ви впевнені, що хочете видалити <strong>"{deletingProject.name}"</strong>?<br /><br />Цю дію неможливо скасувати.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={cancelDelete} style={{ padding: '12px 24px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Скасувати</button>
                <button onClick={confirmDelete} style={{ padding: '12px 24px', background: '#E53E3E', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>Видалити</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Workspace View ─────────────────────────────────────────────────────────
  const currMsgs = currentProject?.messages[currentMode] || [];
  const currFiles = currentProject?.files[currentMode] || [];
  const currMode = modes.find(m => m.id === currentMode);

  return (
    <div style={{ height: '100vh', background: '#FAFAFA', color: '#1A1A1A', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ padding: '20px 40px', background: '#fff', borderBottom: '1px solid #E5E5E5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => setView('projects')} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}><ArrowLeft size={20} /></button>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '2px' }}>{currentProject?.name}</h1>
            <p style={{ fontSize: '12px', color: '#666' }}>FLOW — Your Design Flow Partner</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => setShowApiKey(true)} title="API Key" style={{ padding: '8px', background: 'none', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', color: apiKey ? '#22C55E' : '#999' }}><Key size={16} /></button>
          {currMode?.exportable && <button onClick={exportToFigma} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}><FileDown size={16} />Export to Figma</button>}
          <button onClick={saveData} style={{ padding: '10px 20px', background: '#1A1A1A', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}><Plus size={16} />Save</button>
          <button onClick={exportProject} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}><Download size={16} />Export</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: '260px', background: '#fff', borderRight: '1px solid #E5E5E5', overflowY: 'auto', padding: '28px 20px' }}>
          <div style={{ fontSize: '11px', color: '#999', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Process Steps</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {modes.map((m, i) => {
              const active = currentMode === m.id;
              const done = currentProject?.messages[m.id]?.length > 1;
              return (
                <div key={m.id} onClick={() => setCurrentMode(m.id)} style={{ padding: '14px', background: active ? '#F5F5F5' : '#fff', border: active ? '1px solid #1A1A1A' : '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: active ? '#1A1A1A' : '#F5F5F5', color: active ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600' }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{m.title}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{m.description}</div>
                    </div>
                    {done && <Check size={14} style={{ color: '#22C55E' }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          <div style={{ padding: '20px 40px', borderBottom: '1px solid #E5E5E5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ fontSize: '24px' }}>{currMode?.icon}</div>
              <h2 style={{ fontSize: '20px', fontWeight: '600' }}>{currMode?.title}</h2>
            </div>
            <p style={{ fontSize: '13px', color: '#666' }}>{currMode?.description}</p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {currMsgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: m.role === 'user' ? '#1A1A1A' : '#F5F5F5', border: m.role === 'user' ? 'none' : '1px solid #E5E5E5', color: m.role === 'user' ? '#fff' : '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}
                </div>
                <div style={{ flex: 1, background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: '12px', padding: '18px 20px', whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '14px' }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F5F5F5', border: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={18} /></div>
                <div style={{ background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: '12px', padding: '18px 20px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1A1A1A', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: `${-0.32 + i * 0.16}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {currFiles.length > 0 && (
            <div style={{ padding: '14px 40px', borderTop: '1px solid #E5E5E5', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {currFiles.map((f, i) => (
                <div key={i} style={{ padding: '6px 12px', background: '#F5F5F5', border: '1px solid #E5E5E5', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={14} />{f.name}
                  <button onClick={() => updateProject({ files: { ...currentProject.files, [currentMode]: currFiles.filter((_, idx) => idx !== i) } })} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '0 4px', fontSize: '16px' }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '20px 40px', borderTop: '1px solid #E5E5E5', background: '#FAFAFA' }}>
            {!apiKey && (
              <div style={{ marginBottom: '12px', padding: '10px 16px', background: '#FFF8F0', border: '1px solid #FBD38D', borderRadius: '8px', fontSize: '13px', color: '#744210', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={14} />
                <span>Для роботи потрібен API Key. </span>
                <button onClick={() => setShowApiKey(true)} style={{ background: 'none', border: 'none', color: '#744210', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px', padding: 0 }}>Додати →</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept=".pdf,image/*" style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: '12px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer' }}><Upload size={18} /></button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                style={{ flex: 1, padding: '14px 18px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '14px', resize: 'none', minHeight: '50px', maxHeight: '140px', fontFamily: 'inherit', outline: 'none' }}
              />
              <button
                onClick={() => loading ? stopGeneration() : sendMessage()}
                disabled={!loading && (!input.trim() && !currFiles.length)}
                style={{ padding: '14px 28px', background: loading ? '#E53E3E' : ((!input.trim() && !currFiles.length) ? '#E5E5E5' : '#1A1A1A'), border: 'none', borderRadius: '8px', color: '#fff', cursor: (loading || input.trim() || currFiles.length) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}
              >
                {loading ? '⏹ Stop' : <><Send size={16} />Send</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showApiKey && <ApiKeyModal />}

      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
    </div>
  );
}
