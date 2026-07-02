import { useState } from 'react'
import { supabase } from '../lib/supabase'

const EMOJI_OPTIONS = ['🏠','🛒','🚗','🏥','📚','🎭','👕','💡','🍽️','🐾','✈️','💄','🎮','🏋️','🎵','📱','🚿','🌿','🎁','💅','🐶','🐱','🍷','☕','🏊','🎯','🛋️','🔧','📦','💰','💼','💻','💳','🏦','📈']

export default function CategoriesManager({ categories, familyId, userId, onClose, onRefresh }) {
  const [type, setType]         = useState('expense')
  const [adding, setAdding]     = useState(false)
  const [editingId, setEditId]  = useState(null)
  const [form, setForm]         = useState({ name:'', icon:'📦', color:'#ADB5BD' })
  const [editForm, setEditForm] = useState({ name:'', icon:'📦', color:'#ADB5BD' })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const cats = categories.filter(c => c.type === type)
  const customs = cats.filter(c => c.is_custom)
  const globals = cats.filter(c => !c.is_custom)

  const saveCategory = async () => {
    if (!form.name.trim()) { setError('Escribe un nombre'); return }
    setLoading(true); setError(null)
    try {
      const { error: e } = await supabase.from('categories').insert({
        name: form.name.trim(),
        icon: form.icon,
        color: form.color,
        type,
        family_id: familyId,
        created_by: userId,
        is_custom: true,
      })
      if (e) throw e
      setForm({ name:'', icon:'📦', color:'#ADB5BD' })
      setAdding(false)
      await onRefresh()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const startEdit = (cat) => {
    setEditId(cat.id)
    setEditForm({ name: cat.name, icon: cat.icon, color: cat.color })
    setAdding(false)
  }

  const saveEdit = async () => {
    if (!editForm.name.trim()) return
    setLoading(true)
    await supabase.from('categories').update({
      name: editForm.name.trim(), icon: editForm.icon, color: editForm.color
    }).eq('id', editingId)
    setEditId(null)
    setLoading(false)
    await onRefresh()
  }

  const deleteCategory = async (id) => {
    if (!confirm('¿Eliminar esta categoría? Las transacciones existentes no se borrarán.')) return
    await supabase.from('categories').delete().eq('id', id)
    await onRefresh()
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={e=>e.stopPropagation()}>
        <div style={s.header}>
          <h3 style={s.title}>Categorías</h3>
          <button style={s.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Type tabs */}
        <div style={s.tabs}>
          {[['expense','Gastos'],['income','Ingresos']].map(([v,l])=>(
            <button key={v} style={{...s.tab,...(type===v?s.tabA:{})}} onClick={()=>setType(v)}>{l}</button>
          ))}
        </div>

        {/* All categories (global + custom) */}
        {[['Predefinidas', globals], ['Personalizadas', customs]].map(([label, list]) =>
          list.length > 0 && (
            <div key={label}>
              <div style={s.sectionLabel}>{label}</div>
              <div style={{display:'flex', flexDirection:'column', gap:6, marginBottom:16}}>
                {list.map(c => editingId === c.id ? (
                  <div key={c.id} style={s.editForm}>
                    <div style={s.formRow}>
                      <input style={s.nameInput} value={editForm.name}
                        onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}
                        onKeyDown={e=>e.key==='Enter'&&saveEdit()} autoFocus />
                      <input type="color" style={s.colorPicker} value={editForm.color}
                        onChange={e=>setEditForm(f=>({...f,color:e.target.value}))} />
                    </div>
                    <div style={s.emojiGrid}>
                      {EMOJI_OPTIONS.map(em=>(
                        <button key={em} style={{...s.emojiBtn,...(editForm.icon===em?{background:editForm.color+'33',outline:`2px solid ${editForm.color}`}:{})}}
                          onClick={()=>setEditForm(f=>({...f,icon:em}))}>{em}</button>
                      ))}
                    </div>
                    <div style={s.formActions}>
                      <button style={s.cancelBtn} onClick={()=>setEditId(null)}>Cancelar</button>
                      <button style={s.saveBtn} onClick={saveEdit} disabled={loading}>
                        {loading?'Guardando...':'Guardar cambios'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={c.id} style={s.catRow}>
                    <span style={{...s.dot, background:c.color}}>{c.icon}</span>
                    <span style={{...s.catName, flex:1}}>{c.name}</span>
                    <button style={s.editBtn} onClick={()=>startEdit(c)} title="Editar">✏️</button>
                    {c.is_custom && (
                      <button style={s.delBtn} onClick={()=>deleteCategory(c.id)} title="Eliminar">×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Add new */}
        {adding ? (
          <div style={s.addForm}>
            <div style={s.formRow}>
              <input style={s.nameInput} placeholder="Nombre de categoría" value={form.name}
                onChange={e=>setForm(f=>({...f,name:e.target.value}))} autoFocus
                onKeyDown={e=>e.key==='Enter'&&saveCategory()} />
              <input type="color" style={s.colorPicker} value={form.color}
                onChange={e=>setForm(f=>({...f,color:e.target.value}))} title="Color" />
            </div>
            <div style={s.emojiGrid}>
              {EMOJI_OPTIONS.map(em=>(
                <button key={em} style={{...s.emojiBtn,...(form.icon===em?{background:form.color+'33',outline:`2px solid ${form.color}`}:{})}}
                  onClick={()=>setForm(f=>({...f,icon:em}))}>{em}</button>
              ))}
            </div>
            {error && <div style={s.err}>{error}</div>}
            <div style={s.formActions}>
              <button style={s.cancelBtn} onClick={()=>{setAdding(false);setError(null)}}>Cancelar</button>
              <button style={s.saveBtn} onClick={saveCategory} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar categoría'}
              </button>
            </div>
          </div>
        ) : (
          <button style={s.addBtn} onClick={()=>setAdding(true)}>
            + Nueva categoría personalizada
          </button>
        )}
      </div>
    </div>
  )
}

const s = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)',
    zIndex:600, display:'flex', alignItems:'flex-end', justifyContent:'center' },
  panel: { background:'white', borderRadius:'24px 24px 0 0', padding:24, width:'100%',
    maxWidth:520, maxHeight:'85vh', overflowY:'auto' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
  title: { fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:700 },
  closeBtn: { width:32, height:32, border:'1px solid #eee', borderRadius:8, background:'none',
    cursor:'pointer', fontSize:20, color:'#666' },
  tabs: { display:'flex', background:'#F3F4F6', borderRadius:12, padding:4, marginBottom:20, gap:4 },
  tab: { flex:1, padding:'8px', border:'none', borderRadius:9, background:'transparent',
    cursor:'pointer', fontSize:13, fontWeight:500, color:'#888' },
  tabA: { background:'white', color:'#111827', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  sectionLabel: { fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase',
    letterSpacing:'1px', marginBottom:10, marginTop:4 },
  catRow: { display:'flex', alignItems:'center', gap:8, padding:'8px 10px',
    background:'#F3F4F6', borderRadius:12, fontSize:13, fontWeight:500 },
  editForm: { border:'1px solid #eee', borderRadius:16, padding:16, marginBottom:4 },
  editBtn: { background:'none', border:'none', cursor:'pointer', fontSize:14, padding:'2px 4px',
    color:'#888', flexShrink:0 },
  catList: { display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 },
  catChip: { display:'flex', alignItems:'center', gap:6, padding:'6px 12px 6px 6px',
    background:'#F3F4F6', borderRadius:20, fontSize:13, fontWeight:500 },
  dot: { width:28, height:28, borderRadius:8, display:'flex', alignItems:'center',
    justifyContent:'center', fontSize:15 },
  catName: { color:'#333' },
  delBtn: { marginLeft:4, background:'none', border:'none', cursor:'pointer', color:'#E07A5F',
    fontSize:16, fontWeight:700, lineHeight:1, padding:'0 2px' },
  addBtn: { width:'100%', padding:12, border:'1.5px dashed #ddd', borderRadius:14,
    background:'none', cursor:'pointer', fontSize:13, color:'#888', fontWeight:500, marginTop:4 },
  addForm: { border:'1px solid #eee', borderRadius:16, padding:16, marginTop:8 },
  formRow: { display:'flex', gap:10, marginBottom:12 },
  nameInput: { flex:1, padding:'10px 12px', border:'1.5px solid #eee', borderRadius:10,
    fontSize:14, outline:'none' },
  colorPicker: { width:44, height:44, border:'none', borderRadius:10, cursor:'pointer',
    padding:2, background:'none' },
  emojiGrid: { display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 },
  emojiBtn: { width:36, height:36, border:'1px solid #eee', borderRadius:8, background:'white',
    cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' },
  err: { background:'#FEF2F0', color:'#E07A5F', fontSize:12, padding:'8px 12px',
    borderRadius:8, marginBottom:10 },
  formActions: { display:'flex', gap:8 },
  cancelBtn: { flex:1, padding:10, border:'1px solid #eee', borderRadius:10, background:'white',
    cursor:'pointer', fontSize:13, color:'#666' },
  saveBtn: { flex:2, padding:10, background:'#111827', color:'white', border:'none',
    borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600 },
}
