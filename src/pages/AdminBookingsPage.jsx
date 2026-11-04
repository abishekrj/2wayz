import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Search, ClipboardList, Clock3, CarFront, CheckCircle2, XCircle } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const statuses = ['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
const money = value => '₹' + Number(value || 0).toLocaleString('en-IN')
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const statusTone = status => status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : status === 'CANCELLED' ? 'bg-rose-50 text-rose-700' : status === 'REQUESTED' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-700'

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const result = await adminApi.adminBookings({ search, status, page })
      setBookings(result.bookings || [])
      setPagination(result.pagination || { page: 1, total: 0, totalPages: 1 })
      setError('')
    } catch (err) { setError(err.message || 'Unable to load bookings.') }
    finally { if (!quiet) setLoading(false) }
  }, [search, status, page])
  useEffect(() => { load(); const timer = window.setInterval(() => load(true), 15000); return () => window.clearInterval(timer) }, [load])
  useEffect(() => { setPage(1) }, [search, status])
  const count = (key) => bookings.filter(item => item.status === key).length
  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-wayz-blue">Ride operations</p><h1 className="mt-1 text-3xl font-black text-slate-900">Booking Management</h1><p className="mt-2 text-sm text-slate-500">Monitor passenger requests, driver assignments and completed rides. Refreshes every 15 seconds.</p></div><button onClick={() => load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"><RefreshCw size={16}/> Refresh</button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Requests on this page</p><p className="mt-1 text-2xl font-black text-slate-900">{bookings.length}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Awaiting driver</p><p className="mt-1 text-2xl font-black text-amber-700">{count('REQUESTED')}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">On-trip</p><p className="mt-1 text-2xl font-black text-blue-700">{count('IN_PROGRESS')}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">Total matching bookings</p><p className="mt-1 text-2xl font-black text-slate-900">{pagination.total}</p></div>
    </div>
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
      <label className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search reference, passenger, driver or location" className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-wayz-blue"/></label>
      <select value={status} onChange={event => setStatus(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-wayz-blue"><option value="">All statuses</option>{statuses.map(item => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select>
    </div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading bookings…</div> : bookings.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><ClipboardList className="mx-auto text-slate-400" size={34}/><p className="mt-3 font-bold text-slate-700">No bookings found</p><p className="mt-1 text-sm text-slate-500">New passenger ride requests will appear here.</p></div> :
      <div className="space-y-3">{bookings.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-wayz-blue">{item.reference}</p><p className="mt-1 text-xs text-slate-400">Requested {dateTime(item.requestedAt)}</p></div><span className={'rounded-full px-3 py-1 text-xs font-bold '+statusTone(item.status)}>{item.status.replaceAll('_', ' ')}</span></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_.9fr]">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passenger</p><p className="mt-1 text-sm font-bold text-slate-800">{item.passenger?.name || '—'}</p><p className="text-xs text-slate-500">{item.passenger?.phone || '—'}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver</p><p className="mt-1 text-sm font-bold text-slate-800">{item.driver?.name || (item.status === 'REQUESTED' ? 'Awaiting acceptance' : '—')}</p><p className="text-xs text-slate-500">{item.driver ? [item.driver.phone, item.driver.vehicleNumber].filter(Boolean).join(' · ') : item._count?.offers ? item._count.offers+' driver offers sent' : 'No driver assigned'}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fare / distance</p><p className="mt-1 text-sm font-black text-wayz-blue">{money(item.finalFare ?? item.estimatedFare)}</p><p className="text-xs text-slate-500">{Number(item.distanceKm || 0).toFixed(1)} km · approx. {item.estimatedMinutes} min</p></div>
        </div>
        <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Pickup</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.pickupName}</p><p className="text-xs text-slate-500">{item.pickupAddress}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Destination</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.destinationName}</p><p className="text-xs text-slate-500">{item.destinationAddress}</p></div></div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 size={14}/> {item.mode === 'schedule' ? 'Scheduled' : 'Instant'}</span><span>Offers: {item._count?.offers || 0}</span>{item.completedAt && <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={14}/> Completed {dateTime(item.completedAt)}</span>}{item.cancelledAt && <span className="inline-flex items-center gap-1 text-rose-700"><XCircle size={14}/> Cancelled {dateTime(item.cancelledAt)}</span>}</div>
      </article>)}</div>}
    <div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-500">Page {pagination.page || page} of {pagination.totalPages || 1}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value-1))} className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold disabled:opacity-40">Previous</button><button disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage(value => value+1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold disabled:opacity-40">Next</button></div></div>
  </div>
}
