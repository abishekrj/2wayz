import { useEffect, useState } from 'react'
import { Search, RefreshCw, Ban } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const money = value => '₹' + Number(value || 0).toLocaleString('en-IN')
const dateText = value => value ? new Date(value).toLocaleString('en-IN') : '—'

export default function AdminCancellationsPage() {
  const [search, setSearch] = useState('')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(query = search) {
    setLoading(true); setError('')
    try { const result = await adminApi.adminCancellations(query); setBookings(result.bookings || []) }
    catch (err) { setError(err.message || 'Unable to load cancellation history.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load('') }, [])

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Booking management</p><h1 className="mt-2 text-3xl font-extrabold text-wayz-ink">Booking Cancellations</h1><p className="mt-2 text-sm text-slate-500">Review who cancelled, the reason, and the booking details. Financial adjustments are handled separately.</p></div>
      <button onClick={() => load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"><RefreshCw size={16}/> Refresh</button>
    </div>
    <form onSubmit={event => { event.preventDefault(); load(search) }} className="mt-6 flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search reference, passenger, or driver" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-wayz-blue"/></div>
      <button className="rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white">Search</button>
    </form>
    {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {loading ? <p className="p-10 text-center text-sm text-slate-500">Loading cancellation history…</p> : bookings.length === 0 ? <div className="p-12 text-center"><Ban size={30} className="mx-auto text-slate-300"/><p className="mt-3 font-bold text-slate-700">No cancelled bookings found</p><p className="mt-1 text-sm text-slate-500">Cancellations will appear here when a passenger or driver cancels a ride.</p></div> :
        <div className="divide-y divide-slate-100">{bookings.map(item => <article key={item.id} className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-wayz-blue">{item.reference}</p><p className="mt-1 text-sm font-extrabold text-wayz-ink">{item.pickupName} → {item.destinationName}</p><p className="mt-1 text-xs text-slate-500">Cancelled: {dateText(item.cancelledAt)} · By: {item.cancelledBy || 'Unknown'}</p></div><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">CANCELLED</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passenger</p><p className="mt-1 text-sm font-semibold">{item.passenger?.name || '—'}</p><p className="text-xs text-slate-500">{item.passenger?.phone || '—'}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver</p><p className="mt-1 text-sm font-semibold">{item.driver?.name || 'Not assigned'}</p><p className="text-xs text-slate-500">{item.driver?.phone || item.driver?.vehicleNumber || '—'}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estimated fare</p><p className="mt-1 text-sm font-bold">{money(item.estimatedFare)}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason</p><p className="mt-1 text-sm text-slate-700">{item.cancellationReason || 'No reason recorded'}</p></div></div>
        </article>)}</div>}
    </div>
    <p className="mt-3 text-xs text-slate-500">Showing up to 200 most recent cancellations. No automatic fee, wallet deduction, or passenger refund is applied in this view.</p>
  </div>
}
