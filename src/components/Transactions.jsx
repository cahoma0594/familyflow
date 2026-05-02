import { useState } from 'react'

function fmt(n) { return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n||0) }

export default function Transactions({ transactions, categories, onEdit, onDelete, members }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  const filtered = transactions
    .filter(t => filter === 'all' || t.type === filter)
    .filter(t => catFilter === 'all' || t.category_id === catFilter)
    .filter(t => !search || t.description?.toLowerCase().includes(search.toLowerCase()))

  const usedCatIds = [...new Set(transactions.map(t => t.category_id))]
  const usedCats = categories.filter(c => usedCatIds.includes(c.id))

  return (
    <div style={s.page}>
      {/* Filters */}
      <div style={s.filters}>
        <input style={s.search} placeholder="🔍  Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
        <div style={s.filterRow}>
          {[['all','Todos'],['income','Ingresos'],['expense','Gastos']].map(([v,l])=>(
            <button key={v} style={{...s.fBtn,...(filter===v?s.fBtnA:{})}} onClick={()=>setFilter(v)}>{l}</button>
          ))}
        </div>
        {usedCats.length > 0 && (
          <div style={s.filterRow}>
            <button style={{...s.catBtn,...(catFilter==='all'?s.catBtnA:{})}} onClick={()=>setCatFilter('all')}>Todas</button>
            {usedCats.map(c=>(
              <button key={c.id} style={{...s.catBtn,...(catFilter===c.id?{...s.catBtnA,background:c.color,borderColor:c.color}:{})}}
                onClick={()=>setCatFilter(catFilter===c.id?'all':c.id)}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={s.summary}>
        <span style={{color:'#2D6A4F',fontWeight:600}}>↑ {fmt(filtered.filter(t=>t.type==='income').reduce((a,t)=>a+ +t.amount,0))}</span>
        <span style={{color:'#aaa',fontSize:12}}>  ·  </span>
        <span style={{color:'#E07A5F',fontWeight:600}}>↓ {fmt(filtered.filter(t=>t.type==='expense').reduce((a,t)=>a+ +t.amount,0))}</span>
        <span style={{color:'#aaa',fontSize:12, marginLeft:'auto'}}>{filtered.length} movimientos</span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={s.empty}><div style={{fontSize:40}}>🌿</div><div>Sin resultados</div></div>
      ) : (
        <div style={s.list}>
          {filtered.map(t => <TxCard key={t.id} tx={t} members={members} onEdit={onEdit} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  )
}

function TxCard({ tx, members, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const cat = tx.categories
  const member = members?.find(m => m.user_id === tx.user_id)

  return (
    <div style={s.card}>
      <div style={s.cardMain} onClick={()=>setOpen(o=>!o)}>
        <div style={{...s.icon,background:(cat?.color||'#aaa')+'22',color:cat?.color||'#aaa'}}>{cat?.icon||'📦'}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={s.desc}>{tx.description || cat?.name || '—'}</div>
          <div style={s.meta}>
            {tx.date} · {cat?.name}
            {member && ` · 👤 ${member.profiles?.display_name}`}
            {tx.has_receipt && ' · 📎'}
          </div>
        </div>
        <div style={{...s.amount,color:tx.type==='income'?'#2D6A4F':'#E07A5F'}}>
          {tx.type==='income'?'+':'−'}{fmt(tx.amount)}
        </div>
      </div>
      {open && (
        <div style={s.expand}>
          {tx.notes && <div style={s.notes}>{tx.notes}</div>}
          <div style={s.actions}>
            <button style={s.editBtn} onClick={()=>onEdit(tx)}>✏️ Editar</button>
            <button style={s.delBtn}  onClick={()=>onDelete(tx.id)}>🗑 Eliminar</button>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { display:'flex', flexDirection:'column', gap:12 },
  filters: { display:'flex', flexDirection:'column', gap:8 },
  search: { padding:'10px 16px', border:'1.5px solid #eee', borderRadius:12, fontSize:14,
    background:'white', outline:'none' },
  filterRow: { display:'flex', gap:6, flexWrap:'wrap' },
  fBtn: { padding:'6px 14px', borderRadius:20, border:'1px solid #eee', background:'white',
    cursor:'pointer', fontSize:12, fontWeight:500, color:'#666' },
  fBtnA: { background:'#1A1A1A', color:'white', borderColor:'#1A1A1A' },
  catBtn: { padding:'5px 10px', borderRadius:20, border:'1px solid #eee', background:'white',
    cursor:'pointer', fontSize:11, color:'#666' },
  catBtnA: { color:'white' },
  summary: { display:'flex', alignItems:'center', gap:4, fontSize:13, padding:'2px 0' },
  list: { display:'flex', flexDirection:'column', gap:6 },
  empty: { textAlign:'center', color:'#ccc', padding:'50px 0', fontSize:14 },
  card: { background:'white', borderRadius:14, overflow:'hidden',
    boxShadow:'0 1px 6px rgba(0,0,0,0.05)' },
  cardMain: { display:'flex', alignItems:'center', gap:12, padding:'13px 16px', cursor:'pointer' },
  icon: { width:38, height:38, borderRadius:10, display:'flex', alignItems:'center',
    justifyContent:'center', fontSize:18, flexShrink:0 },
  desc: { fontSize:13, fontWeight:500, marginBottom:2 },
  meta: { fontSize:11, color:'#aaa' },
  amount: { fontSize:14, fontWeight:700, flexShrink:0 },
  expand: { borderTop:'1px solid #F5F2EE', padding:'12px 16px', background:'#FAFAF8' },
  notes: { fontSize:12, color:'#666', marginBottom:10 },
  actions: { display:'flex', gap:8 },
  editBtn: { padding:'6px 14px', border:'1px solid #eee', borderRadius:8, background:'white',
    cursor:'pointer', fontSize:12 },
  delBtn: { padding:'6px 14px', border:'1px solid #FEE2DD', borderRadius:8, background:'#FEF2F0',
    cursor:'pointer', fontSize:12, color:'#E07A5F' },
}
