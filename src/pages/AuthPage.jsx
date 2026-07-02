import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [info, setInfo]       = useState(null)

  const handle = async (e) => {
    e.preventDefault()
    setError(null); setInfo(null); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name } }
        })
        if (error) throw error
        setInfo('✓ Revisa tu email para confirmar el registro')
        setMode('login')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    setError(null); setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={s.bg}>
      <div style={s.blob1} /><div style={s.blob2} />
      <div style={s.card}>
        <div style={s.logo}>🌿</div>
        <h1 style={s.title}>FamilyFlow</h1>
        <p style={s.sub}>Presupuesto familiar compartido</p>

        <div style={s.tabs}>
          <button style={{...s.tab, ...(mode==='login'?s.tabActive:{})}} onClick={()=>{setMode('login');setError(null)}}>Entrar</button>
          <button style={{...s.tab, ...(mode==='register'?s.tabActive:{})}} onClick={()=>{setMode('register');setError(null)}}>Registrarse</button>
        </div>

        <form onSubmit={handle} style={s.form}>
          {mode === 'register' && (
            <div style={s.field}>
              <label style={s.label}>Tu nombre</label>
              <input style={s.input} type="text" placeholder="Ej: Carlos" value={name}
                onChange={e=>setName(e.target.value)} required />
            </div>
          )}
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" placeholder="correo@ejemplo.com" value={email}
              onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Contraseña</label>
            <input style={s.input} type="password" placeholder="Mínimo 6 caracteres" value={password}
              onChange={e=>setPass(e.target.value)} required minLength={6} />
          </div>

          {error && <div style={s.error}>{error}</div>}
          {info  && <div style={s.infoBox}>{info}</div>}

          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? <span style={s.spinner}/> : (mode==='login' ? 'Entrar' : 'Crear cuenta')}
          </button>
        </form>

        <div style={s.divider}>
          <div style={{flex:1,height:1,background:'#eee'}}/>
          <span style={s.dividerText}>o</span>
          <div style={{flex:1,height:1,background:'#eee'}}/>
        </div>

        <button style={s.googleBtn} onClick={signInWithGoogle} type="button" disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.8 6C12.4 13 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-9.9 6.9-17z"/>
            <path fill="#FBBC05" d="M10.5 28.7A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.9l-7.9 6C6.7 42.6 14.7 48 24 48z"/>
          </svg>
          Continuar con Google
        </button>

        <p style={s.hint}>
          {mode==='login' ? '¿Primera vez? ' : '¿Ya tienes cuenta? '}
          <button style={s.link} onClick={()=>{setMode(mode==='login'?'register':'login');setError(null)}}>
            {mode==='login' ? 'Regístrate gratis' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  )
}

const s = {
  bg: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
    background:'#F7F5F0', position:'relative', overflow:'hidden', padding:20 },
  blob1: { position:'fixed', top:-150, right:-100, width:500, height:500, borderRadius:'50%',
    background:'radial-gradient(circle, rgba(45,106,79,0.1) 0%, transparent 70%)', pointerEvents:'none' },
  blob2: { position:'fixed', bottom:-100, left:-150, width:400, height:400, borderRadius:'50%',
    background:'radial-gradient(circle, rgba(181,131,141,0.08) 0%, transparent 70%)', pointerEvents:'none' },
  card: { background:'white', borderRadius:24, padding:'40px 36px', width:'100%', maxWidth:400,
    boxShadow:'0 8px 40px rgba(0,0,0,0.08)', position:'relative', zIndex:1, animation:'fadeUp 0.4s ease' },
  logo: { fontSize:48, textAlign:'center', marginBottom:8 },
  title: { fontFamily:"'Fraunces', serif", fontSize:32, fontWeight:700, textAlign:'center',
    letterSpacing:'-1px', color:'#1A1A1A', marginBottom:4 },
  sub: { textAlign:'center', color:'#888', fontSize:14, marginBottom:28 },
  tabs: { display:'flex', background:'#F7F5F0', borderRadius:12, padding:4, marginBottom:24, gap:4 },
  tab: { flex:1, padding:'8px 0', border:'none', borderRadius:9, background:'transparent',
    cursor:'pointer', fontSize:14, fontWeight:500, color:'#888' },
  tabActive: { background:'white', color:'#1A1A1A', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  form: { display:'flex', flexDirection:'column', gap:4 },
  field: { display:'flex', flexDirection:'column', gap:4, marginBottom:12 },
  label: { fontSize:12, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.5px' },
  input: { padding:'12px 14px', border:'1.5px solid #eee', borderRadius:12, fontSize:14,
    outline:'none', transition:'border-color 0.2s', background:'#FAFAF8' },
  error: { background:'#FEF2F0', color:'#E07A5F', fontSize:13, padding:'10px 14px',
    borderRadius:10, marginBottom:8 },
  infoBox: { background:'#F0F7F4', color:'#2D6A4F', fontSize:13, padding:'10px 14px',
    borderRadius:10, marginBottom:8 },
  btn: { padding:'14px', background:'#1A1A1A', color:'white', border:'none', borderRadius:14,
    fontSize:15, fontWeight:600, cursor:'pointer', marginTop:8, display:'flex',
    alignItems:'center', justifyContent:'center', gap:8 },
  spinner: { width:16, height:16, border:'2px solid rgba(255,255,255,0.3)',
    borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite' },
  divider: { display:'flex', alignItems:'center', gap:12, margin:'20px 0 16px' },
  dividerText: { fontSize:12, color:'#ccc', background:'white', padding:'0 8px' },
  googleBtn: { width:'100%', padding:'13px', border:'1.5px solid #eee', borderRadius:14,
    background:'white', cursor:'pointer', fontSize:14, fontWeight:500, color:'#333',
    display:'flex', alignItems:'center', justifyContent:'center', gap:10,
    transition:'border-color 0.2s, box-shadow 0.2s' },
  hint: { textAlign:'center', fontSize:13, color:'#888', marginTop:20 },
  link: { background:'none', border:'none', color:'#2D6A4F', cursor:'pointer',
    fontWeight:600, fontSize:13 },
}
