import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Home, BriefcaseBusiness, Star, Pencil, Trash2, X, Plus, MapPin } from 'lucide-react'
import { adminApi } from '../lib/adminApi'
import GooglePlaceField from './GooglePlaceField'

const blank = { id: '', category: 'FAVOURITE', label: '', place: null }

export default function SavedPlacesManager({ places, onChange, onClose }) {
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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
      setNotice(result.message || 'Saved place updated.')
      setForm(blank)
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
      if (form.id === item.id) setForm(blank)
      setNotice('Saved place deleted.')
    } catch (err) {
      setError(err.message || 'Could not delete this place.')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/65 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="saved-places-title">
      <div className="max-h-[calc(100dvh-24px)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-40px)] sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-wayz-blue">Your shortcuts</p>
            <h2 id="saved-places-title" className="mt-1 text-2xl font-bold text-wayz-ink">Manage saved places</h2>
            <p className="mt-1 text-base text-slate-600">Save up to 20 locations for faster pickup and destination selection.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg border border-slate-200 p-2 text-slate-500"><X size={18}/></button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-base text-rose-700">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-base text-emerald-700">{notice}</p>}

        <div className="mt-5 space-y-2">
          {places.map(item => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
              <span className="rounded-lg bg-blue-50 p-2 text-wayz-blue">
                {item.category === 'HOME' ? <Home size={18}/> : item.category === 'WORK' ? <BriefcaseBusiness size={18}/> : <Star size={18}/>}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-slate-800">{item.label}</p>
                <p className="truncate text-sm text-slate-600">{item.address}</p>
              </div>
              <button type="button" onClick={() => startEdit(item)} aria-label={'Edit ' + item.label} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-wayz-blue"><Pencil size={16}/></button>
              <button type="button" onClick={() => remove(item)} aria-label={'Delete ' + item.label} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16}/></button>
            </div>
          ))}
          {places.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-base text-slate-600">No saved places yet. Add your first one below.</p>}
        </div>

        <form onSubmit={save} className="mt-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-800">{form.id ? 'Edit saved place' : 'Add a saved place'}</h3>
            {form.id && <button type="button" onClick={() => setForm(blank)} className="text-sm font-semibold text-wayz-blue">Cancel edit</button>}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700">TYPE
              <select value={form.category} onChange={event => setForm(current => ({
                ...current,
                category: event.target.value,
                label: event.target.value === 'HOME' ? 'Home' : event.target.value === 'WORK' ? 'Work' : (current.category === 'FAVOURITE' ? current.label : '')
              }))} className="mt-1.5 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base">
                <option value="HOME">Home</option><option value="WORK">Work</option><option value="FAVOURITE">Favourite</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-700">LABEL
              <input value={form.label} onChange={event => setForm(current => ({ ...current, label: event.target.value }))} maxLength={40} placeholder="e.g. Temple, Bus stand" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" required/>
            </label>
          </div>
          <div className="mt-3">
            <GooglePlaceField label="SAVED LOCATION" placeholder="Search and select a place" icon={MapPin} tone="green" value={form.place} onSelect={place => setForm(current => ({ ...current, place }))}/>
          </div>
          <button type="submit" disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-wayz-blue px-5 py-3 text-base font-bold text-white disabled:opacity-60">
            {saving ? 'Saving…' : <><Plus size={16}/>{form.id ? 'Update place' : 'Save place'}</>}
          </button>
        </form>
        <p className="mt-3 text-sm text-slate-500">Home and Work each allow one saved address. Favourite places can have custom labels.</p>
      </div>
    </div>,
    document.body
  )
}
