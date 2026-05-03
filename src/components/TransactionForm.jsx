import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function today() { return new Date().toISOString().split('T')[0] }

export default function TransactionForm({ initial, categories, familyId, userId, familyMembers, onSave, onClose, notify }) {
  const [form, setForm] = useState({
    type: initial?.type || 'expense',
    amount: initial?.amount || '',
    category_id: initial?.category_id || '',
    description: initial?.description || '',
    date: initial?.date || today(),
    user_id: initial?.user_id || userId,
    has_receipt: initial?.has_receipt || false,
    notes: initial?.notes || '',
    id: initial?.id || null,
  })
  const [scanning, setScanning]   = useState(false)
  const [ocrResult, setOcrResult] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [tab, setTab]             = useState('main') // 'main' | 'notes'
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const cats = categories.filter(c => c.type === form.type)
    .sort((a,b) => (a.sort_order||99) - (b.sort_order||99))

  // Auto-select first category when switching type
  const switchType = (t) => {
    const first = categories.find(c => c.type === t)
    setForm(f => ({ ...f, type: t, category_id: first?.id || '' }))
  }

  // ── OCR via Claude Vision ──────────────────────────────────────────────────
  const handleReceipt = async (file) => {
    if (!file) return
    setScanning(true); setOcrResult(null)
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })

      
      const response = await fetch('/api/ocr', {
        method: 'POST',
    	headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 } },
              { type: 'text', text: `Analiza este recibo o factura y extrae los datos. Responde SOLO con JSON válido, sin markdown ni texto extra:
{
  "amount": <número decimal, importe total>,
  "description": "<nombre del comercio o concepto, máx 40 chars>",
  "date": "<YYYY-MM-DD o null>",
  "suggested_category": "<una de: housing, food, transport, health, education, leisure, clothing, utilities, other>",
  "confidence": "<high|medium|low>",
  "line_items": ["<item1>","<item2>"]
}` }
            ]
          }]
        })
      })

      const data = await response.json()
      const text = data.content?.find(b => b.type === 'text')?.text || ''
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

      setOcrResult(parsed)
      if (parsed.amount)       set('amount', parsed.amount)
      if (parsed.description)  set('description', parsed.description)
      if (parsed.date)         set('date', parsed.date)

      // Match suggested category to our list
      if (parsed.suggested_category) {
        // Try to find by name similarity first
        const matchMap = {
          housing: ['vivienda','alquiler','hipoteca'],
          food: ['alimentación','supermercado','compra'],
          transport: ['transporte','gasolina','metro','bus'],
          health: ['salud','farmacia','médico'],
          education: ['educación','colegio','academia'],
          leisure: ['ocio','entretenimiento','cine'],
          clothing: ['ropa','moda'],
          utilities: ['suministros','luz','agua','gas'],
        }
        const catFound = cats.find(c =>
          c.name.toLowerCase().includes(parsed.suggested_category) ||
          matchMap[parsed.suggested_category]?.some(k => c.name.toLowerCase().includes(k))
        )
        if (catFound) set('category_id', catFound.id)
      }

      set('has_receipt', true)
      if (parsed.line_items?.length) {
        set('notes', 'Artículos: ' + parsed.line_items.slice(0,6).join(', '))
      }
      notify('✓ Factura analizada con IA')
    } catch (e) {
      notify('Error al analizar la factura', 'error')
      console.error(e)
    } finally { setScanning(false) }
  }

  // ── Save to Supabase ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
      notify('Introduce un importe válido', 'error'); return
    }
    if (!form.category_id) { notify('Selecciona una categoría', 'error'); return }

    setLoading(true)
    try {
      const payload = {
        family_id: familyId,
        user_id: form.user_id,
        type: form.type,
        amount: parseFloat(form.amount),
        category_id: form.category_id,
        description: form.description || null,
        date: form.date,
        has_receipt: form.has_receipt,
        notes: form.notes || null,
      }

      let err
      if (form.id) {
        ({ error: err } = await supabase.from('transactions').update(payload).eq('id', form.id))
      } else {
        ({ error: err } = await supabase.from('transactions').insert(payload))
      }
      if (err) throw err
      onSave()
    } catch (e) {
      notify('Error al guardar: ' + e.message, 'error')
    } finally { setLoading(false) }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e=>e.stopPropagation()}>
        <div style={s.handle} />
        <div style={s.header}>
          <div style={s.title}>{form.id ? 'Editar' : 'Nueva transacción'}</div>
          <button style={s.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Type */}
        <div style={s.typeRow}>
          {[['expense','Gasto','#E07A5F'],['income','Ingreso','#2D6A4F']].map(([v,l,c])=>(
            <button key={v} style={{...s.typeBtn,...(form.type===v?{background:c,color:'#fff',borderColor:c}:{})}}
              onClick={()=>switchType(v)}>{l}</button>
          ))}
        </div>

        {/* Receipt scanner */}
        <div style={{...s.receiptZone,...(form.has_receipt?s.receiptDone:{})}}
          onClick={()=>fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            style={{display:'none'}} onChange={e=>handleReceipt(e.target.files[0])} />
          {scanning ? (
            <div style={s.scanRow}>
              <span style={s.spinner}/> Analizando con IA...
            </div>
          ) : (
            <div style={s.scanRow}>
              <span style={{fontSize:22}}>{form.has_receipt ? '✅' : '📷'}</span>
              <div>
                <div style={s.scanTitle}>{form.has_receipt ? 'Factura escaneada' : 'Fotografiar factura o ticket'}</div>
                <div style={s.scanSub}>{form.has_receipt ? 'Toca para cambiar' : 'La IA extrae los datos automáticamente'}</div>
              </div>
              {ocrResult && <span style={{...s.confBadge, background: ocrResult.confidence==='high'?'#E8F4EE':'#FEF9E7'}}>
                {ocrResult.confidence==='high'?'Alta':'Media'} confianza
              </span>}
            </div>
          )}
        </div>

        {/* Form tabs */}
        <div style={s.formTabs}>
          <button style={{...s.fTab,...(tab==='main'?s.fTabA:{})}} onClick={()=>setTab('main')}>Datos</button>
          <button style={{...s.fTab,...(tab==='notes'?s.fTabA:{})}} onClick={()=>setTab('notes')}>Notas</button>
        </div>

        {tab === 'main' && (
          <div style={s.fields}>
            <label style={s.label}>Importe (€)</label>
            <input style={{...s.input, fontSize:24, fontWeight:700, textAlign:'center'}}
              type="number" inputMode="decimal" placeholder="0,00"
              value={form.amount} onChange={e=>set('amount', e.target.value)} />

            <label style={s.label}>Descripción</label>
            <input style={s.input} placeholder="Ej: Mercadona, Repsol..."
              value={form.description} onChange={e=>set('description', e.target.value)} />

            <label style={s.label}>Categoría</label>
            <div style={s.catGrid}>
              {cats.map(c => (
                <button key={c.id}
                  style={{...s.catChip,...(form.category_id===c.id?{background:c.color,color:'#fff',borderColor:c.color}:{})}}
                  onClick={()=>set('category_id', c.id)}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>

            <div style={s.row2}>
              <div style={{flex:1}}>
                <label style={s.label}>Fecha</label>
                <input style={s.input} type="date" value={form.date} onChange={e=>set('date', e.target.value)} />
              </div>
              {familyMembers?.length > 1 && (
                <div style={{flex:1}}>
                  <label style={s.label}>Registrado por</label>
                  <select style={s.input} value={form.user_id} onChange={e=>set('user_id', e.target.value)}>
                    {familyMembers.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.profiles?.display_name || m.user_id}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div style={s.fields}>
            <label style={s.label}>Notas adicionales</label>
            <textarea style={{...s.input, height:120, resize:'vertical', fontFamily:'inherit'}}
              placeholder="Artículos, observaciones..."
              value={form.notes} onChange={e=>set('notes', e.target.value)} />
          </div>
        )}

        <button style={s.submitBtn} onClick={handleSubmit} disabled={loading}>
          {loading ? <span style={s.spinner}/> : (form.id ? 'Guardar cambios' : 'Registrar transacción')}
        </button>
      </div>
    </div>
  )
}

const s = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)',
    zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center' },
  modal: { background:'white', borderRadius:'24px 24px 0 0', padding:'12px 24px 32px',
    width:'100%', maxWidth:520, maxHeight:'92vh', overflowY:'auto', animation:'slideUp 0.3s ease' },
  handle: { width:40, height:4, background:'#ddd', borderRadius:2, margin:'0 auto 16px' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
  title: { fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:700 },
  closeBtn: { width:32, height:32, border:'1px solid #eee', borderRadius:8, background:'none',
    cursor:'pointer', fontSize:20, color:'#666' },
  typeRow: { display:'flex', gap:8, marginBottom:16 },
  typeBtn: { flex:1, padding:'10px', borderRadius:12, border:'1.5px solid #eee',
    background:'white', cursor:'pointer', fontWeight:600, fontSize:14, color:'#666',
    transition:'all 0.15s' },
  receiptZone: { border:'1.5px dashed #ddd', borderRadius:14, padding:14, marginBottom:16,
    cursor:'pointer', background:'#FAFAF8', transition:'all 0.2s' },
  receiptDone: { borderColor:'#52B788', background:'#F0F7F4' },
  scanRow: { display:'flex', alignItems:'center', gap:12 },
  scanTitle: { fontSize:13, fontWeight:600, color:'#333' },
  scanSub: { fontSize:11, color:'#888', marginTop:2 },
  confBadge: { marginLeft:'auto', fontSize:10, fontWeight:700, padding:'3px 8px',
    borderRadius:20, color:'#2D6A4F' },
  spinner: { width:16, height:16, border:'2px solid #ddd', borderTopColor:'#2D6A4F',
    borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' },
  formTabs: { display:'flex', gap:4, marginBottom:16 },
  fTab: { padding:'6px 16px', border:'1px solid #eee', borderRadius:20, background:'white',
    cursor:'pointer', fontSize:12, fontWeight:500, color:'#888' },
  fTabA: { background:'#1A1A1A', color:'white', borderColor:'#1A1A1A' },
  fields: { display:'flex', flexDirection:'column', gap:4, marginBottom:20 },
  label: { fontSize:11, fontWeight:700, color:'#aaa', textTransform:'uppercase',
    letterSpacing:'0.5px', marginTop:12, marginBottom:6 },
  input: { width:'100%', padding:'11px 14px', border:'1.5px solid #eee', borderRadius:12,
    fontSize:14, outline:'none', background:'#FAFAF8', boxSizing:'border-box' },
  catGrid: { display:'flex', flexWrap:'wrap', gap:6 },
  catChip: { padding:'7px 12px', borderRadius:20, border:'1.5px solid #eee', background:'white',
    cursor:'pointer', fontSize:12, fontWeight:500, color:'#555', transition:'all 0.15s' },
  row2: { display:'flex', gap:12 },
  submitBtn: { width:'100%', padding:15, background:'#1A1A1A', color:'white', border:'none',
    borderRadius:14, cursor:'pointer', fontSize:15, fontWeight:600,
    display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
}
