import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CarFront, MapPin, RefreshCw } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import { adminApi } from '../lib/adminApi'

const statusLabel = status => ({
  REQUESTED: 'Finding driver',
  DRIVER_ASSIGNED: 'Driver accepted',
  DRIVER_ARRIVED: 'Driver arrived',
  IN_PROGRESS: 'Trip in progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
}[status] || String(status || '').replaceAll('_', ' '))

export default function MyBookingsPage() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelReasons, setCancelReasons] = useState({})
  const [cancelDetails, setCancelDetails] = useState({})
  const [cancellingId, setCancellingId] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await adminApi.passengerBookings()
      setBookings(result.bookings || [])
    } catch (err) {
      setError(err.message || 'Could not load your bookings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function cancelRide(item) {
    const reason = cancelReasons[item.id] || 'CHANGE_OF_PLANS'
    if (!window.confirm(`Cancel ride ${item.reference}? This cannot be undone.`)) return
    setCancellingId(item.id)
    setActionMessage('')
    setError('')
    try {
      await adminApi.cancelPassengerBooking(item.id, reason, cancelDetails[item.id] || '')
      setBookings(current => current.map(ride => ride.id === item.id ? { ...ride, status: 'CANCELLED', cancelledBy: 'PASSENGER', cancellationReason: reason + (cancelDetails[item.id] ? ': ' + cancelDetails[item.id] : ''), cancelledAt: new Date().toISOString() } : ride))
      setActionMessage(`Ride ${item.reference} has been cancelled successfully.`)
    } catch (err) {
      setError(err.message || `Unable to cancel ride ${item.reference}.`)
    } finally {
      setCancellingId('')
    }
  }

  return <PageLayout>
    <div className="min-h-[70vh] bg-wayz-mist/50">
      <div className="mx-auto max-w-4xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Your account</p><h1 className="mt-2 text-3xl font-extrabold text-wayz-ink">My bookings</h1><p className="mt-2 text-sm text-slate-500">View your rides and final fares. Cancelled rides remain visible for 14 days; older cancellations are hidden from this list.</p></div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"><RefreshCw size={16}/> Refresh</button>
        </div>
        {actionMessage && <div role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{actionMessage}</div>}
        {error && <div role="alert" className="mt-6 rounded-xl bg-amber-50 p-5 text-sm text-amber-800"><p>{error}</p><button onClick={() => navigate('/login')} className="mt-3 font-bold underline">Sign in to view bookings</button></div>}
        {loading ? <p className="py-16 text-center text-sm text-slate-500">Loading your bookings…</p>
          : !error && bookings.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><CarFront className="mx-auto text-slate-400" size={34}/><p className="mt-3 font-bold text-slate-700">No bookings yet</p><p className="mt-1 text-sm text-slate-500">Your rides will appear here after you book an auto.</p><button onClick={() => navigate('/')} className="mt-5 rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white">Book an auto</button></div>
          : <div className="mt-7 space-y-4">{bookings.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-wayz-blue">{item.reference}</p><p className="mt-1 text-xs text-slate-400"><CalendarDays size={13} className="mr-1 inline"/> {new Date(item.createdAt).toLocaleString('en-IN')}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{statusLabel(item.status)}</span></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="flex gap-2"><MapPin size={17} className="mt-0.5 shrink-0 text-emerald-600"/><div><p className="text-[10px] font-bold uppercase text-slate-400">Pickup</p><p className="text-sm font-semibold text-wayz-ink">{item.pickupName}</p></div></div><div className="flex gap-2"><MapPin size={17} className="mt-0.5 shrink-0 text-rose-500"/><div><p className="text-[10px] font-bold uppercase text-slate-400">Destination</p><p className="text-sm font-semibold text-wayz-ink">{item.destinationName}</p></div></div></div>
              {item.status === 'DRIVER_ARRIVED' && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-extrabold text-amber-950">Share your ride-start OTP with the arrived driver</p>{item.rideStartOtp ? <p className="mt-2 text-center text-3xl font-black tracking-[.4em] text-wayz-blue">{item.rideStartOtp}</p> : <p className="mt-2 text-xs text-amber-800">OTP is being prepared. Refresh your bookings in a moment.</p>}</div>}{item.status === 'CANCELLED' && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800"><p><strong>Cancelled by:</strong> {item.cancelledBy || 'Unknown'}</p><p className="mt-1"><strong>Reason:</strong> {item.cancellationReason || 'Not provided'}</p></div>}
              {['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED'].includes(item.status) && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4"><p className="text-sm font-extrabold text-wayz-ink">Cancel this ride</p><p className="mt-1 text-xs leading-5 text-slate-600">You can cancel this booking individually. This will release your active booking restriction.</p><label className="mt-3 block text-xs font-bold text-slate-600">CANCELLATION REASON<select value={cancelReasons[item.id] || 'CHANGE_OF_PLANS'} onChange={event => setCancelReasons(current => ({ ...current, [item.id]: event.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="CHANGE_OF_PLANS">Change of plans</option><option value="WRONG_PICKUP">Wrong pickup location</option><option value="WRONG_DESTINATION">Wrong destination</option><option value="DRIVER_UNAVAILABLE">Driver unavailable</option><option value="VEHICLE_ISSUE">Vehicle issue</option><option value="OTHER">Other</option></select></label><label className="mt-3 block text-xs font-bold text-slate-600">ADDITIONAL DETAILS (OPTIONAL)<input value={cancelDetails[item.id] || ''} onChange={event => setCancelDetails(current => ({ ...current, [item.id]: event.target.value }))} maxLength={500} placeholder="Add a short explanation" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"/></label><button type="button" disabled={cancellingId === item.id} onClick={() => cancelRide(item)} className="mt-3 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{cancellingId === item.id ? 'Cancelling…' : 'Cancel this ride'}</button></div>}
              {item.status === 'IN_PROGRESS' && <p className="mt-4 rounded-lg bg-slate-100 p-3 text-xs leading-5 text-slate-600">This trip has already started. Passenger cancellation is not available while the ride is in progress.</p>}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4"><p className="text-xs text-slate-500">{item.status === 'COMPLETED' ? 'Final fare' : 'Estimated fare'}</p><p className="text-lg font-extrabold text-wayz-blue">₹{item.status === 'COMPLETED' ? (item.finalFare ?? item.estimatedFare) : item.estimatedFare}</p></div>
            </article>)}</div>}
      </div>
    </div>
  </PageLayout>
}
