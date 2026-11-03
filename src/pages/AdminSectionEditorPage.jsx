import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Save, Eye, EyeOff, Plus, Trash2, Upload, RotateCcw } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/api'
const mediaUrl = value => value && value.startsWith('/') ? new URL(value, API_BASE).toString() : value

function isImageField(key, value) {
  return typeof value === 'string' && /(image|photo|banner|thumbnail|logo|icon)/i.test(key)
}

function FieldEditor({ name, value, onChange, depth = 0 }) {
  const label = name.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').replace(/^./, c => c.toUpperCase())
  if (Array.isArray(value)) {
    const objectItem = value.find(item => item && typeof item === 'object')
    return <fieldset className="rounded-xl border border-slate-200 p-4" style={{ marginLeft: depth ? 12 : 0 }}>
      <legend className="px-2 text-sm font-bold text-slate-800">{label}</legend>
      <div className="space-y-3">{value.map((item,index)=><div key={index} className="rounded-lg bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">Item {index+1}</span><button type="button" onClick={()=>onChange(value.filter((_,i)=>i!==index))} className="text-red-600" aria-label={`Remove ${label} item ${index+1}`}><Trash2 size={16}/></button></div>
        {item && typeof item === 'object' ? <div className="space-y-3">{Object.entries(item).map(([key,child])=><FieldEditor key={key} name={key} value={child} depth={depth+1} onChange={next=>onChange(value.map((entry,i)=>i===index?{...entry,[key]:next}:entry))}/>)}</div> : <textarea value={item ?? ''} rows={2} onChange={e=>onChange(value.map((entry,i)=>i===index?e.target.value:entry))} className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm"/>}
      </div>)}</div>
      <button type="button" onClick={()=>onChange([...value, objectItem ? Object.fromEntries(Object.keys(objectItem).map(key=>[key,''])) : ''])} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-wayz-blue"><Plus size={14}/>Add {label.replace(/s$/,' item')}</button>
    </fieldset>
  }
  if (value && typeof value === 'object') return <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4" style={{ marginLeft: depth ? 12 : 0 }}><legend className="px-2 text-sm font-bold text-slate-800">{label}</legend>{Object.entries(value).map(([key,child])=><FieldEditor key={key} name={key} value={child} depth={depth+1} onChange={next=>onChange({...value,[key]:next})}/>)}</fieldset>
  const common="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-wayz-blue"
  return <label className="block"><span className="text-sm font-semibold text-slate-700">{label}</span>
    {typeof value === 'boolean' ? <select value={String(value)} onChange={e=>onChange(e.target.value==='true')} className={common}><option value="true">Yes</option><option value="false">No</option></select>
    : typeof value === 'number' ? <input type="number" value={value} onChange={e=>onChange(Number(e.target.value))} className={common}/>
    : isImageField(name,value) ? <div className="space-y-2"><input type="url" value={value} onChange={e=>onChange(e.target.value)} placeholder="Image URL" className={common}/><input type="file" accept="image/*" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{const result=await adminApi.uploadImage(file);onChange(result.url)}catch(error){window.alert(error.message)}e.target.value=''}} className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-wayz-blue"/>{value&&<img src={mediaUrl(value)} alt={label} className="mt-2 max-h-36 rounded-lg border border-slate-200 object-contain"/>}</div>
    : typeof value === 'string' && (value.length>90 || /description|body|text|caption/i.test(name)) ? <textarea rows={4} value={value} onChange={e=>onChange(e.target.value)} className={common}/>
    : <input type="text" value={value ?? ''} onChange={e=>onChange(e.target.value)} className={common}/>}
  </label>
}

export default function AdminSectionEditorPage() {
  const { slug } = useParams()
  const [section,setSection] = useState(null)
  const [content,setContent] = useState({})
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')
  const [loading,setLoading] = useState(true)
  const [saving,setSaving] = useState(false)
  useEffect(()=>{let active=true;setLoading(true);setError('');adminApi.sections().then(data=>{const found=data.sections.find(item=>item.slug===slug);if(!found)throw new Error('Section not found.');if(active){setSection(found);setContent(found.content)}}).catch(err=>active&&setError(err.message)).finally(()=>active&&setLoading(false));return()=>{active=false}},[slug])
  async function save(publish=section.isPublished){setError('');setMessage('');setSaving(true);try{const result=await adminApi.saveSection(slug,{title:section.title,content,isPublished:publish,sortOrder:section.sortOrder});setSection(result.section);setContent(result.section.content);setMessage(result.section.isPublished?'Changes saved and published.':'Changes saved as draft.')}catch(err){setError(err.message)}finally{setSaving(false)}}
  if(loading)return <p className="text-sm text-slate-500">Loading section…</p>
  if(!section)return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error||'Section not found.'}</p>
  return <div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Home Page / Content manager</p><h1 className="mt-2 text-3xl font-extrabold text-wayz-ink">{section.title}</h1><p className="mt-2 text-sm text-slate-500">Update text, descriptions, lists and section images using the fields below.</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${section.isPublished?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{section.isPublished?'Published':'Draft'}</span></div>
    <form onSubmit={e=>{e.preventDefault();save()}} className="mt-7 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><div className="flex items-center justify-between"><div><h2 className="font-bold text-wayz-ink">Section content</h2><p className="mt-1 text-xs text-slate-500">Edit each field directly. Add or remove repeatable items where available.</p></div><button type="button" onClick={()=>setContent(section.content)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"><RotateCcw size={14}/>Reset</button></div>
      {Object.entries(content).map(([key,value])=><FieldEditor key={key} name={key} value={value} onChange={next=>setContent(current=>({...current,[key]:next}))}/>)}
      {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><Save size={17}/>{saving?'Saving…':'Save changes'}</button><button type="button" disabled={saving} onClick={()=>save(!section.isPublished)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-60">{section.isPublished?<EyeOff size={17}/>:<Eye size={17}/>} {section.isPublished?'Unpublish':'Publish'}</button></div>
    </form><p className="mt-4 text-xs leading-5 text-slate-400">Image uploads are stored by the 2WAYZ backend. The public homepage still needs to be connected to these saved CMS values before edits appear on the live homepage.</p>
  </div>
}
