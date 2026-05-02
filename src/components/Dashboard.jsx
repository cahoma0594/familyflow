import { useState } from 'react'
import { supabase } from '../lib/supabase'

function fmt(n) { return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n||0) }

export default function Dashboard({ totals, byCategory, transactions, budgets, categories, activeMonth, familyId }) {
  const expenseCats = categories.filter(c => c.type === 'expense')

  const topExp = expenseCats
    .map(c => ({ ...c, amount: byCategory[c.id] || 0 }))
    .filter(c => c.amount > 0)
    .sort((a,b) => b.amount - a.amount)
    .slice(0, 6)

  const maxExp = topExp[0]?.amount || 1
  const saveRate = totals.income > 0 ? Math.round((totals.balance / totals.income) * 100) : 0
  const recent = [...transactions].slice(0, 5)

  return (
    <div style={s.grid}>
      {/* KPIs */}
      <div style={s.kpiRow}>
        <KPI label="Ingresos" value={totals.income} color="#2D6A4F" icon="↑" />
        <KPI label="Gastos"   value={totals.expense} color="#E07A5F" icon="↓" />
        <KPI label="Balance"  value={totals.balance} color={totals.balance>=0?'#2D6A4F':'#E07A5F'} icon="=" big />
      </div>

      {/* Savings rate */}
      <div style={s.card}>
        <div style={s.cardTitle}>Tasa de ahorro mensual</div>
        <div style={{display:'flex',alignItems:'center',gap:20}}>
          <div style={{...s.bigNum,color:saveRate>=0?'#1A1A1A':'#E07A5F'}}>{saveRate}%</div>
          <div style={{flex:1}}>
            <div style={s.barBg}>
              <div style={{...s.barFill,width:`${Math.max(0,Math.min(100,saveRate))}%`,
                background:saveRate>=20?'#2D6A4F':saveRate>=0?'#F4A261':'#E07A5F'}}/>
            </div>
            <div style={s.barNote}>
              {saveRate >= 20 ? '🌱 ¡Excelente ahorro!' : saveRate >= 0 ? '👍 Dentro del presupuesto' : '⚠️ Gastos superiores a ingresos'}
            </div>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div style={s.card}>
        <div style={s.cardTitle}>Gastos por categoría</div>
        {topExp.length === 0 ? (
          <div style={s.empty}>Sin gastos este mes</div>
        ) : topExp.map(c => {
          const bud = budgets.find(b => b.category_id === c.id)
          const pct = bud ? Math.min(100, (c.amount / bud.amount) * 100) : null
          const over = pct !== null && pct >= 100
          return (
            <div key={c.id} style={s.catRow}>
              <div style={{...s.catDot,background:c.color+'22',color:c.color}}>{c.icon}</div>
              <div style={{flex:1}}>
                <div style={s.catMeta}>
                  <span style={s.catName}>{c.name}</span>
                  <span style={{fontWeight:700,color:over?'#E07A5F':c.color}}>{fmt(c.amount)}</span>
                </div>
                <div style={s.barBg}>
                  <div style={{...s.barFill,width:`${(c.amount/maxExp)*100}%`,
                    background:over?'#E07A5F':c.color}}/>
                </div>
                {bud && <div style={s.budNote}>{over?`⚠️ +${fmt(c.amount-bud.amount)} sobre límite`:`${fmt(bud.amount-c.amount)} restante de ${fmt(bud.amount)}`}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent */}
      <div style={s.card}>
        <div style={s.cardTitle}>Últimos movimientos</div>
        {recent.length === 0 ? (
          <div style={s.empty}>Sin movimientos este mes</div>
        ) : recent.map(t => <TxRow key={t.id} tx={t} />)}
      </div>
    </div>
  )
}

function KPI({ label, value, color, icon, big }) {
  return (
    <div style={{...s.kpi,...(big?{background:color,color:'white'}:{})}}>
      <div style={{fontSize:18,color:big?'rgba(255,255,255,0.7)':color,marginBottom:6}}>{icon}</div>
      <div style={{fontSize:11,fontWeight:600,color:big?'rgba(255,255,255,0.75)':'#888',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</div>
      <div style={{fontSize:20,fontWeight:700,letterSpacing:'-0.5px',color:big?'white':color}}>{fmt(value)}</div>
    </div>
  )
}

export function TxRow({ tx, compact }) {
  const cat = tx.categories
  return (
    <div style={s.txRow}>
      <div style={{...s.txIcon,background:(cat?.color||'#aaa')+'22',color:cat?.color||'#aaa'}}>{cat?.icon||'📦'}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={s.txDesc}>{tx.description || cat?.name || '—'}</div>
        <div style={s.txMeta}>{tx.date} · {cat?.name}{tx.has_receipt?' · 📎':''}</div>
      </div>
      <div style={{...s.txAmt,color:tx.type==='income'?'#2D6A4F':'#E07A5F'}}>
        {tx.type==='income'?'+':'−'}{fmt(tx.amount)}
      </div>
    </div>
  )
}

const s = {
  grid: { display:'flex', flexDirection:'column', gap:16 },
  kpiRow: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 },
  kpi: { background:'white', borderRadius:16, padding:'16px 18px',
    boxShadow:'0 2px 12px rgba(0,0,0,0.05)' },
  card: { background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 12px rgba(0,0,0,0.05)' },
  cardTitle: { fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase',
    letterSpacing:'0.8px', marginBottom:16 },
  bigNum: { fontSize:42, fontWeight:700, letterSpacing:'-2px', fontFamily:"'Fraunces',serif" },
  barBg: { height:6, background:'#F0EDE8', borderRadius:4, overflow:'hidden' },
  barFill: { height:'100%', borderRadius:4, transition:'width 0.5s ease' },
  barNote: { fontSize:12, color:'#888', marginTop:6 },
  empty: { color:'#ccc', fontSize:14, textAlign:'center', padding:'20px 0' },
  catRow: { display:'flex', alignItems:'center', gap:12, marginBottom:14 },
  catDot: { width:36, height:36, borderRadius:10, display:'flex', alignItems:'center',
    justifyContent:'center', fontSize:18, flexShrink:0 },
  catMeta: { display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 },
  catName: { fontWeight:500 },
  budNote: { fontSize:11, color:'#aaa', marginTop:3 },
  txRow: { display:'flex', alignItems:'center', gap:10, padding:'10px 0',
    borderBottom:'1px solid #F5F2EE' },
  txIcon: { width:36, height:36, borderRadius:10, display:'flex', alignItems:'center',
    justifyContent:'center', fontSize:16, flexShrink:0 },
  txDesc: { fontSize:13, fontWeight:500, marginBottom:2 },
  txMeta: { fontSize:11, color:'#aaa' },
  txAmt: { fontSize:14, fontWeight:700, flexShrink:0 },
}
