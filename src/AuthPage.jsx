import React, { useState, useEffect, useRef } from 'react';

const FONT_BODY    = "'Inter', system-ui, -apple-system, sans-serif";
const FONT_DISPLAY = "'Instrument Serif', Georgia, serif";
const AVATAR_COLORS = ['#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EF4444','#14B8A6'];

function getAccounts() {
  try { return JSON.parse(localStorage.getItem('flow:accounts') || '[]'); } catch { return []; }
}
function saveAccounts(accounts) {
  localStorage.setItem('flow:accounts', JSON.stringify(accounts));
}
function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}
function buildSession(user) {
  return { userId: user.id, name: user.name, email: user.email, avatarColor: user.avatarColor, picture: user.picture || null };
}

export default function AuthPage({ onLogin }) {
  const [mode, setMode]         = useState('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('flow:google_client_id') || '');
  const [showGConfig, setShowGConfig] = useState(false);
  const [gConfigInput, setGConfigInput] = useState('');
  const [gReady, setGReady]     = useState(false);
  const googleBtnRef            = useRef(null);

  // ── Load Google Identity Services ──────────────────────────────────────────
  useEffect(() => {
    if (!googleClientId) return;
    if (window.google?.accounts) { initGoogle(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [googleClientId]);

  const initGoogle = () => {
    if (!window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
    });
    setGReady(true);
  };

  useEffect(() => {
    if (gReady && googleBtnRef.current && window.google?.accounts?.id) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 352,
        shape: 'rectangular',
        logo_alignment: 'left',
        text: 'continue_with',
      });
    }
  }, [gReady, mode]);

  const handleGoogleCredential = (response) => {
    const payload = decodeJWT(response.credential);
    if (!payload) { setError('Google sign-in failed.'); return; }
    const { sub, email: gEmail, name: gName, picture } = payload;
    const accounts = getAccounts();
    let user = accounts.find(a => a.email.toLowerCase() === gEmail.toLowerCase());
    if (!user) {
      const avatarColor = AVATAR_COLORS[accounts.length % AVATAR_COLORS.length];
      user = { id: `google_${sub}`, name: gName, email: gEmail.toLowerCase(), password: null, avatarColor, picture, googleId: sub, createdAt: new Date().toISOString() };
      saveAccounts([...accounts, user]);
    }
    const session = buildSession(user);
    localStorage.setItem('flow:session', JSON.stringify(session));
    onLogin(session);
  };

  const saveGoogleClientId = () => {
    const id = gConfigInput.trim();
    if (!id) return;
    localStorage.setItem('flow:google_client_id', id);
    setGoogleClientId(id);
    setShowGConfig(false);
    setGConfigInput('');
  };

  // ── Email auth ──────────────────────────────────────────────────────────────
  const reset = () => { setName(''); setEmail(''); setPassword(''); setError(''); };

  const handleLogin = () => {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    const accounts = getAccounts();
    const user = accounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password);
    if (!user) { setError('Incorrect email or password.'); return; }
    const session = buildSession(user);
    localStorage.setItem('flow:session', JSON.stringify(session));
    onLogin(session);
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
    const session = buildSession(user);
    localStorage.setItem('flow:session', JSON.stringify(session));
    onLogin(session);
  };

  const submit = () => {
    setLoading(true);
    setTimeout(() => { mode === 'login' ? handleLogin() : handleRegister(); setLoading(false); }, 120);
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', border: '1.5px solid #E5E5E5',
    borderRadius: '10px', fontSize: '14px', outline: 'none',
    boxSizing: 'border-box', fontFamily: FONT_BODY, background: '#fff',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', fontFamily: FONT_BODY }}>

      {/* ── Left panel ── */}
      <div style={{ width: '400px', flexShrink: 0, background: '#1A1A1A', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 48px', color: '#fff' }}>
        <div>
          <div style={{ fontSize: '52px', fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: '400', letterSpacing: '-1px', lineHeight: 1, marginBottom: '12px' }}>FLOW</div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Your Design Flow Partner</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>9-step design process</div>
          {[
            ['📋','Brief & Kickoff'],['🔍','Competitor Analysis'],['🗺️','Site Map'],
            ['📐','Wireframes'],['🎭','Emotions & Archetypes'],['🎨','Design Session'],
            ['💡','Concept Search'],['📊','Design Strategy'],['🎯','Final Concept'],
          ].map(([icon, label], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '9px', opacity: 0.6 }}>
              <span style={{ fontSize: '13px' }}>{icon}</span>
              <span style={{ fontSize: '12px', color: '#fff' }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Built for design teams</div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '392px', padding: '0 20px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '6px', letterSpacing: '-0.5px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>
            {mode === 'login' ? 'Sign in to your FLOW workspace' : 'Join your design team on FLOW'}
          </p>

          {/* ── Google button ── */}
          {googleClientId ? (
            <div style={{ marginBottom: '20px' }}>
              <div ref={googleBtnRef} style={{ width: '100%' }} />
              {!gReady && (
                <div style={{ height: '44px', background: '#f4f4f4', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#888' }}>
                  Loading Google...
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowGConfig(true)}
              style={{ width: '100%', padding: '12px 14px', background: '#fff', border: '1.5px solid #E5E5E5', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px', fontFamily: FONT_BODY, color: '#444' }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M47.5 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h13.1c-.6 3-2.4 5.5-5 7.2v6h8.1c4.7-4.4 7.3-10.8 7.3-17.3z"/>
                <path fill="#34A853" d="M24 48c6.5 0 12-2.1 15.9-5.8l-8.1-6c-2.1 1.4-4.8 2.2-7.8 2.2-6 0-11.1-4-12.9-9.5H3v6.2C6.9 42.8 15 48 24 48z"/>
                <path fill="#FBBC05" d="M11.1 28.9c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-6.2H3A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.6-5.9z"/>
                <path fill="#EA4335" d="M24 9.5c3.4 0 6.4 1.2 8.8 3.5l6.6-6.6C35.9 2.5 30.4 0 24 0 15 0 6.9 5.2 3 13.2l8.1 6.2C12.9 13.5 18 9.5 24 9.5z"/>
              </svg>
              Set up Google Sign-In
            </button>
          )}

          {/* ── Divider ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#E5E5E5' }} />
            <span style={{ fontSize: '12px', color: '#BBB' }}>or continue with email</span>
            <div style={{ flex: 1, height: '1px', background: '#E5E5E5' }} />
          </div>

          {/* ── Email form ── */}
          {mode === 'register' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: '#555', display: 'block', marginBottom: '6px' }}>Full name</label>
              <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Your name" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#1A1A1A'} onBlur={e => e.target.style.borderColor = '#E5E5E5'} />
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#555', display: 'block', marginBottom: '6px' }}>Email</label>
            <input autoFocus={mode === 'login'} type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="your@email.com" style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#1A1A1A'} onBlur={e => e.target.style.borderColor = '#E5E5E5'} />
          </div>

          <div style={{ marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#555', display: 'block', marginBottom: '6px' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'} style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#1A1A1A'} onBlur={e => e.target.style.borderColor = '#E5E5E5'} />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', fontSize: '13px', color: '#C53030', marginTop: '8px' }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={loading}
            style={{ width: '100%', padding: '13px', background: loading ? '#999' : '#1A1A1A', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: loading ? 'wait' : 'pointer', marginTop: '18px', fontFamily: FONT_BODY }}>
            {loading ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#888' }}>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); reset(); }}
              style={{ background: 'none', border: 'none', color: '#1A1A1A', fontWeight: '600', cursor: 'pointer', fontSize: '13px', padding: 0, fontFamily: FONT_BODY }}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Google Client ID config modal ── */}
      {showGConfig && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '480px', maxWidth: '90vw', fontFamily: FONT_BODY }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Set up Google Sign-In</h3>
            <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6', marginBottom: '20px' }}>
              Create a project in <strong>Google Cloud Console</strong>, enable the <em>Google Identity API</em>,
              create OAuth 2.0 credentials, and add <code style={{ background: '#F5F5F5', padding: '2px 6px', borderRadius: '4px' }}>{window.location.origin}</code> as an authorized origin.
            </p>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#555', display: 'block', marginBottom: '6px' }}>Google Client ID</label>
            <input autoFocus value={gConfigInput} onChange={e => setGConfigInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveGoogleClientId()}
              placeholder="xxxxxxxx.apps.googleusercontent.com"
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E5E5', borderRadius: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', marginBottom: '20px' }} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowGConfig(false)} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontFamily: FONT_BODY }}>Cancel</button>
              <button onClick={saveGoogleClientId} disabled={!gConfigInput.trim()} style={{ padding: '10px 20px', background: gConfigInput.trim() ? '#1A1A1A' : '#E5E5E5', border: 'none', borderRadius: '8px', color: '#fff', cursor: gConfigInput.trim() ? 'pointer' : 'not-allowed', fontSize: '14px', fontFamily: FONT_BODY }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
