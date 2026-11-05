import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Search, ClipboardList, Clock3, CarFront, CheckCircle2, XCircle, UserCheck, X, LoaderCircle, MapPin, Wallet, Wifi } from 'lucide-react'
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
  const [assignBooking, setAssignBooking] = useState(null)
  const [eligibleDrivers, setEligibleDrivers] = useState([])
  const [unavailableDrivers, setUnavailableDrivers] = useState([])
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [assignMessage, setAssignMessage] = useState('')
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

  async function openAssignment(item) {
    setAssignBooking(item); setEligibleDrivers([]); setUnavailableDrivers([]); setSelectedDriverId(''); setAssignError(''); setAssignMessage(''); setAssignLoading(true)
    try { const result = await adminApi.eligibleAssignmentDrivers(item.id); setEligibleDrivers(result.eligibleDrivers || []); setUnavailableDrivers(result.unavailableDrivers || []); if (!(result.eligibleDrivers || []).length) setAssignError('No driver currently meets all assignment requirements. Check the unavailable-driver reasons below.') }
    catch (err) { setAssignError(err.message || 'Unable to load eligible drivers.') }
    finally { setAssignLoading(false) }
  }

  async function confirmAssignment() {
    if (!assignBooking || !selectedDriverId || assigning) return
    setAssigning(true); setAssignError('')
    try { const result = await adminApi.manuallyAssignDriver(assignBooking.id, selectedDriverId); setAssignMessage(result.message || 'Driver assigned successfully.'); setAssignBooking(null); setSelectedDriverId(''); await load(true) }
    catch (err) { setAssignError(err.message || 'Unable to assign this driver. Refresh and try again.') }
    finally { setAssigning(false) }
  }
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
    {assignMessage && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{assignMessage}</p>}
    {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading bookings…</div> : bookings.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><ClipboardList className="mx-auto text-slate-400" size={34}/><p className="mt-3 font-bold text-slate-700">No bookings found</p><p className="mt-1 text-sm text-slate-500">New passenger ride requests will appear here.</p></div> :
      <div className="space-y-3">{bookings.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-wayz-blue">{item.reference}</p><p className="mt-1 text-xs text-slate-400">Requested {dateTime(item.requestedAt)}</p></div><span className={'rounded-full px-3 py-1 text-xs font-bold '+statusTone(item.status)}>{item.status.replaceAll('_', ' ')}</span></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_.9fr]">
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passenger</p><p className="mt-1 text-sm font-bold text-slate-800">{item.passenger?.name || '—'}</p><p className="text-xs text-slate-500">{item.passenger?.phone || '—'}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver</p><p className="mt-1 text-sm font-bold text-slate-800">{item.driver?.name || (item.status === 'REQUESTED' ? 'Awaiting acceptance' : '—')}</p><p className="text-xs text-slate-500">{item.driver ? [item.driver.phone, item.driver.vehicleNumber].filter(Boolean).join(' · ') : item._count?.offers ? item._count.offers+' driver offers sent' : 'No driver assigned'}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fare / distance</p><p className="mt-1 text-sm font-black text-wayz-blue">{money(item.finalFare ?? item.estimatedFare)}</p><p className="text-xs text-slate-500">{Number(item.distanceKm || 0).toFixed(1)} km · approx. {item.estimatedMinutes} min</p></div>
        </div>
        <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Pickup</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.pickupName}</p><p className="text-xs text-slate-500">{item.pickupAddress}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Destination</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.destinationName}</p><p className="text-xs text-slate-500">{item.destinationAddress}</p></div></div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 size={14}/> {item.mode === 'schedule' ? 'Scheduled' : 'Instant'}</span><span>Offers: {item._count?.offers || 0}</span>{item.manuallyAssignedAt && <span className="font-bold text-violet-700">Manually assigned · {dateTime(item.manuallyAssignedAt)}</span>}{item.completedAt && <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={14}/> Completed {dateTime(item.completedAt)}</span>}{item.cancelledAt && <span className="inline-flex items-center gap-1 text-rose-700"><XCircle size={14}/> Cancelled {dateTime(item.cancelledAt)}</span>}</div>
        {item.status === 'REQUESTED' && item.mode === 'instant' && <div className="mt-4 border-t border-slate-100 pt-4"><button onClick={() => openAssignment(item)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-wayz-blue px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"><UserCheck size={17}/> Assign Driver Manually</button><p className="mt-2 text-xs text-slate-500">Only approved, online drivers with recent GPS, no active ride and eligible wallet balance can be assigned.</p></div>}
      </article>)}</div>}
    {assignBooking && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="assign-driver-title">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white p-5">
          <div><p className="text-xs font-bold uppercase tracking-wider text-wayz-blue">Manual dispatch</p><h2 id="assign-driver-title" className="mt-1 text-xl font-black text-slate-900">Assign a driver</h2><p className="mt-1 text-sm text-slate-500">Booking {assignBooking.reference} · {assignBooking.pickupName}</p></div>
          <button onClick={() => setAssignBooking(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={20}/></button>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900">Eligible drivers must be approved and online, have GPS updated within 3 minutes, be within 8 km of pickup, have no active ride, and meet wallet minimum / commission requirements. The server rechecks all conditions when you confirm.</div>
          {assignError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{assignError}</p>}
          {assignLoading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin"/> Checking driver availability…</div> :
            eligibleDrivers.length ? <div className="space-y-2">{eligibleDrivers.map(driver => <button key={driver.id} onClick={() => setSelectedDriverId(driver.id)} className={'w-full rounded-xl border p-4 text-left transition ' + (selectedDriverId === driver.id ? 'border-wayz-blue bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300')}>
              <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-slate-900">{driver.name}</p><p className="mt-0.5 text-xs text-slate-500">{driver.phone} · {driver.vehicleNumber}</p></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{selectedDriverId === driver.id ? 'Selected' : 'Eligible'}</span></div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><MapPin size={13}/>{driver.distanceKm} km from pickup</span><span className="inline-flex items-center gap-1"><Wifi size={13}/> GPS {driver.locationAgeSeconds}s ago</span><span className="inline-flex items-center gap-1"><Wallet size={13}/> Wallet ₹{Number(driver.walletBalance || 0).toLocaleString('en-IN')}</span></div>
            </button>)}</div> : !assignError && <p className="py-8 text-center text-sm text-slate-500">No eligible drivers found.</p>}
          {unavailableDrivers.length > 0 && <details className="rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-bold text-slate-700">Unavailable drivers ({unavailableDrivers.length}) and reasons</summary><div className="mt-3 max-h-52 space-y-2 overflow-y-auto">{unavailableDrivers.map(driver => <div key={driver.id} className="rounded-lg bg-slate-50 p-3"><p className="text-sm font-bold text-slate-800">{driver.name} · {driver.vehicleNumber}</p><p className="mt-1 text-xs leading-5 text-slate-500">{driver.reasons.join(' · ')}</p></div>)}</div></details>}
        </div>
        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white p-4"><button onClick={() => setAssignBooking(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button><button disabled={!selectedDriverId || assigning || assignLoading} onClick={confirmAssignment} className="inline-flex items-center gap-2 rounded-xl bg-wayz-blue px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{assigning && <LoaderCircle size={16} className="animate-spin"/>}Confirm Assignment</button></div>
      </div>
    </div>}
    <div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-500">Page {pagination.page || page} of {pagination.totalPages || 1}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value-1))} className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold disabled:opacity-40">Previous</button><button disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage(value => value+1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold disabled:opacity-40">Next</button></div></div>
  </div>
}
