import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Home, BriefcaseBusiness, Star, Pencil, Trash2, X, Plus, MapPin, ArrowLeft, List, ChevronRight } from 'lucide-react'
import { adminApi } from '../lib/adminApi'
import GooglePlaceField from './GooglePlaceField'

const blank = { id: '', category: 'FAVOURITE', label: '', place: null }

export default function SavedPlacesManager({ places, onChange, onClose }) {
  const [form, setForm] = useState(blank)
  const [view, setView] = useState('add')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function showAdd() {
    setForm(blank)
    setView('add')
    setError('')
    setNotice('')
  }

  function showList() {
    setView('list')
    setError('')
    setNotice('')
  }

  function startEdit(item) {
    setError('')
    setNotice('')
    setForm({
      id: item.id,
      category: item.category,
      label: item.label,
      place: {
        placeId: item.placeId || undefined,
        name: item.name,
        address: item.address,
        location: { lat: item.latitude, lng: item.longitude }
      }
    })
    setView('edit')
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!form.place || !form.place.location) {
      setError('Select a location from the Google suggestions.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        category: form.category,
        label: form.label,
        name: form.place.name,
        address: form.place.address || form.place.name,
        placeId: form.place.placeId,
        latitude: form.place.location.lat,
        longitude: form.place.location.lng
      }
      const result = form.id
        ? await adminApi.updateSavedPlace(form.id, payload)
        : await adminApi.createSavedPlace(payload)
      onChange(current => form.id
        ? current.map(item => item.id === result.place.id ? result.place : item)
        : [...current, result.place])
      setNotice(result.message || (form.id ? 'Saved place updated.' : 'Saved place added.'))
      if (form.id) setView('list')
      else setForm(blank)
    } catch (err) {
      setError(err.message || 'Could not save this place.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(item) {
    if (!window.confirm('Delete saved place "' + item.label + '"?')) return
    setError('')
    setNotice('')
    try {
      await adminApi.deleteSavedPlace(item.id)
      onChange(current => current.filter(place => place.id !== item.id))
      setNotice('Saved place deleted.')
    } catch (err) {
      setError(err.message || 'Could not delete this place.')
    }
  }

  const isForm = view === 'add' || view === 'edit'

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/65 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="saved-places-title">
      <div className="flex h-[min(520px,calc(100dvh-24px))] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-2xl sm:h-[min(520px,calc(100dvh-40px))] sm:p-7">
        <div className="flex shrink-0 items-center gap-3">
          {view === 'list' && <button type="button" onClick={showAdd} aria-label="Back to add place" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-wayz-blue"><ArrowLeft size={19}/></button>}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold uppercase tracking-wider text-wayz-blue">Your shortcuts</p>
            <h2 id="saved-places-title" className="mt-1 text-2xl font-bold text-wayz-ink">{view === 'list' ? 'Saved places' : view === 'edit' ? 'Edit saved place' : 'Add a saved place'}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{view === 'list' ? 'View, edit or remove your saved locations.' : 'Save up to 20 locations for faster pickup and destination selection.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close saved places" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"><X size={18}/></button>
        </div>

        {view === 'list' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
            <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {places.map(item => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <span className="rounded-lg bg-blue-50 p-2.5 text-wayz-blue">
                    {item.category === 'HOME' ? <Home size={18}/> : item.category === 'WORK' ? <BriefcaseBusiness size={18}/> : <Star size={18}/>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">{item.label}</p>
                    <p className="truncate text-xs text-slate-500">{item.address}</p>
                  </div>
                  <button type="button" onClick={() => startEdit(item)} aria-label={'Edit ' + item.label} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-wayz-blue"><Pencil size={16}/></button>
                  <button type="button" onClick={() => remove(item)} aria-label={'Delete ' + item.label} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16}/></button>
                </div>
              ))}
              {places.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No saved places yet. Add your first location.</p>}
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {view === 'edit' && <button type="button" onClick={showList} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><ArrowLeft size={16}/> Back to saved places</button>}
            {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
            <form onSubmit={save} className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-700">TYPE
                  <select value={form.category} onChange={event => setForm(current => ({
                    ...current,
                    category: event.target.value,
                    label: event.target.value === 'HOME' ? 'Home' : event.target.value === 'WORK' ? 'Work' : (current.category === 'FAVOURITE' ? current.label : '')
                  }))} className="mt-1.5 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                    <option value="HOME">Home</option><option value="WORK">Work</option><option value="FAVOURITE">Favourite</option>
                  </select>
                </label>
                <label className="block text-xs font-bold text-slate-700">LABEL
                  <input value={form.label} onChange={event => setForm(current => ({ ...current, label: event.target.value }))} maxLength={40} placeholder="e.g. Temple, Bus stand" className="mt-1.5 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" required/>
                </label>
              </div>
              <div>
                <GooglePlaceField label="SAVED LOCATION" placeholder="Search and select a place" icon={MapPin} tone="green" value={form.place} onSelect={place => setForm(current => ({ ...current, place }))}/>
              </div>
              <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-wayz-blue px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                {saving ? 'Saving…' : <><Plus size={16}/>{form.id ? 'Update place' : 'Save place'}</>}
              </button>
            </form>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <button type="button" onClick={showList} className="inline-flex items-center gap-2 text-sm font-semibold text-wayz-blue hover:underline"><List size={16}/> View saved places ({places.length}) <ChevronRight size={15}/></button>
              <p className="mt-2 text-xs leading-5 text-slate-500">Home and Work each allow one saved address. Favourite places can have custom labels.</p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
