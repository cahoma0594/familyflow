import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import SetupPage from './pages/SetupPage'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import BudgetView from './components/BudgetView'
import TransactionForm from './components/TransactionForm'
import CategoriesManager from './components/CategoriesManager'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }

export default function App() {
  const [session,    setSession]    = useState(null)
  const [profile,    setProfile]    = useState(null)
  const [familyId,   setFamilyId]   = useState(null)
  const [members,    setMembers]    = useState([])
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [budgets,    setBudgets]    = useState([])
  const [savingsGoal, setSavingsGoal] = useState(null)
  const [loading,    setLoading]    = useState(true)

  const [view,       setView]       = useState('dashboard')
  const [activeMonth, setActiveMonth] = useState(monthKey(new Date()))
  const [showForm,   setShowForm]   = useState(false)
  const [editTx,     setEditTx]     = useState(null)
  const [showCats,   setShowCats]   = useState(false)
  const [notification, setNotify]   = useState(null)

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) loadProfile()
    else { setLoading(false); setProfile(null); setFamilyId(null) }
  }, [session])

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(data)
    // load family
    const { data: memberships } = await supabase
      .from('family_members').select('family_id').eq('user_id', session.user.id).limit(1)
    if (memberships?.length) {
      setFamilyId(memberships[0].family_id)
    }
    setLoading(false)
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!familyId) return
    setLoading(true)
    try {
      const [{ data: cats }, { data: mems }, { data: txs }, { data: bdgs }, { data: goal }] = await Promise.all([
        supabase.from('categories').select('*')
          .or(`family_id.is.null,family_id.eq.${familyId}`)
          .order('sort_order'),
        supabase.from('family_members').select('*, profiles(display_name, avatar_color)')
          .eq('family_id', familyId),
        supabase.from('transactions').select('*, categories(name,icon,color,type)')
          .eq('family_id', familyId)
          .gte('date', activeMonth + '-01')
          .lte('date', activeMonth + '-31')
          .order('date', { ascending: false }),
        supabase.from('budgets').select('*')
          .eq('family_id', familyId)
          .eq('month', activeMonth),
        supabase.from('savings_goals').select('*')
          .eq('family_id', familyId)
          .eq('month', activeMonth)
          .maybeSingle(),
      ])
      setCategories(cats || [])
      setMembers(mems || [])
      setTransactions(txs || [])
      setBudgets(bdgs || [])
      setSavingsGoal(goal || null)
    } catch (err) {
      console.error('Error cargando datos:', err)
      notify('Error de conexión. Comprueba tu red e inténtalo de nuevo.', 'error')
    } finally {
      setLoading(false)
    }
  }, [familyId, activeMonth])
  useEffect(() => { loadData() }, [loadData])

  // ── Recurring transactions: auto-apply on new month ──────────────────────
  useEffect(() => {
    if (!familyId || loading) return
    const current = monthKey(new Date())
    if (activeMonth !== current) return

    const cacheKey = `ff_rec_${familyId}_${current}`
    if (localStorage.getItem(cacheKey)) return

    ;(async () => {
      const { data: recurring } = await supabase
        .from('transactions').select('*')
        .eq('family_id', familyId).eq('is_recurring', true)
        .lt('date', current + '-01')
        .order('date', { ascending: false })

      if (!recurring?.length) { localStorage.setItem(cacheKey, '1'); return }

      // De-duplicate: most recent per (category_id + description + amount)
      const seen = new Set()
      const templates = []
      for (const tx of recurring) {
        const k = `${tx.category_id}_${tx.description}_${tx.amount}`
        if (!seen.has(k)) { seen.add(k); templates.push(tx) }
      }

      // Skip already-existing recurring in current month
      const { data: existing } = await supabase
        .from('transactions').select('category_id,description,amount')
        .eq('family_id', familyId).eq('is_recurring', true)
        .gte('date', current + '-01').lte('date', current + '-31')

      const existingKeys = new Set((existing || []).map(t => `${t.category_id}_${t.description}_${t.amount}`))

      const now = new Date()
      const toInsert = templates
        .filter(t => !existingKeys.has(`${t.category_id}_${t.description}_${t.amount}`))
        .map(t => {
          const originalDay = parseInt(t.date.split('-')[2])
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
          const day = String(Math.min(originalDay, daysInMonth)).padStart(2, '0')
          return {
            family_id: familyId, user_id: t.user_id, type: t.type,
            amount: t.amount, category_id: t.category_id,
            description: t.description, date: `${current}-${day}`,
            is_recurring: true, notes: t.notes, has_receipt: false,
          }
        })

      if (toInsert.length > 0) {
        await supabase.from('transactions').insert(toInsert)
        const n = toInsert.length
        notify(`🔁 ${n} gasto${n>1?'s':''} recurrente${n>1?'s':''} añadido${n>1?'s':''}`)
      }
      localStorage.setItem(cacheKey, '1')
    })()
  }, [familyId, loading, activeMonth])

  // ── Real-time subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!familyId) return
    const channel = supabase.channel('family-' + familyId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `family_id=eq.${familyId}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter: `family_id=eq.${familyId}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `family_id=eq.${familyId}` }, loadData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [familyId, loadData])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const notify = (msg, type = 'success') => {
    setNotify({ msg, type })
    setTimeout(() => setNotify(null), 3000)
  }

  const signOut = () => supabase.auth.signOut()

  const deleteTx = async (id) => {
    if (!confirm('¿Eliminar esta transacción?')) return
    await supabase.from('transactions').delete().eq('id', id)
    await loadData()
    notify('Transacción eliminada', 'error')
  }

  // ── Month nav ─────────────────────────────────────────────────────────────
  const [yr, mo] = activeMonth.split('-').map(Number)
  const prevMonth = () => { const d = new Date(yr, mo-2); setActiveMonth(monthKey(d)) }
  const nextMonth = () => { const d = new Date(yr, mo);   setActiveMonth(monthKey(d)) }

  // ── Totals ────────────────────────────────────────────────────────────────
  const totals = transactions.reduce((acc, t) => {
    t.type === 'income' ? acc.income += +t.amount : acc.expense += +t.amount
    return acc
  }, { income: 0, expense: 0, balance: 0 })
  totals.balance = totals.income - totals.expense

  const byCategory = transactions.reduce((acc, t) => {
    acc[t.category_id] = (acc[t.category_id] || 0) + +t.amount
    return acc
  }, {})

  // ── Render states ─────────────────────────────────────────────────────────
  if (loading) return <Loader />
  if (!session) return <AuthPage />
  if (!familyId) return <SetupPage user={session.user} onDone={id => { setFamilyId(id); loadData() }} />

  return (
    <div style={s.app}>
      <div style={s.blob1}/><div style={s.blob2}/>

      {notification && (
        <div style={{...s.toast, background: notification.type==='error'?'#E07A5F':'#2D6A4F'}}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <header style={s.header}>
        <div style={s.headerTop}>
          <div style={s.logo}>
            <span style={{fontSize:22}}>💰</span>
            <div>
              <div style={s.logoTitle}>Finanzas Familiares</div>
              <div style={s.logoSub}>{profile?.display_name}</div>
            </div>
          </div>
          <div style={s.headerRight}>
            <button style={s.iconBtn} onClick={() => setShowCats(true)} title="Categorías">🏷️</button>
            <button style={s.iconBtn} title="Compartir código de familia"
              onClick={() => { navigator.clipboard.writeText(familyId); notify('✓ Código copiado — compártelo con tu pareja') }}>
              🔗
            </button>
            <button style={s.iconBtn} onClick={signOut} title="Cerrar sesión">↪</button>
          </div>
        </div>
        <div style={s.monthNav}>
          <button style={s.navBtn} onClick={prevMonth}>‹</button>
          <span style={s.monthLabel}>{MONTHS[mo-1]} {yr}</span>
          <button style={s.navBtn} onClick={nextMonth}>›</button>
        </div>
      </header>

      {/* Nav */}
      <nav style={s.nav}>
        {[['dashboard','◉','Panel'],['transactions','⇄','Movimientos'],['budget','◎','Presupuesto']].map(([id,ic,lb])=>(
          <button key={id} style={{...s.navItem,...(view===id?s.navActive:{})}} onClick={()=>setView(id)}>
            <span>{ic}</span><span>{lb}</span>
          </button>
        ))}
        <button style={s.addBtn} onClick={()=>{ setEditTx(null); setShowForm(true) }}>+ Añadir</button>
      </nav>

      {/* Main */}
      <main style={s.main}>
        {view === 'dashboard' && (
          <Dashboard totals={totals} byCategory={byCategory} transactions={transactions}
            budgets={budgets} categories={categories} activeMonth={activeMonth}
            familyId={familyId} savingsGoal={savingsGoal} onRefresh={loadData} members={members} />
        )}
        {view === 'transactions' && (
          <Transactions transactions={transactions} categories={categories}
            onEdit={tx=>{ setEditTx(tx); setShowForm(true) }} onDelete={deleteTx} members={members} />
        )}
        {view === 'budget' && (
          <BudgetView budgets={budgets} byCategory={byCategory} categories={categories}
            activeMonth={activeMonth} familyId={familyId} onRefresh={loadData} />
        )}
      </main>

      {showForm && (
        <TransactionForm initial={editTx} categories={categories} familyId={familyId}
          userId={session.user.id} familyMembers={members}
          onSave={async()=>{ await loadData(); setShowForm(false); setEditTx(null); notify('✓ Guardado') }}
          onClose={()=>{ setShowForm(false); setEditTx(null) }} notify={notify} />
      )}

      {showCats && (
        <CategoriesManager categories={categories} familyId={familyId} userId={session.user.id}
          onClose={()=>setShowCats(false)} onRefresh={loadData} />
      )}
    </div>
  )
}

function Loader() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F7F5F0'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>🌿</div>
        <div style={{width:32,height:32,border:'3px solid #ddd',borderTopColor:'#2D6A4F',
          borderRadius:'50%',animation:'spin 0.7s linear infinite',margin:'0 auto'}}/>
      </div>
    </div>
  )
}

const s = {
  app: { minHeight:'100vh', background:'#F7F5F0', fontFamily:"'DM Sans',sans-serif",
    color:'#1A1A1A', position:'relative' },
  blob1: { position:'fixed', top:-120, right:-120, width:400, height:400, borderRadius:'50%',
    background:'radial-gradient(circle, rgba(45,106,79,0.07) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 },
  blob2: { position:'fixed', bottom:-80, left:-80, width:350, height:350, borderRadius:'50%',
    background:'radial-gradient(circle, rgba(181,131,141,0.06) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 },
  toast: { position:'fixed', top:20, right:20, zIndex:1000, padding:'12px 20px',
    borderRadius:12, color:'white', fontSize:14, fontWeight:500, boxShadow:'0 8px 24px rgba(0,0,0,0.15)' },
  header: { position:'sticky', top:0, zIndex:100, background:'rgba(247,245,240,0.93)',
    backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(0,0,0,0.06)' },
  headerTop: { display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'10px 16px 6px' },
  logo: { display:'flex', alignItems:'center', gap:8 },
  logoTitle: { fontFamily:"'Fraunces',serif", fontSize:14, fontWeight:700, letterSpacing:'-0.3px' },
  logoSub: { fontSize:10, color:'#888' },
  monthNav: { display:'flex', alignItems:'center', justifyContent:'center', gap:12,
    padding:'4px 16px 10px' },
  navBtn: { width:30, height:30, border:'1px solid #ddd', borderRadius:8, background:'white',
    cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' },
  monthLabel: { fontSize:14, fontWeight:600, minWidth:120, textAlign:'center' },
  headerRight: { display:'flex', gap:6 },
  iconBtn: { width:34, height:34, border:'1px solid #eee', borderRadius:10, background:'white',
    cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' },
  userBar: { display:'flex', gap:6, padding:'10px 20px', background:'white',
    borderBottom:'1px solid #eee', overflowX:'auto' },
  userChip: { padding:'5px 14px', borderRadius:20, border:'1px solid #ddd', background:'white',
    cursor:'pointer', fontSize:12, fontWeight:500, color:'#666', whiteSpace:'nowrap' },
  userChipA: { background:'#1A1A1A', color:'white', borderColor:'#1A1A1A' },
  nav: { display:'flex', alignItems:'center', padding:'0 8px', background:'white',
    borderBottom:'1px solid #eee' },
  navItem: { display:'flex', alignItems:'center', gap:4, padding:'12px 10px', border:'none',
    background:'none', cursor:'pointer', fontSize:12, color:'#888', fontWeight:500,
    borderBottom:'2px solid transparent' },
  navActive: { color:'#1A1A1A', borderBottomColor:'#2D6A4F' },
  addBtn: { marginLeft:'auto', padding:'7px 18px', background:'#1A1A1A', color:'white',
    border:'none', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:600 },
  main: { padding:'16px 14px', maxWidth:960, margin:'0 auto', position:'relative', zIndex:1 },
}
