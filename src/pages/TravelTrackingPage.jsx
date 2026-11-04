import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CarFront, CheckCircle2, Clock3, MapPin, Route as RouteIcon, ShieldCheck, Users, RefreshCw } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import RouteMap from '../components/RouteMap'
import { useBooking } from '../context/BookingContext'
import { adminApi } from '../lib/adminApi'

const statusLabels = {
  REQUESTED: 'Finding a nearby driver',
  DRIVER_ASSIGNED: 'Driver accepted your ride',
  DRIVER_ARRIVED: 'Driver arrived at pickup',
  IN_PROGRESS: 'Trip in progress',
  COMPLETED: 'Trip completed',
  CANCELLED: 'Booking cancelled',
  CANCELED: 'Booking cancelled'
}

export default function TravelTrackingPage() {
  const navigate = useNavigate()
  const { booking, setBooking } = useBooking()
  const [serverBooking, setServerBooking] = useState(booking?.serverBooking || null)
  const [refreshing, setRefreshing] = useState(false)
  const [trackingError, setTrackingError] = useState('')
  const [cancelReason, setCancelReason] = useState('CHANGE_OF_PLANS')
  const [cancelDetails, setCancelDetails] = useState('')
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!booking?.bookingId) return
    let active = true
    const load = async () => {
      try {
        const result = await adminApi.booking(booking.bookingId)
        if (!active) return
        setServerBooking(result.booking)
        setBooking(current => current ? ({ ...current, serverBooking: result.booking, bookingStatus: result.booking.status, reference: result.booking.reference }) : current)
        setTrackingError('')
      } catch (error) {
        if (active) setTrackingError(error.message || 'Unable to refresh booking status.')
      }
    }
    load()
    const timer = window.setInterval(load, 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [booking?.bookingId, setBooking])

  if (!booking?.estimate) return <PageLayout><div className="mx-auto max-w-3xl px-5 py-20 text-center"><h1 className="text-2xl font-extrabold text-wayz-ink">Travel details are not available</h1><p className="mt-2 text-sm text-slate-500">Start a new trip to view its details here.</p><button onClick={() => navigate('/')} className="mt-6 rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white">Book an auto</button></div></PageLayout>

  const { pickup, destination, estimate } = booking
  const status = serverBooking?.status || booking.bookingStatus || 'REQUESTED'
  const driver = serverBooking?.driver || null
  const liveDriverLocation = driver?.locationIsFresh && Number.isFinite(Number(driver.currentLat)) && Number.isFinite(Number(driver.currentLng)) ? { lat: Number(driver.currentLat), lng: Number(driver.currentLng) } : null

  async function cancelBooking() {
    if (!booking?.bookingId || !window.confirm('Cancel this booking? This action will be recorded for Super Admin review.')) return
    setCancelling(true); setTrackingError('')
    try {
      const result = await adminApi.cancelPassengerBooking(booking.bookingId, cancelReason, cancelDetails)
      setServerBooking(current => ({ ...(current || {}), ...(result.booking || {}) }))
      setBooking(current => current ? ({ ...current, bookingStatus: 'CANCELLED', serverBooking: { ...(current.serverBooking || {}), ...(result.booking || {}) } }) : current)
      setCancelDetails('')
    } catch (error) { setTrackingError(error.message || 'Unable to cancel booking.') }
    finally { setCancelling(false) }
  }

  async function refreshNow() {
    if (!booking.bookingId) return
    setRefreshing(true)
    try { const result = await adminApi.booking(booking.bookingId); setServerBooking(result.booking); setTrackingError('') }
    catch (error) { setTrackingError(error.message || 'Unable to refresh booking status.') }
    finally { setRefreshing(false) }
  }

  return <PageLayout><div className="bg-wayz-mist/60"><div className="mx-auto max-w-7xl px-5 py-8 sm:py-10 lg:px-8">
    <button onClick={() => navigate('/')} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-wayz-blue"><ArrowLeft size={17}/> Home</button>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Your journey</p><h1 className="mt-2 text-3xl font-extrabold text-wayz-ink sm:text-4xl">Travel tracking</h1><p className="mt-2 text-sm text-slate-500">Booking status refreshes automatically while this page is open.</p></div>{booking.bookingId && <button onClick={refreshNow} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''}/> Refresh status</button>}</div>
    {trackingError && <p role="alert" className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{trackingError}</p>}
    <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]"><div className="space-y-5">
      {['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED'].includes(status) && <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-base font-extrabold text-wayz-ink">Cancel this booking</h2><p className="mt-1 text-sm text-slate-500">You can cancel before the trip starts. The cancellation reason will be recorded. No automatic fee or refund is applied.</p><label className="mt-4 block text-xs font-bold text-slate-600">REASON<select value={cancelReason} onChange={event => setCancelReason(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="CHANGE_OF_PLANS">Change of plans</option><option value="WRONG_PICKUP">Wrong pickup location</option><option value="WRONG_DESTINATION">Wrong destination</option><option value="DRIVER_UNAVAILABLE">Driver unavailable</option><option value="OTHER">Other</option></select></label><label className="mt-3 block text-xs font-bold text-slate-600">ADDITIONAL DETAILS (OPTIONAL)<input value={cancelDetails} onChange={event => setCancelDetails(event.target.value)} maxLength={500} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" placeholder="Add a short explanation"/></label><button disabled={cancelling} onClick={cancelBooking} className="mt-4 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{cancelling ? 'Cancelling…' : 'Cancel booking'}</button></section>}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={23}/></span><div><p className="text-lg font-extrabold text-wayz-ink">Ride request submitted</p><p className="mt-1 text-sm text-slate-500">Reference: <span className="font-bold text-wayz-ink">{serverBooking?.reference || booking.reference || 'Not generated'}</span></p></div></div>
        <div className={'mt-5 rounded-xl p-4 ' + (driver ? 'bg-emerald-50' : 'bg-amber-50')}><p className={'text-sm font-bold ' + (driver ? 'text-emerald-900' : 'text-amber-900')}>{statusLabels[status] || status.replaceAll('_', ' ')}</p><p className={'mt-1 text-xs leading-5 ' + (driver ? 'text-emerald-800' : 'text-amber-800')}>{driver ? 'Your driver has accepted the request. Their location is updated automatically while they are online and sharing GPS.' : (booking.dispatchMessage || 'Your request is saved. The system is waiting for an eligible online driver to accept it.')}</p></div>
      </section>
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-extrabold text-wayz-ink">Travel details</h2><div className="mt-4 space-y-4"><div className="flex gap-3"><MapPin className="mt-1 shrink-0 text-emerald-600" size={19}/><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup</p><p className="mt-1 text-sm font-bold text-wayz-ink">{pickup.name}</p><p className="text-xs text-slate-500">{pickup.address || ''}</p></div></div><div className="flex gap-3"><MapPin className="mt-1 shrink-0 text-rose-500" size={19}/><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</p><p className="mt-1 text-sm font-bold text-wayz-ink">{destination.name}</p><p className="text-xs text-slate-500">{destination.address || ''}</p></div></div></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-wayz-mist/70 p-3"><RouteIcon size={17} className="text-wayz-blue"/><p className="mt-2 text-lg font-extrabold text-wayz-ink">{estimate.km.toFixed(1)} km</p><p className="text-xs text-slate-500">Distance</p></div><div className="rounded-xl bg-wayz-mist/70 p-3"><Clock3 size={17} className="text-wayz-blue"/><p className="mt-2 text-lg font-extrabold text-wayz-ink">{estimate.durationMinutes} min</p><p className="text-xs text-slate-500">Estimated travel time</p></div></div></section>
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-extrabold text-wayz-ink">Assigned driver</h2>{driver ? <div className="mt-4 flex items-center gap-4 rounded-xl bg-emerald-50 p-4"><span className="flex h-14 w-16 items-center justify-center rounded-xl bg-wayz-yellow/40 text-wayz-navy"><CarFront size={34}/></span><div className="min-w-0 flex-1"><p className="font-extrabold text-wayz-ink">{driver.name}</p><p className="mt-1 text-sm text-slate-600">{driver.phone}</p><p className="mt-1 text-xs font-semibold text-emerald-700">Vehicle: {driver.vehicleNumber}</p><p className="mt-1 text-xs text-slate-500">{liveDriverLocation ? "Live location updating" : "Waiting for the driver’s next GPS update"}</p></div></div> : <div className="mt-4 flex items-center gap-4 rounded-xl bg-wayz-mist/60 p-4"><span className="flex h-14 w-16 items-center justify-center rounded-xl bg-wayz-yellow/30 text-wayz-navy"><CarFront size={34}/></span><div className="flex-1"><p className="font-extrabold text-wayz-ink">Auto rickshaw</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Users size={13}/> Up to 3 passengers</p><p className="mt-1 text-xs font-semibold text-amber-700">Waiting for a driver</p></div></div>}</section>
      {driver && !liveDriverLocation && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">The driver’s latest GPS update is unavailable or older than 60 seconds. The map will show their position again when a fresh update arrives.</p>}
    </div><aside className="space-y-5"><section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="px-1 pb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Route map</p><RouteMap route={estimate.route} driverLocation={liveDriverLocation}/></section><section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{status === "COMPLETED" ? "Final fare" : "Fare estimate"}</p><p className="mt-2 text-4xl font-black text-wayz-blue">₹{status === "COMPLETED" ? (serverBooking?.finalFare ?? serverBooking?.estimatedFare ?? estimate.fare) : (serverBooking?.estimatedFare ?? estimate.fare)}</p><p className="mt-1 text-xs text-slate-500">{status === "COMPLETED" ? "Trip completed · final fare recorded" : "Indicative fare · final fare may vary"}</p><div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={16} className="text-emerald-600"/>{status === "COMPLETED" ? "Please settle the fare directly with your driver." : "No payment has been collected."}</div></section><button onClick={() => navigate('/')} className="w-full rounded-xl bg-wayz-blue px-5 py-4 text-sm font-bold text-white transition hover:bg-wayz-navy">Plan another ride</button></aside></div>
  </div></div></PageLayout>
}
