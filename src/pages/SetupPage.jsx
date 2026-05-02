import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SetupPage({ user, onDone }) {
  const [mode, setMode]         = useState('create') // 'create' | 'join'
  const [familyName, setFName]  = useState('Familia ' + (user.user_metadata?.display_name || ''))
  const [inviteCode, setCode]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const createFamily = async () => {
    setLoading(true); setError(null)
    try {
      const { data: fam, error: e1 } = await supabase
        .from('families').insert({ name: familyName, created_by: user.id }).select().single()
      if (e1) throw e1
      const { error: e2 } = await supabase
        .from('family_members').insert({ family_id: fam.id, user_id: user.id, role: 'admin' })
      if (e2) throw e2
      onDone(fam.id)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  // Join by family ID (simple approach: share the family UUID)
  const joinFamily = async () => {
    setLoading(true); setError(null)
    try {
      const { data: fam, error: e1 } = await supabase
        .from('families').select('id,name').eq('id', inviteCode.trim()).single()
      if (e1) throw new Error('Código de familia no encontrado')
      const { error: e2 } = await supabase
        .from('family_members').insert({ family_id: fam.id, user_id: user.id, role: 'member' })
      if (e2 && e2.code !== '23505') throw e2 // ignore duplicate
      onDone(fam.id)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={s.bg}>
      <div style={s.card}>
        <div style={s.emoji}>👨‍👩‍👧</div>
        <h2 style={s.title}>Configura tu familia</h2>
        <p style={s.sub}>Crea un espacio compartido o únete al de tu pareja</p>

        <div style={s.tabs}>
          <button style={{...s.tab,...(mode==='create'?s.tabA:{})}} onClick={()=>setMode('create')}>Crear familia</button>
          <button style={{...s.tab,...(mode==='join'?s.tabA:{})}} onClick={()=>setMode('join')}>Unirme a una</button>
        </div>

        {mode === 'create' ? (
          <>
            <label style={s.label}>Nombre de la familia</label>
            <input style={s.input} value={familyName} onChange={e=>setFName(e.target.value)} placeholder="Familia García..." />
            <p style={s.hint}>Después podrás compartir el código con tu pareja para que se una.</p>
            {error && <div style={s.err}>{error}</div>}
            <button style={s.btn} onClick={createFamily} disabled={loading || !familyName.trim()}>
              {loading ? 'Creando...' : 'Crear y continuar →'}
            </button>
          </>
        ) : (
          <>
            <label style={s.label}>Código de familia</label>
            <input style={s.input} value={inviteCode} onChange={e=>setCode(e.target.value)}
              placeholder="Pega el ID que te compartió tu pareja" />
            <p style={s.hint}>El código lo encontrarás en Ajustes dentro de la app de quien creó la familia.</p>
            {error && <div style={s.err}>{error}</div>}
            <button style={s.btn} onClick={joinFamily} disabled={loading || !inviteCode.trim()}>
              {loading ? 'Uniéndome...' : 'Unirme →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  bg: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
    background:'#F7F5F0', padding:20 },
  card: { background:'white', borderRadius:24, padding:'40px 36px', width:'100%', maxWidth:420,
    boxShadow:'0 8px 40px rgba(0,0,0,0.08)' },
  emoji: { fontSize:48, textAlign:'center', marginBottom:12 },
  title: { fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:700, textAlign:'center',
    letterSpacing:'-0.5px', marginBottom:6 },
  sub: { textAlign:'center', color:'#888', fontSize:14, marginBottom:24 },
  tabs: { display:'flex', background:'#F7F5F0', borderRadius:12, padding:4, marginBottom:24, gap:4 },
  tab: { flex:1, padding:'8px', border:'none', borderRadius:9, background:'transparent',
    cursor:'pointer', fontSize:13, fontWeight:500, color:'#888' },
  tabA: { background:'white', color:'#1A1A1A', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  label: { display:'block', fontSize:12, fontWeight:600, color:'#888', marginBottom:6,
    textTransform:'uppercase', letterSpacing:'0.5px' },
  input: { width:'100%', padding:'12px 14px', border:'1.5px solid #eee', borderRadius:12,
    fontSize:14, outline:'none', background:'#FAFAF8', marginBottom:10 },
  hint: { fontSize:12, color:'#aaa', marginBottom:16 },
  err: { background:'#FEF2F0', color:'#E07A5F', fontSize:13, padding:'10px 14px',
    borderRadius:10, marginBottom:12 },
  btn: { width:'100%', padding:'13px', background:'#1A1A1A', color:'white', border:'none',
    borderRadius:14, fontSize:14, fontWeight:600, cursor:'pointer' },
}
