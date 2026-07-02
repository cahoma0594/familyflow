import { useState } from 'react'
import { supabase } from '../lib/supabase'

function fmt(n) { return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n||0) }

export default function BudgetView({ budgets, byCategory, categories, activeMonth, familyId, onRefresh }) {
  const expCats = categories.filter(c => c.type === 'expense')
  const totalBudgeted = budgets.reduce((a,b) => a + +b.amount, 0)
  const totalSpent = expCats.reduce((a,c) => a + (byCategory[c.id]||0), 0)

  return (
    <div style={s.page}>
      <div style={s.intro}>
        <div style={s.introStat}>
          <div style={s.introVal}>{fmt(totalBudgeted)}</div>
          <div style={s.introLabel}>Presupuestado</div>
        </div>
        <div style={s.introDivider}>/</div>
        <div style={s.introStat}>
          <div style={{...s.introVal,color:totalSpent>totalBudgeted&&totalBudgeted>0?'#E07A5F':'#111827'}}>{fmt(totalSpent)}</div>
          <div style={s.introLabel}>Gastado</div>
        </div>
      </div>

      <div style={s.grid}>
        {expCats.map(cat => {
          const bud = budgets.find(b => b.category_id === cat.id)
          const spent = byCategory[cat.id] || 0
          return <BudgetCard key={cat.id} cat={cat} budget={bud} spent={spent}
            familyId={familyId} activeMonth={activeMonth} onRefresh={onRefresh} />
        })}
      </div>
    </div>
  )
}

function BudgetCard({ cat, budget, spent, familyId, activeMonth, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(budget?.amount?.toString() || '')
  const [loading, setLoading] = useState(false)
  const limit = budget?.amount || 0
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0
  const over = limit > 0 && spent > limit

  const save = async () => {
    setLoading(true)
    const amount = parseFloat(val) || 0
    if (budget) {
      await supabase.from('budgets').update({ amount }).eq('id', budget.id)
    } else {
      await supabase.from('budgets').insert({ family_id: familyId, category_id: cat.id, month: activeMonth, amount })
    }
    await onRefresh()
    setEditing(false)
    setLoading(false)
  }

  const remove = async () => {
    if (!budget) return
    await supabase.from('budgets').delete().eq('id', budget.id)
    await onRefresh()
  }

  return (
    <div style={{...s.card, borderTop:`3px solid ${cat.color}`}}>
      <div style={s.catHead}>
        <span style={{fontSize:22}}>{cat.icon}</span>
        <span style={s.catName}>{cat.name}</span>
      </div>

      <div style={{...s.spent,color:over?'#E07A5F':'#111827'}}>{fmt(spent)}</div>
      <div style={s.spentLabel}>gastado</div>

      {limit > 0 && (
        <>
          <div style={s.barBg}>
            <div style={{...s.barFill, width:`${pct}%`,
              background:over?'#E07A5F':pct>75?'#F4A261':cat.color}} />
          </div>
          <div style={{...s.pctLabel,color:over?'#E07A5F':'#888'}}>
            {over ? `⚠️ +${fmt(spent-limit)} sobre límite` : `${fmt(limit-spent)} libre · ${pct.toFixed(0)}%`}
          </div>
        </>
      )}

      {editing ? (
        <div style={s.editRow}>
          <input style={s.editInput} type="number" value={val} autoFocus
            placeholder="Límite €" onChange={e=>setVal(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&save()} />
          <button style={s.saveBtn} onClick={save} disabled={loading}>✓</button>
          <button style={s.cancelBtn} onClick={()=>setEditing(false)}>✕</button>
        </div>
      ) : (
        <div style={s.btnRow}>
          <button style={s.setBtn} onClick={()=>{setVal(limit?limit.toString():'');setEditing(true)}}>
            {limit > 0 ? `Límite: ${fmt(limit)}` : '+ Fijar límite'}
          </button>
          {limit > 0 && <button style={s.removeBtn} onClick={remove} title="Quitar límite">×</button>}
        </div>
      )}
    </div>
  )
}

const s = {
  page: { display:'flex', flexDirection:'column', gap:20 },
  intro: { background:'white', borderRadius:12, padding:'20px 24px',
    display:'flex', alignItems:'center', gap:20, border:'1px solid #E5E7EB', boxShadow:'0 1px 2px rgba(0,0,0,0.04)' },
  introStat: { flex:1, textAlign:'center' },
  introVal: { fontFamily:"'Fraunces',serif", fontSize:28, fontWeight:700, letterSpacing:'-1px' },
  introLabel: { fontSize:11, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.5px', marginTop:4 },
  introDivider: { fontSize:28, color:'#ddd', fontWeight:300 },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:12 },
  card: { background:'white', borderRadius:12, padding:16, border:'1px solid #E5E7EB', boxShadow:'0 1px 2px rgba(0,0,0,0.04)' },
  catHead: { display:'flex', alignItems:'center', gap:8, marginBottom:12 },
  catName: { fontSize:13, fontWeight:600 },
  spent: { fontSize:20, fontWeight:700, letterSpacing:'-0.5px' },
  spentLabel: { fontSize:11, color:'#aaa', marginBottom:10 },
  barBg: { height:5, background:'#E5E7EB', borderRadius:4, overflow:'hidden', marginBottom:6 },
  barFill: { height:'100%', borderRadius:4, transition:'width 0.4s ease' },
  pctLabel: { fontSize:11, marginBottom:10 },
  editRow: { display:'flex', gap:4, marginTop:8 },
  editInput: { flex:1, padding:'7px 10px', border:'1.5px solid #eee', borderRadius:8,
    fontSize:13, outline:'none' },
  saveBtn: { padding:'7px 10px', background:'#1B4332', color:'white', border:'none',
    borderRadius:8, cursor:'pointer', fontWeight:700 },
  cancelBtn: { padding:'7px 10px', background:'#f5f5f5', color:'#666', border:'none',
    borderRadius:8, cursor:'pointer' },
  btnRow: { display:'flex', gap:4, marginTop:8 },
  setBtn: { flex:1, padding:'8px 0', border:'1px dashed #ddd', borderRadius:8, background:'none',
    cursor:'pointer', fontSize:11, color:'#888', fontWeight:500 },
  removeBtn: { width:28, height:28, border:'1px solid #FEE2DD', borderRadius:8, background:'#FEF2F0',
    cursor:'pointer', color:'#E07A5F', fontWeight:700, fontSize:14 },
}
