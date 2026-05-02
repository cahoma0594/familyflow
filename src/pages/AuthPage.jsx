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
  hint: { textAlign:'center', fontSize:13, color:'#888', marginTop:20 },
  link: { background:'none', border:'none', color:'#2D6A4F', cursor:'pointer',
    fontWeight:600, fontSize:13 },
}
