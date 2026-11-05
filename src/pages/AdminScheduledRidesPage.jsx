import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, RefreshCw, Search, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const money = value => '₹' + Number(value || 0).toLocaleString('en-IN')
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const statusClass = value => ({
  SCHEDULED: 'bg-slate-100 text-slate-700',
  SEARCHING: 'bg-blue-100 text-blue-700',
  OFFERED: 'bg-indigo-100 text-indigo-700',
  NO_DRIVERS: 'bg-amber-100 text-amber-800',
  ASSIGNED: 'bg-emerald-100 text-emerald-700',
  MISSED: 'bg-rose-100 text-rose-700'
}[value] || 'bg-slate-100 text-slate-600')

export default function AdminScheduledRidesPage() {
  const [bookings, setBookings] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await adminApi.adminScheduledBookings(search); setBookings(result.bookings || []) }
    catch (err) { setError(err.message || 'Unable to load scheduled rides.') }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { load() }, [load])
  useEffect(() => { const timer = setInterval(load, 15000); return () => clearInterval(timer) }, [load])

  const needsAttention = bookings.filter(item => ['NO_DRIVERS', 'MISSED'].includes(item.dispatchStatus)).length
  const assigned = bookings.filter(item => item.dispatchStatus === 'ASSIGNED').length

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Booking management</p><h1 className="mt-2 text-2xl font-bold text-wayz-ink">Scheduled Rides</h1><p className="mt-1 text-sm text-slate-500">Monitor automatic driver matching for scheduled pickups.</p></div>
      <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"><RefreshCw size={16}/>Refresh</button>
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Scheduled bookings</p><p className="mt-1 text-2xl font-black text-wayz-ink">{bookings.length}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Drivers assigned</p><p className="mt-1 text-2xl font-black text-emerald-700">{assigned}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Needs attention</p><p className="mt-1 text-2xl font-black text-amber-700">{needsAttention}</p></div>
    </div>
    <div className="mt-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3"><Search size={17} className="text-slate-400"/><input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') load() }} placeholder="Search booking reference, passenger, mobile or driver…" className="h-12 min-w-0 flex-1 text-sm outline-none"/></div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading scheduled rides…</p> : bookings.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><CalendarClock className="mx-auto text-slate-400" size={30}/><p className="mt-3 font-bold text-slate-700">No scheduled rides found</p><p className="mt-1 text-sm text-slate-500">New scheduled bookings will appear here.</p></div> :
      <div className="mt-5 space-y-3">{bookings.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-wayz-blue">{item.reference}</p><p className="mt-1 text-sm font-bold text-wayz-ink">{item.passenger?.name || 'Passenger'} · {item.passenger?.phone || '—'}</p></div><span className={'rounded-full px-3 py-1 text-xs font-bold ' + statusClass(item.dispatchStatus)}>{String(item.dispatchStatus || 'SCHEDULED').replaceAll('_', ' ')}</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup</p><p className="mt-1 text-sm font-semibold text-wayz-ink">{item.pickupName}</p><p className="text-xs text-slate-500">{item.pickupAddress}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</p><p className="mt-1 text-sm font-semibold text-wayz-ink">{item.destinationName}</p><p className="text-xs text-slate-500">{item.destinationAddress}</p></div></div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><CalendarClock size={14}/>Pickup: {dateTime(item.scheduledAt)}</span><span>Estimated fare: {money(item.estimatedFare)}</span><span>Dispatch attempts: {item.dispatchAttemptCount}</span><span>Offers created: {item._count?.offers || 0}</span></div>
        {item.driver ? <p className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16}/>Assigned: {item.driver.name} · {item.driver.phone} · {item.driver.vehicleNumber}</p> : ['NO_DRIVERS', 'MISSED'].includes(item.dispatchStatus) ? <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={16}/>No driver assigned. Please contact the passenger and arrange a driver.</p> : <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14}/>The dispatch worker will continue checking eligible drivers.</p>}
      </article>)}</div>}
    <p className="mt-5 text-xs text-slate-400">This page refreshes every 15 seconds. Dispatch starts before pickup and retries automatically using the backend scheduled-dispatch settings.</p>
  </div>
}
