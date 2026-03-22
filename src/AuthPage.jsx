import React, { useState } from 'react';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Instrument Serif', Georgia, serif";

const AVATAR_COLORS = ['#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EF4444','#14B8A6'];

function getAccounts() {
  try { return JSON.parse(localStorage.getItem('flow:accounts') || '[]'); } catch { return []; }
}
function saveAccounts(accounts) {
  localStorage.setItem('flow:accounts', JSON.stringify(accounts));
}

export default function AuthPage({ onLogin }) {
  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => { setName(''); setEmail(''); setPassword(''); setError(''); };

  const handleLogin = () => {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    const accounts = getAccounts();
    const user = accounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password);
    if (!user) { setError('Incorrect email or password.'); return; }
    localStorage.setItem('flow:session', JSON.stringify({ userId: user.id, name: user.name, email: user.email, avatarColor: user.avatarColor }));
    onLogin({ userId: user.id, name: user.name, email: user.email, avatarColor: user.avatarColor });
  };

  const handleRegister = () => {
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    const accounts = getAccounts();
    if (accounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase())) {
      setError('An account with this email already exists.'); return;
    }
    const avatarColor = AVATAR_COLORS[accounts.length % AVATAR_COLORS.length];
    const user = { id: Date.now().toString(), name: name.trim(), email: email.trim().toLowerCase(), password, avatarColor, createdAt: new Date().toISOString() };
    saveAccounts([...accounts, user]);
    localStorage.setItem('flow:session', JSON.stringify({ userId: user.id, name: user.name, email: user.email, avatarColor }));
    onLogin({ userId: user.id, name: user.name, email: user.email, avatarColor });
  };

  const submit = () => { setLoading(true); setTimeout(() => { mode === 'login' ? handleLogin() : handleRegister(); setLoading(false); }, 120); };

  const onKey = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', fontFamily: FONT_BODY }}>
      {/* Left panel — branding */}
      <div style={{ width: '420px', flexShrink: 0, background: '#1A1A1A', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 48px', color: '#fff' }}>
        <div>
          <div style={{ fontSize: '52px', fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: '400', letterSpacing: '-1px', lineHeight: 1, marginBottom: '12px' }}>FLOW</div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6' }}>Your Design Flow Partner</div>
        </div>

        <div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '24px' }}>9-step design process</div>
          {[
            { icon: '📋', label: 'Brief & Kickoff' },
            { icon: '🔍', label: 'Competitor Analysis' },
            { icon: '🗺️', label: 'Site Map' },
            { icon: '📐', label: 'Wireframes' },
            { icon: '🎭', label: 'Emotions & Archetypes' },
            { icon: '🎨', label: 'Design Session' },
            { icon: '💡', label: 'Concept Search' },
            { icon: '📊', label: 'Design Strategy' },
            { icon: '🎯', label: 'Final Concept' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', opacity: 0.65 }}>
              <span style={{ fontSize: '14px' }}>{step.icon}</span>
              <span style={{ fontSize: '13px', color: '#fff' }}>{step.label}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
          Built for design teams
        </div>
      </div>

      {/* Right panel — auth form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '36px' }}>
            {mode === 'login'
              ? 'Sign in to your FLOW workspace'
              : 'Join your design team on FLOW'}
          </p>

          {mode === 'register' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '500', color: '#444', display: 'block', marginBottom: '6px' }}>Full name</label>
              <input
                autoFocus={mode === 'register'}
                value={name} onChange={e => setName(e.target.value)} onKeyDown={onKey}
                placeholder="Your name"
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: FONT_BODY, background: '#fff', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#1A1A1A'}
                onBlur={e => e.target.style.borderColor = '#E5E5E5'}
              />
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#444', display: 'block', marginBottom: '6px' }}>Email</label>
            <input
              autoFocus={mode === 'login'}
              type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey}
              placeholder="your@email.com"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: FONT_BODY, background: '#fff' }}
              onFocus={e => e.target.style.borderColor = '#1A1A1A'}
              onBlur={e => e.target.style.borderColor = '#E5E5E5'}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#444', display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKey}
              placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: FONT_BODY, background: '#fff' }}
              onFocus={e => e.target.style.borderColor = '#1A1A1A'}
              onBlur={e => e.target.style.borderColor = '#E5E5E5'}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', fontSize: '13px', color: '#C53030', marginBottom: '4px' }}>
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            style={{ width: '100%', padding: '13px', background: loading ? '#999' : '#1A1A1A', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: loading ? 'wait' : 'pointer', marginTop: '20px', fontFamily: FONT_BODY, letterSpacing: '-0.2px', transition: 'background 0.15s' }}
          >
            {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#888' }}>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); reset(); }}
              style={{ background: 'none', border: 'none', color: '#1A1A1A', fontWeight: '600', cursor: 'pointer', fontSize: '14px', padding: 0, fontFamily: FONT_BODY }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
