import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Save, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

export default function AdminSectionEditorPage() {
  const { slug } = useParams()
  const [section,setSection] = useState(null)
  const [json,setJson] = useState('')
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')
  const [loading,setLoading] = useState(true)
  const [saving,setSaving] = useState(false)
  useEffect(()=>{let active=true;setLoading(true);setError('');adminApi.sections().then(data=>{const found=data.sections.find(item=>item.slug===slug);if(!found)throw new Error('Section not found.');if(active){setSection(found);setJson(JSON.stringify(found.content,null,2))}}).catch(err=>active&&setError(err.message)).finally(()=>active&&setLoading(false));return()=>{active=false}},[slug])
  async function save(event){event.preventDefault();setError('');setMessage('');let content;try{content=JSON.parse(json);if(!content||Array.isArray(content)||typeof content!=='object')throw new Error('Content must be a JSON object.')}catch(err){setError(`Invalid JSON: ${err.message}`);return}setSaving(true);try{const result=await adminApi.saveSection(slug,{title:section.title,content,isPublished:section.isPublished,sortOrder:section.sortOrder});setSection(result.section);setJson(JSON.stringify(result.section.content,null,2));setMessage(result.message)}catch(err){setError(err.message)}finally{setSaving(false)}}
  async function togglePublish(){setError('');setMessage('');setSaving(true);try{const result=await adminApi.saveSection(slug,{title:section.title,content:JSON.parse(json),isPublished:!section.isPublished,sortOrder:section.sortOrder});setSection(result.section);setJson(JSON.stringify(result.section.content,null,2));setMessage(result.section.isPublished?'Section published.':'Section moved to draft.')}catch(err){setError(err.message)}finally{setSaving(false)}}
  if(loading)return <p className="text-sm text-slate-500">Loading section…</p>
  if(error&&!section)return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
  return <div className="mx-auto max-w-5xl"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Home Page / Content manager</p><h1 className="mt-2 text-3xl font-extrabold text-wayz-ink">{section.title}</h1><p className="mt-2 text-sm text-slate-500">Update this section's content. Changes are stored in the 2WAYZ database.</p></div><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${section.isPublished?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{section.isPublished?'Published':'Draft'}</span></div>
    <form onSubmit={save} className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-wayz-ink">Section content</h2><p className="mt-1 text-xs text-slate-500">Edit the JSON fields below. Keep the field names and data types valid.</p></div><button type="button" onClick={()=>setJson(JSON.stringify(section.content,null,2))} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw size={14}/>Reset editor</button></div>
      <label className="mt-5 block text-sm font-semibold text-slate-700">Content JSON<textarea spellCheck="false" value={json} onChange={e=>setJson(e.target.value)} rows={22} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-6 text-emerald-100 outline-none focus:border-wayz-blue"/></label>
      {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message&&<p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <div className="mt-5 flex flex-wrap gap-3"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white hover:bg-wayz-navy disabled:opacity-60"><Save size={17}/>{saving?'Saving…':'Save changes'}</button><button type="button" disabled={saving} onClick={togglePublish} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">{section.isPublished?<EyeOff size={17}/>:<Eye size={17}/>} {section.isPublished?'Unpublish':'Publish'}</button></div>
    </form>
    <p className="mt-4 text-xs leading-5 text-slate-400">Note: the admin editor and database API are being established first. The public homepage will be switched to read these saved values in the next integration step.</p>
  </div>
}