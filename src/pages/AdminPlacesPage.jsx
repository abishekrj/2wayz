import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, ImagePlus, Save, X, MapPin, RefreshCw } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const emptyPlace = () => ({ id: 'place-' + Date.now(), name: '', subtitle: '', detail: '', imageUrl: '', isPublished: true })

export default function AdminPlacesPage() {
  const [heading, setHeading] = useState('Places to Visit in Tiruvannamalai')
  const [places, setPlaces] = useState([])
  const [editing, setEditing] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState(emptyPlace())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.adminPlaces()
      setHeading(data.heading || 'Places to Visit in Tiruvannamalai')
      setPlaces((data.places || []).map((place, index) => typeof place === 'string'
        ? { id: 'legacy-' + index, name: place, subtitle: '', detail: '', imageUrl: '', isPublished: true, sortOrder: index }
        : { ...place, id: place.id || 'place-' + index, isPublished: place.isPublished !== false, sortOrder: Number.isInteger(place.sortOrder) ? place.sortOrder : index }))
    } catch (err) { setError(err.message || 'Unable to load places.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditorOpen(true)
    setEditing(null)
    setForm(emptyPlace())
    setError('')
    setNotice('')
  }

  function openEdit(place, index) {
    setEditorOpen(true)
    setEditing(index)
    setForm({ ...place })
    setError('')
    setNotice('')
  }

  function closeEditor() {
    setEditorOpen(false)
    setEditing(null)
    setForm(emptyPlace())
  }

  async function uploadImage(file) {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const result = await adminApi.uploadImage(file)
      setForm(current => ({ ...current, imageUrl: result.url }))
    } catch (err) { setError(err.message || 'Image upload failed.') }
    finally { setUploading(false) }
  }

  function savePlace(event) {
    event.preventDefault()
    if (!form.name.trim()) { setError('Enter a destination name.'); return }
    const next = [...places]
    const item = { ...form, name: form.name.trim(), sortOrder: editing === null ? next.length : editing }
    if (editing === null) next.push(item)
    else next[editing] = item
    setPlaces(next.map((place, index) => ({ ...place, sortOrder: index })))
    closeEditor()
    setNotice('Place added to the list. Remember to save the configuration.')
  }

  function removePlace(index) {
    if (!window.confirm('Delete this destination from the places list?')) return
    setPlaces(current => current.filter((_, i) => i !== index).map((place, i) => ({ ...place, sortOrder: i })))
    setNotice('Destination removed. Save the configuration to publish the change.')
  }

  function togglePublished(index) {
    setPlaces(current => current.map((place, i) => i === index ? { ...place, isPublished: !place.isPublished } : place))
  }

  function movePlace(index, direction) {
    const target = index + direction
    if (target < 0 || target >= places.length) return
    const next = [...places]
    ;[next[index], next[target]] = [next[target], next[index]]
    setPlaces(next.map((place, i) => ({ ...place, sortOrder: i })))
  }

  async function saveConfiguration() {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await adminApi.savePlaces({ heading, places: places.map((place, index) => ({ ...place, sortOrder: index })) })
      setPlaces((result.places || []).map(place => ({ ...place })))
      setNotice('Places configuration saved successfully. Published changes are now available on the website.')
      try { sessionStorage.removeItem('twoWayz.publicHomepage.v1') } catch {}
    } catch (err) { setError(err.message || 'Unable to save places configuration.') }
    finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Website configuration</p><h1 className="mt-2 text-2xl font-extrabold text-wayz-ink sm:text-3xl">Places to Explore</h1><p className="mt-2 text-sm text-slate-500">Manage the destinations shown on the homepage and the public places directory.</p></div>
      <button type="button" onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white"><Plus size={17}/> Add a place</button>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="places-heading">Section heading</label>
      <input id="places-heading" value={heading} onChange={event => setHeading(event.target.value)} maxLength={140} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-wayz-blue focus:ring-2 focus:ring-blue-100"/>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{places.length} destinations configured · {places.filter(place => place.isPublished).length} published</p><button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RefreshCw size={14}/> Reload</button></div>
    </div>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

    {editorOpen && <form onSubmit={savePlace} className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between"><h2 className="font-extrabold text-wayz-ink">{editing === null ? 'Add destination' : 'Edit destination'}</h2><button type="button" onClick={closeEditor} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close editor"><X size={18}/></button></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">Place name<input required maxLength={120} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-wayz-blue"/></label>
        <label className="text-xs font-semibold text-slate-600">Short subtitle<input maxLength={120} value={form.subtitle} onChange={event => setForm(current => ({ ...current, subtitle: event.target.value }))} placeholder="e.g. Sacred hilltop retreat" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-wayz-blue"/></label>
      </div>
      <label className="mt-4 block text-xs font-semibold text-slate-600">Short description<textarea rows={3} maxLength={500} value={form.detail} onChange={event => setForm(current => ({ ...current, detail: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-wayz-blue"/></label>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_180px]">
        <label className="text-xs font-semibold text-slate-600">Destination image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => uploadImage(event.target.files?.[0])} className="mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-wayz-blue"/><span className="mt-1 block text-[11px] font-normal text-slate-400">JPG, PNG, WEBP or GIF · maximum 5 MB</span>{uploading&&<span className="mt-2 block text-xs text-wayz-blue">Uploading image…</span>}</label>
        <div className="flex h-28 items-center justify-center overflow-hidden rounded-xl bg-slate-100">{form.imageUrl ? <img src={form.imageUrl.startsWith('/') ? ((import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/api').replace(/\/api$/, '') + form.imageUrl) : form.imageUrl} alt="Destination preview" className="h-full w-full object-cover"/> : <div className="text-center text-slate-400"><ImagePlus size={24} className="mx-auto"/><span className="mt-1 block text-[10px]">Image preview</span></div>}</div>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.isPublished !== false} onChange={event => setForm(current => ({ ...current, isPublished: event.target.checked }))}/> Publish this place on the website</label>
      <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={closeEditor} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={uploading} className="rounded-xl bg-wayz-blue px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{editing === null ? 'Add to list' : 'Update place'}</button></div>
    </form>}

    <div className="space-y-3">
      {loading ? <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Loading destinations…</div> : places.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><MapPin size={30} className="mx-auto text-slate-300"/><p className="mt-3 font-semibold text-slate-700">No places added yet</p><p className="mt-1 text-xs text-slate-500">Add your first destination to get started.</p></div> : places.map((place,index) => <article key={place.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="h-20 w-full shrink-0 overflow-hidden rounded-xl bg-blue-50 sm:w-28">{place.imageUrl ? <img src={place.imageUrl.startsWith('/') ? ((import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/api').replace(/\/api$/, '') + place.imageUrl) : place.imageUrl} alt="" className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-wayz-blue"><MapPin size={26}/></div>}</div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-wayz-ink">{place.name}</h3><span className={place.isPublished ? 'rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700' : 'rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500'}>{place.isPublished ? 'Published' : 'Hidden'}</span></div><p className="mt-1 text-xs text-slate-500">{place.subtitle || place.detail || 'No additional description'}</p></div>
        <div className="flex items-center gap-1 self-end sm:self-center"><button type="button" disabled={index===0} onClick={()=>movePlace(index,-1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Move up"><ArrowUp size={16}/></button><button type="button" disabled={index===places.length-1} onClick={()=>movePlace(index,1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Move down"><ArrowDown size={16}/></button><button type="button" onClick={()=>togglePublished(index)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={place.isPublished ? 'Hide place' : 'Publish place'}>{place.isPublished ? <EyeOff size={16}/> : <Eye size={16}/>}</button><button type="button" onClick={()=>openEdit(place,index)} className="rounded-lg p-2 text-wayz-blue hover:bg-blue-50" aria-label="Edit place"><Pencil size={16}/></button><button type="button" onClick={()=>removePlace(index)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Delete place"><Trash2 size={16}/></button></div>
      </article>)}
    </div>

    <div className="sticky bottom-3 flex justify-end"><button type="button" onClick={saveConfiguration} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-xl bg-wayz-yellow px-6 py-3.5 text-sm font-extrabold text-wayz-ink shadow-lg disabled:opacity-50"><Save size={17}/>{saving ? 'Saving…' : 'Save configuration'}</button></div>
  </div>
}
