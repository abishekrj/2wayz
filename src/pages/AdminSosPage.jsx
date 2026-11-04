import { useCallback, useEffect, useState } from 'react'
import { Siren, RefreshCw, MapPin, Phone, CheckCircle2, AlertTriangle } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const dateText = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function AdminSosPage() {
  const [alerts, setAlerts] = useState([])
  const [openCount, setOpenCount] = useState(0)
  const [notes, setNotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const result = await adminApi.adminSosAlerts()
      setAlerts(result.alerts || [])
      setOpenCount(result.openCount || 0)
      setError('')
    } catch (err) { setError(err.message || 'Unable to load emergency alerts.') }
    finally { if (!quiet) setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(() => load(true), 10000)
    return () => window.clearInterval(timer)
  }, [load])

  async function updateAlert(item, status) {
    if (busyId) return
    const actionTaken = notes[item.id] || ''
    if (status === 'RESOLVED' && actionTaken.trim().length < 5) {
      setError('Add a short action-taken note before resolving this emergency alert.')
      return
    }
    setBusyId(item.id); setError(''); setMessage('')
    try {
      await adminApi.updateSosAlert(item.id, { status, actionTaken })
      setMessage(status === 'RESOLVED' ? 'Emergency alert marked as resolved.' : 'Emergency alert acknowledged.')
      await load(true)
    } catch (err) { setError(err.message || 'Unable to update this alert.') }
    finally { setBusyId('') }
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-rose-600">Safety & incident response</p><h1 className="mt-1 text-3xl font-black text-slate-900">SOS Emergency Alerts</h1><p className="mt-2 text-sm text-slate-500">Review emergency alerts raised by passengers and drivers. This screen refreshes every 10 seconds.</p></div>
      <button onClick={() => load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"><RefreshCw size={16}/> Refresh</button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="text-xs font-bold text-rose-700">Open / acknowledged alerts</p><p className="mt-1 text-3xl font-black text-rose-800">{openCount}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold text-slate-500">Total alerts loaded</p><p className="mt-1 text-3xl font-black text-slate-900">{alerts.length}</p></div></div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p>}
    {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading emergency alerts…</div> : alerts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Siren className="mx-auto text-slate-400" size={36}/><p className="mt-3 font-bold text-slate-700">No SOS alerts received</p><p className="mt-1 text-sm text-slate-500">New passenger and driver emergency alerts will appear here.</p></div> :
      <div className="space-y-4">{alerts.slice().sort((a, b) => ({ OPEN: 0, ACKNOWLEDGED: 1, RESOLVED: 2 }[a.status] - { OPEN: 0, ACKNOWLEDGED: 1, RESOLVED: 2 }[b.status])).map(item => {
        const booking = item.booking
        const person = item.triggeredByRole === 'PASSENGER' ? booking?.passenger : booking?.driver
        const mapUrl = item.latitude != null && item.longitude != null ? 'https://www.google.com/maps?q=' + item.latitude + ',' + item.longitude : ''
        return <article key={item.id} className={'rounded-2xl border bg-white p-5 shadow-sm ' + (item.status === 'OPEN' ? 'border-rose-300 ring-1 ring-rose-100' : 'border-slate-200')}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-700"><Siren size={23}/></span><div><p className="font-extrabold text-slate-900">{item.triggeredByRole === 'PASSENGER' ? 'Passenger SOS' : 'Driver SOS'}</p><p className="mt-0.5 text-xs text-slate-500">{dateText(item.createdAt)}</p></div></div><span className={'rounded-full px-3 py-1 text-xs font-extrabold ' + (item.status === 'OPEN' ? 'bg-rose-100 text-rose-800' : item.status === 'ACKNOWLEDGED' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}>{item.status.replaceAll('_', ' ')}</span></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Person who triggered SOS</p><p className="mt-1 text-sm font-bold text-slate-800">{person?.name || 'Account unavailable'}</p>{person?.phone && <a href={'tel:' + person.phone} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-wayz-blue"><Phone size={14}/>{person.phone}</a>}</div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Other ride participant</p><p className="mt-1 text-sm font-bold text-slate-800">{otherPerson?.name || "—"}</p>{otherPerson?.phone && <a href={"tel:" + otherPerson.phone} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-wayz-blue"><Phone size={14}/>{otherPerson.phone}</a>}</div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Booking reference</p><p className="mt-1 text-sm font-bold text-slate-800">{booking?.reference || 'Booking details unavailable'}</p><p className="mt-1 text-xs text-slate-500">{booking?.status?.replaceAll('_', ' ') || ''}</p></div></div>
          {booking && <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase text-emerald-700">Pickup</p><p className="mt-1 text-sm font-semibold text-slate-800">{booking.pickupName}</p><p className="text-xs text-slate-500">{booking.pickupAddress}</p></div><div><p className="text-[10px] font-bold uppercase text-rose-700">Destination</p><p className="mt-1 text-sm font-semibold text-slate-800">{booking.destinationName}</p><p className="text-xs text-slate-500">{booking.destinationAddress}</p></div></div>}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">{item.latitude != null && item.longitude != null ? <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-wayz-blue"><MapPin size={14}/> Open reported GPS location</a> : <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle size={14}/> GPS location unavailable</span>}{item.locationAccuracy != null && <span>GPS accuracy ±{Math.round(item.locationAccuracy)} m</span>}</div>
          {item.actionTaken && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800"><strong>Action taken:</strong> {item.actionTaken}</p>}
          {item.status !== 'RESOLVED' && <div className="mt-4 border-t border-slate-100 pt-4"><label className="block text-xs font-bold text-slate-600">ACTION TAKEN / RESPONSE NOTES<textarea value={notes[item.id] ?? item.actionTaken ?? ''} onChange={event => setNotes(current => ({ ...current, [item.id]: event.target.value }))} rows={2} maxLength={2000} placeholder="Record calls made, assistance arranged, or follow-up required…" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-wayz-blue"/></label><div className="mt-3 flex flex-wrap gap-2">{item.status === 'OPEN' && <button disabled={busyId === item.id} onClick={() => updateAlert(item, 'ACKNOWLEDGED')} className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Acknowledge alert</button>}<button disabled={busyId === item.id} onClick={() => updateAlert(item, 'RESOLVED')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 size={16}/>{busyId === item.id ? 'Saving…' : 'Mark resolved'}</button></div></div>}
        </article>
      })}</div>}
    <p className="text-xs leading-5 text-slate-500">These are in-app alerts for the 2WAYZ Super Admin. They do not automatically notify police, ambulance services, or emergency contacts. For immediate danger, call 112.</p>
  </div>
}
