import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts'

function fmt(n) { return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n||0) }
function fmtShort(n) {
  if (n >= 1000) return (n/1000).toFixed(1).replace('.0','') + 'k'
  return Math.round(n)
}

const CHART_COLORS = [
  '#2D6A4F','#52B788','#E07A5F','#F2CC8F','#81B29A',
  '#F4A261','#457B9D','#A8DADC','#E9C46A','#264653',
  '#B5838D','#6D6875'
]

// ── Tooltip personalizado para barras ──────────────────────────────────────
function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={s.tooltip}>
      <span style={{fontSize:18}}>{d.icon}</span>
      <div>
        <div style={{fontWeight:500,fontSize:13}}>{d.name}</div>
        <div style={{color:'#E07A5F',fontSize:13}}>{fmt(d.amount)}</div>
      </div>
    </div>
  )
}

// ── Tooltip personalizado para dona ───────────────────────────────────────
function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={s.tooltip}>
      <span style={{fontSize:18}}>{d.icon}</span>
      <div>
        <div style={{fontWeight:500,fontSize:13}}>{d.name}</div>
        <div style={{fontSize:13,color:'#555'}}>{fmt(d.amount)} · {d.pct}%</div>
      </div>
    </div>
  )
}

// ── Label central de la dona ──────────────────────────────────────────────
function PieCenterLabel({ viewBox, total }) {
  const { cx, cy } = viewBox
  return (
    <>
      <text x={cx} y={cy - 8} textAnchor="middle" style={{fontSize:11,fill:'#888'}}>Total gastos</text>
      <text x={cx} y={cy + 12} textAnchor="middle" style={{fontSize:14,fontWeight:600,fill:'#1A1A1A'}}>{fmt(total)}</text>
    </>
  )
}

export default function Dashboard({ totals, byCategory, transactions, budgets, categories, activeMonth, familyId, savingsGoal, onRefresh }) {
  const [chartTab, setChartTab]     = useState('bar')
  const [editingGoal, setEditGoal]  = useState(false)
  const [goalInput, setGoalInput]   = useState('')
  const [savingGoal, setSavingGoal] = useState(false)

  const saveGoal = async () => {
    const amount = parseFloat(goalInput)
    if (!amount || amount <= 0) return
    setSavingGoal(true)
    if (savingsGoal?.id) {
      await supabase.from('savings_goals').update({ target_amount: amount }).eq('id', savingsGoal.id)
    } else {
      await supabase.from('savings_goals').insert({ family_id: familyId, month: activeMonth, target_amount: amount })
    }
    setSavingGoal(false)
    setEditGoal(false)
    onRefresh()
  }

  const expenseCats = categories.filter(c => c.type === 'expense')

  const chartData = expenseCats
    .map((c, i) => ({
      id:     c.id,
      name:   c.name,
      icon:   c.icon || '📦',
      amount: byCategory[c.id] || 0,
      color:  c.color || CHART_COLORS[i % CHART_COLORS.length],
    }))
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)

  const totalExpense = chartData.reduce((s, c) => s + c.amount, 0) || 1
  const pieData = chartData.map(c => ({
    ...c,
    pct: Math.round((c.amount / totalExpense) * 100)
  }))

  const saveRate = totals.income > 0 ? Math.round((totals.balance / totals.income) * 100) : 0
  const recent   = [...transactions].slice(0, 5)

  return (
    <div style={s.grid}>

      {/* ── KPIs ── */}
      <div style={s.kpiRow}>
        <KPI label="Ingresos" value={totals.income}  color="#2D6A4F" icon="↑" />
        <KPI label="Gastos"   value={totals.expense} color="#E07A5F" icon="↓" />
        <KPI label="Balance"  value={totals.balance}
          color={totals.balance >= 0 ? '#2D6A4F' : '#E07A5F'}
          big icon={totals.balance >= 0 ? '✓' : '!'} />
      </div>

      {/* ── Savings goal ── */}
      <div style={s.card}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={s.cardLabel}>Ahorro del mes</div>
          <button style={s.goalEditBtn} onClick={()=>{ setGoalInput(savingsGoal?.target_amount||''); setEditGoal(true) }}>
            {savingsGoal ? '✏️ Editar meta' : '＋ Definir meta'}
          </button>
        </div>

        {editingGoal ? (
          <div style={{display:'flex',gap:8,marginTop:12,alignItems:'center'}}>
            <input style={s.goalInput} type="number" inputMode="decimal" placeholder="Ej: 400"
              value={goalInput} onChange={e=>setGoalInput(e.target.value)}
              autoFocus onKeyDown={e=>e.key==='Enter'&&saveGoal()} />
            <span style={{fontSize:13,color:'#888'}}>€</span>
            <button style={s.goalSaveBtn} onClick={saveGoal} disabled={savingGoal}>
              {savingGoal ? '...' : 'Guardar'}
            </button>
            <button style={s.goalCancelBtn} onClick={()=>setEditGoal(false)}>✕</button>
          </div>
        ) : (
          <div style={{marginTop:10}}>
            {savingsGoal ? (
              <>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:13,color:'#555'}}>
                    {fmt(Math.max(0, totals.balance))} ahorrado
                  </span>
                  <span style={{fontSize:13,fontWeight:600,color:'#2D6A4F'}}>
                    meta {fmt(savingsGoal.target_amount)}
                  </span>
                </div>
                <div style={{height:10,background:'#eee',borderRadius:99,overflow:'hidden'}}>
                  <div style={{
                    height:10, borderRadius:99, transition:'width 0.4s ease',
                    width: Math.min(100, Math.max(0, (totals.balance / savingsGoal.target_amount) * 100)) + '%',
                    background: totals.balance >= savingsGoal.target_amount ? '#2D6A4F'
                      : totals.balance >= savingsGoal.target_amount * 0.5 ? '#F2CC8F' : '#E07A5F'
                  }}/>
                </div>
                <div style={{fontSize:12,color:'#aaa',marginTop:6,textAlign:'right'}}>
                  {totals.balance >= savingsGoal.target_amount
                    ? '🎉 ¡Meta alcanzada!'
                    : `Faltan ${fmt(savingsGoal.target_amount - Math.max(0, totals.balance))}`}
                </div>
              </>
            ) : (
              <div style={{fontSize:13,color:'#aaa',marginTop:4}}>
                Balance actual: <strong style={{color: totals.balance>=0?'#2D6A4F':'#E07A5F'}}>{fmt(totals.balance)}</strong>
                <span style={{display:'block',marginTop:4,fontSize:12}}>Define una meta para ver tu progreso</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Gráficos ── */}
      {chartData.length > 0 && (
        <div style={s.card}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={s.cardLabel}>Gastos por categoría</div>
            <div style={s.tabs}>
              <button
                style={{...s.tab, ...(chartTab==='bar' ? s.tabActive : {})}}
                onClick={() => setChartTab('bar')}
              >Barras</button>
              <button
                style={{...s.tab, ...(chartTab==='pie' ? s.tabActive : {})}}
                onClick={() => setChartTab('pie')}
              >Dona</button>
            </div>
          </div>

          {chartTab === 'bar' && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{top:4,right:4,left:0,bottom:4}}>
                <XAxis
                  dataKey="icon"
                  tick={{fontSize:18}}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtShort}
                  tick={{fontSize:11,fill:'#aaa'}}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip content={<BarTooltip />} cursor={{fill:'rgba(0,0,0,0.04)'}} />
                <Bar dataKey="amount" radius={[6,6,0,0]}>
                  {chartData.map((c, i) => (
                    <Cell key={c.id} fill={c.color || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartTab === 'pie' && (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="amount"
                >
                  {pieData.map((c, i) => (
                    <Cell key={c.id} fill={c.color || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                  <PieCenterLabel total={totals.expense} />
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  formatter={(value, entry) => (
                    <span style={{fontSize:12,color:'#555'}}>
                      {entry.payload.icon} {entry.payload.name} · {entry.payload.pct}%
                    </span>
                  )}
                  iconSize={10}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── Transacciones recientes ── */}
      {recent.length > 0 && (
        <div style={s.card}>
          <div style={s.cardLabel}>Últimos movimientos</div>
          <div style={{marginTop:8}}>
            {recent.map(tx => <TxRow key={tx.id} tx={tx} />)}
          </div>
        </div>
      )}

      {recent.length === 0 && (
        <div style={{...s.card,textAlign:'center',color:'#aaa',padding:'2rem'}}>
          <div style={{fontSize:36,marginBottom:8}}>🌿</div>
          <div style={{fontSize:14}}>Aún no hay movimientos este mes</div>
        </div>
      )}

    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function KPI({ label, value, color, icon, big }) {
  return (
    <div style={{...s.kpi, ...(big ? {background:color} : {})}}>
      <div style={{fontSize:12,color:big?'rgba(255,255,255,0.8)':'#888',
        fontWeight:500,textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</div>
      <div style={{fontSize:20,fontWeight:700,letterSpacing:'-0.5px',
        color:big?'white':color}}>{fmt(value)}</div>
    </div>
  )
}

export function TxRow({ tx, compact }) {
  const cat = tx.categories
  return (
    <div style={s.txRow}>
      <div style={{...s.txIcon,background:(cat?.color||'#aaa')+'22',color:cat?.color||'#aaa'}}>
        {cat?.icon||'📦'}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={s.txDesc}>{tx.description || cat?.name || '—'}</div>
        <div style={s.txMeta}>{tx.date} · {cat?.name}{tx.has_receipt?' · 🧾':''}</div>
      </div>
      <div style={{...s.txAmt,color:tx.type==='income'?'#2D6A4F':'#E07A5F'}}>
        {tx.type==='income'?'+':'−'}{fmt(tx.amount)}
      </div>
    </div>
  )
}

const s = {
  grid:      { display:'flex', flexDirection:'column', gap:16 },
  card:      { background:'white', borderRadius:16, padding:'1rem 1.25rem', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  cardLabel: { fontSize:11, fontWeight:600, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.6px' },
  kpiRow:    { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 },
  kpi:       { background:'white', borderRadius:16, padding:'0.9rem 1rem',
               boxShadow:'0 1px 3px rgba(0,0,0,0.06)' },
  tabs:      { display:'flex', gap:4, background:'#f5f5f5', borderRadius:8, padding:3 },
  tab:       { border:'none', background:'transparent', borderRadius:6, padding:'4px 12px',
               fontSize:12, fontWeight:500, color:'#888', cursor:'pointer' },
  tabActive: { background:'white', color:'#1A1A1A', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' },
  tooltip:   { background:'white', border:'1px solid #eee', borderRadius:10, padding:'8px 12px',
               display:'flex', gap:8, alignItems:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  txRow:     { display:'flex', alignItems:'center', gap:12, padding:'10px 0',
               borderBottom:'1px solid #f5f5f5' },
  txIcon:    { width:36, height:36, borderRadius:10, display:'flex',
               alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 },
  goalEditBtn:   { fontSize:11, fontWeight:600, color:'#2D6A4F', background:'none', border:'none',
                   cursor:'pointer', padding:'2px 0' },
  goalInput:     { flex:1, padding:'8px 12px', border:'1.5px solid #eee', borderRadius:10,
                   fontSize:15, outline:'none', background:'#FAFAF8' },
  goalSaveBtn:   { padding:'8px 16px', background:'#1A1A1A', color:'white', border:'none',
                   borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600 },
  goalCancelBtn: { padding:'8px 10px', background:'none', border:'1px solid #eee',
                   borderRadius:10, cursor:'pointer', fontSize:13, color:'#888' },
  txDesc:    { fontSize:14, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  txMeta:    { fontSize:12, color:'#aaa', marginTop:2 },
  txAmt:     { fontSize:14, fontWeight:600, flexShrink:0 },
}
