import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CarFront, MapPin, RefreshCw, Star, ArrowRight, LoaderCircle } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import { adminApi } from '../lib/adminApi'
import { useBooking } from '../context/BookingContext'

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
  const { setBooking } = useBooking()
  const [bookings, setBookings] = useState([])
  const [activeTab, setActiveTab] = useState('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelReasons, setCancelReasons] = useState({})
  const [cancelDetails, setCancelDetails] = useState({})
  const [cancellingId, setCancellingId] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [reviewStars, setReviewStars] = useState({})
  const [reviewTags, setReviewTags] = useState({})
  const [reviewComments, setReviewComments] = useState({})
  const [reviewingId, setReviewingId] = useState('')
  const [openingRideId, setOpeningRideId] = useState('')

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

  const activeBookings = bookings.filter(item => ['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(item.status))
  const pastBookings = bookings.filter(item => !['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(item.status))
  const visibleBookings = activeTab === 'active' ? activeBookings : pastBookings

  async function openRide(item) {
    if (openingRideId) return
    setOpeningRideId(item.id)
    setError('')
    try {
      const result = await adminApi.booking(item.id)
      const ride = result.booking
      if (!ride) throw new Error('Ride details could not be found.')
      const pickup = {
        name: ride.pickupName || item.pickupName,
        address: ride.pickupAddress || ride.pickupName || item.pickupName,
        lat: ride.pickupLat == null ? null : Number(ride.pickupLat),
        lng: ride.pickupLng == null ? null : Number(ride.pickupLng)
      }
      const destination = {
        name: ride.destinationName || item.destinationName,
        address: ride.destinationAddress || ride.destinationName || item.destinationName,
        lat: ride.destinationLat == null ? null : Number(ride.destinationLat),
        lng: ride.destinationLng == null ? null : Number(ride.destinationLng)
      }
      setBooking({
        mode: ride.mode || 'instant',
        vehicle: 'auto',
        pickup,
        destination,
        estimate: {
          km: Number(ride.distanceKm || 0),
          durationMinutes: Number(ride.estimatedMinutes || 0),
          fare: Number(ride.estimatedFare || item.estimatedFare || 0),
          route: null
        },
        bookingId: ride.id,
        bookingStatus: ride.status,
        reference: ride.reference,
        serverBooking: ride
      })
      navigate('/travel-tracking')
    } catch (err) {
      setError(err.message || 'Could not open this ride. Please try again.')
    } finally {
      setOpeningRideId('')
    }
  }

  async function submitReview(item) {
    setError(''); setActionMessage(''); setReviewingId(item.id)
    try {
      const result = await adminApi.submitRideRating(item.id, { stars: reviewStars[item.id] || 5, tags: reviewTags[item.id] || [], comment: reviewComments[item.id] || '' })
      setBookings(current => current.map(ride => ride.id === item.id ? { ...ride, rating: result.rating } : ride))
      setActionMessage(result.message || 'Thank you for your feedback.')
    } catch (err) { setError(err.message || 'Could not submit your rating.') }
    finally { setReviewingId('') }
  }

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
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Your account</p><h1 className="mt-2 text-3xl font-bold text-wayz-ink">My bookings</h1><p className="mt-2 text-sm text-slate-500">View your rides and final fares. Cancelled rides remain visible for 14 days; older cancellations are hidden from this list.</p></div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"><RefreshCw size={16}/> Refresh</button>
        </div>
        {actionMessage && <div role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{actionMessage}</div>}
        {error && <div role="alert" className="mt-6 rounded-xl bg-amber-50 p-5 text-sm text-amber-800"><p>{error}</p><button onClick={() => navigate('/login')} className="mt-3 font-bold underline">Sign in to view bookings</button></div>}
        {loading ? <p className="py-16 text-center text-sm text-slate-500">Loading your bookings…</p>
          : !error && bookings.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><CarFront className="mx-auto text-slate-400" size={34}/><p className="mt-3 font-bold text-slate-700">No bookings yet</p><p className="mt-1 text-sm text-slate-500">Your rides will appear here after you book an auto.</p><button onClick={() => navigate('/')} className="mt-5 rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white">Book an auto</button></div>
          : <div className="mt-7"><div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5" role="tablist" aria-label="Booking categories"><button type="button" role="tab" aria-selected={activeTab === 'active'} onClick={() => setActiveTab('active')} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${activeTab === 'active' ? 'bg-white text-wayz-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Active rides <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{activeBookings.length}</span></button><button type="button" role="tab" aria-selected={activeTab === 'past'} onClick={() => setActiveTab('past')} className={`rounded-xl px-3 py-3 text-sm font-bold transition ${activeTab === 'past' ? 'bg-white text-wayz-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Past rides <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{pastBookings.length}</span></button></div>{visibleBookings.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center"><CarFront className="mx-auto text-slate-400" size={30}/><p className="mt-3 font-bold text-slate-700">{activeTab === 'active' ? 'No active rides' : 'No past rides yet'}</p><p className="mt-1 text-sm text-slate-500">{activeTab === 'active' ? 'Your ongoing rides will appear here.' : 'Completed and cancelled rides will appear here.'}</p>{activeTab === 'active' && <button onClick={() => navigate('/')} className="mt-4 rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white">Book an auto</button>}</div> : <div className="mt-4 space-y-4">{visibleBookings.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-wayz-blue">{item.reference}</p><p className="mt-1 text-xs text-slate-400"><CalendarDays size={13} className="mr-1 inline"/> {new Date(item.createdAt).toLocaleString('en-IN')}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{statusLabel(item.status)}</span></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="flex gap-2"><MapPin size={17} className="mt-0.5 shrink-0 text-emerald-600"/><div><p className="text-[10px] font-bold uppercase text-slate-400">Pickup</p><p className="text-sm font-semibold text-wayz-ink">{item.pickupName}</p></div></div><div className="flex gap-2"><MapPin size={17} className="mt-0.5 shrink-0 text-rose-500"/><div><p className="text-[10px] font-bold uppercase text-slate-400">Destination</p><p className="text-sm font-semibold text-wayz-ink">{item.destinationName}</p></div></div></div>
              {item.status === 'DRIVER_ARRIVED' && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-bold text-amber-950">Share your ride-start OTP with the arrived driver</p>{item.rideStartOtp ? <p className="mt-2 text-center text-3xl font-black tracking-[.4em] text-wayz-blue">{item.rideStartOtp}</p> : <p className="mt-2 text-xs text-amber-800">OTP is being prepared. Refresh your bookings in a moment.</p>}</div>}{item.status === 'COMPLETED' && !item.rating && <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-sm font-bold text-wayz-ink">Rate your ride</p><p className="mt-1 text-xs text-slate-600">{item.driver?.name ? `How was your ride with ${item.driver.name}?` : 'How was your ride?'}</p>
                <div className="mt-3 flex items-center gap-1" role="group" aria-label="Choose a star rating">{[1,2,3,4,5].map(star => <button key={star} type="button" onClick={() => setReviewStars(current => ({ ...current, [item.id]: star }))} aria-label={`${star} star`} className="rounded-md p-1"><Star size={27} className={(reviewStars[item.id] || 5) >= star ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}/></button>)}<span className="ml-2 text-xs font-semibold text-slate-600">{reviewStars[item.id] || 5}/5</span></div>
                <div className="mt-3 flex flex-wrap gap-2">{['Friendly driver','Clean auto','Safe driving','On-time arrival','Good communication'].map(tag => { const selected = (reviewTags[item.id] || []).includes(tag); return <button key={tag} type="button" onClick={() => setReviewTags(current => ({ ...current, [item.id]: selected ? (current[item.id] || []).filter(value => value !== tag) : [...(current[item.id] || []), tag] }))} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selected ? 'border-wayz-blue bg-blue-50 text-wayz-blue' : 'border-slate-200 bg-white text-slate-600'}`}>{tag}</button> })}</div>
                <textarea value={reviewComments[item.id] || ''} onChange={event => setReviewComments(current => ({ ...current, [item.id]: event.target.value }))} maxLength={1000} rows={3} placeholder="Share a few words about your ride (optional)" className="mt-3 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-wayz-blue"/>
                <button type="button" disabled={reviewingId === item.id} onClick={() => submitReview(item)} className="mt-3 rounded-lg bg-wayz-blue px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{reviewingId === item.id ? 'Submitting…' : 'Submit rating'}</button>
              </section>}
              {item.status === 'COMPLETED' && item.rating && <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-sm font-bold text-emerald-900">Your rating: {'★'.repeat(item.rating.stars)}{'☆'.repeat(5-item.rating.stars)}</p><p className="mt-1 text-xs text-emerald-800">{item.rating.isVisible ? 'Thank you for your feedback.' : 'Your feedback was received and is currently hidden from public display.'}</p>{item.rating.comment && <p className="mt-2 text-sm text-slate-700">{item.rating.comment}</p>}</div>}
              {item.status === 'CANCELLED' && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800"><p><strong>Cancelled by:</strong> {item.cancelledBy || 'Unknown'}</p><p className="mt-1"><strong>Reason:</strong> {item.cancellationReason || 'Not provided'}</p></div>}
              {['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED'].includes(item.status) && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4"><p className="text-sm font-bold text-wayz-ink">Cancel this ride</p><p className="mt-1 text-xs leading-5 text-slate-600">You can cancel this booking individually. This will release your active booking restriction.</p><label className="mt-3 block text-xs font-bold text-slate-600">CANCELLATION REASON<select value={cancelReasons[item.id] || 'CHANGE_OF_PLANS'} onChange={event => setCancelReasons(current => ({ ...current, [item.id]: event.target.value }))} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="CHANGE_OF_PLANS">Change of plans</option><option value="WRONG_PICKUP">Wrong pickup location</option><option value="WRONG_DESTINATION">Wrong destination</option><option value="DRIVER_UNAVAILABLE">Driver unavailable</option><option value="VEHICLE_ISSUE">Vehicle issue</option><option value="OTHER">Other</option></select></label><label className="mt-3 block text-xs font-bold text-slate-600">ADDITIONAL DETAILS (OPTIONAL)<input value={cancelDetails[item.id] || ''} onChange={event => setCancelDetails(current => ({ ...current, [item.id]: event.target.value }))} maxLength={500} placeholder="Add a short explanation" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"/></label><button type="button" disabled={cancellingId === item.id} onClick={() => cancelRide(item)} className="mt-3 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{cancellingId === item.id ? 'Cancelling…' : 'Cancel this ride'}</button></div>}
              {item.status === 'IN_PROGRESS' && <p className="mt-4 rounded-lg bg-slate-100 p-3 text-xs leading-5 text-slate-600">This trip has already started. Passenger cancellation is not available while the ride is in progress.</p>}
              <button type="button" disabled={openingRideId === item.id} onClick={() => openRide(item)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-wayz-blue px-4 py-3 text-sm font-bold text-white transition hover:bg-wayz-navy disabled:cursor-wait disabled:opacity-60">{openingRideId === item.id ? <><LoaderCircle size={16} className="animate-spin"/> Loading ride…</> : <>{['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(item.status) ? 'Track ride' : 'View ride details'} <ArrowRight size={16}/></>}</button>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4"><p className="text-xs text-slate-500">{item.status === 'COMPLETED' ? 'Final fare' : 'Estimated fare'}</p><p className="text-lg font-bold text-wayz-blue">₹{item.status === 'COMPLETED' ? (item.finalFare ?? item.estimatedFare) : item.estimatedFare}</p></div>
            </article>)}</div>}</div>}
      </div>
    </div>
  </PageLayout>
}
