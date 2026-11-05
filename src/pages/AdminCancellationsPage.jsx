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
  const [adjustments, setAdjustments] = useState({})
  const [savingAdjustment, setSavingAdjustment] = useState('')

  async function load(query = search) {
    setLoading(true); setError('')
    try { const result = await adminApi.adminCancellations(query); setBookings(result.bookings || []) }
    catch (err) { setError(err.message || 'Unable to load cancellation history.') }
    finally { setLoading(false) }
  }

  function updateAdjustment(bookingId, field, value) {
    setAdjustments(current => ({ ...current, [bookingId]: { type: 'WALLET_CREDIT', amount: '', reason: '', ...(current[bookingId] || {}), [field]: value } }))
  }

  async function submitAdjustment(event, booking) {
    event.preventDefault()
    const form = adjustments[booking.id] || { type: 'WALLET_CREDIT', amount: '', reason: '' }
    setSavingAdjustment(booking.id); setError('')
    try {
      const result = await adminApi.createBookingAdjustment({ bookingId: booking.id, type: form.type, amount: Number(form.amount), reason: form.reason })
      setAdjustments(current => ({ ...current, [booking.id]: { type: 'WALLET_CREDIT', amount: '', reason: '' } }))
      await load(search)
      window.alert(result.message || 'Wallet adjustment saved.')
    } catch (err) { setError(err.message || 'Unable to apply wallet adjustment.') }
    finally { setSavingAdjustment('') }
  }

  useEffect(() => { load('') }, [])

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Booking management</p><h1 className="mt-2 text-3xl font-bold text-wayz-ink">Booking Cancellations</h1><p className="mt-2 text-sm text-slate-500">Review who cancelled, the reason, and the booking details. Financial adjustments are handled separately.</p></div>
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
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-wayz-blue">{item.reference}</p><p className="mt-1 text-sm font-bold text-wayz-ink">{item.pickupName} → {item.destinationName}</p><p className="mt-1 text-xs text-slate-500">Cancelled: {dateText(item.cancelledAt)} · By: {item.cancelledBy || 'Unknown'}</p></div><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">CANCELLED</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passenger</p><p className="mt-1 text-sm font-semibold">{item.passenger?.name || '—'}</p><p className="text-xs text-slate-500">{item.passenger?.phone || '—'}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver</p><p className="mt-1 text-sm font-semibold">{item.driver?.name || 'Not assigned'}</p><p className="text-xs text-slate-500">{item.driver?.phone || item.driver?.vehicleNumber || '—'}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estimated fare</p><p className="mt-1 text-sm font-bold">{money(item.estimatedFare)}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason</p><p className="mt-1 text-sm text-slate-700">{item.cancellationReason || 'No reason recorded'}</p></div></div>
          {item.driver && <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold text-wayz-ink">Stage 9B · Driver wallet adjustment</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Use only when a manual adjustment is justified. This changes the assigned driver’s 2WAYZ wallet; it does not charge the passenger or issue a cash/UPI refund.</p>
            {item.financialAdjustments?.length > 0 && <div className="mt-3 space-y-2">{item.financialAdjustments.map(adj => <div key={adj.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-white p-3 text-xs"><span>{adj.type.replaceAll('_', ' ')} · {adj.reason}</span><strong>{adj.type === 'WALLET_DEBIT' ? '−' : '+'}{money(adj.amount)}</strong></div>)}</div>}
            <form onSubmit={event => submitAdjustment(event, item)} className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-bold text-slate-600">ADJUSTMENT TYPE<select value={(adjustments[item.id]?.type) || 'WALLET_CREDIT'} onChange={event => updateAdjustment(item.id, 'type', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm"><option value="WALLET_CREDIT">Credit driver wallet</option><option value="WALLET_DEBIT">Debit driver wallet</option></select></label>
              <label className="text-xs font-bold text-slate-600">AMOUNT (₹)<input required type="number" min="1" max="50000" step="1" value={adjustments[item.id]?.amount || ''} onChange={event => updateAdjustment(item.id, 'amount', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm" placeholder="Amount"/></label>
              <label className="text-xs font-bold text-slate-600">REASON<input required minLength="5" maxLength="500" value={adjustments[item.id]?.reason || ''} onChange={event => updateAdjustment(item.id, 'reason', event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm" placeholder="Reason for audit"/></label>
              <div className="sm:col-span-3"><button disabled={savingAdjustment === item.id} className="rounded-lg bg-wayz-blue px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{savingAdjustment === item.id ? 'Saving…' : 'Apply wallet adjustment'}</button></div>
            </form>
          </section>}
        </article>)}</div>}
    </div>
    <p className="mt-3 text-xs text-slate-500">Showing up to 200 most recent cancellations. No automatic fee, wallet deduction, or passenger refund is applied in this view.</p>
  </div>
}
