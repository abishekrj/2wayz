import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CarFront, CheckCircle2, Clock3, MapPin, Route as RouteIcon, ShieldCheck, Users, RefreshCw, LoaderCircle, Search, Share2, Copy, XCircle } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import RouteMap from '../components/RouteMap'
import { useBooking } from '../context/BookingContext'
import { adminApi } from '../lib/adminApi'
import NotificationCenter from '../components/NotificationCenter'
import SosButton from '../components/SosButton'

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
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryMessage, setRetryMessage] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [shareBusy, setShareBusy] = useState(false)
  const [shareMessage, setShareMessage] = useState('')

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

  if (!booking?.estimate) return <PageLayout><div className="mx-auto max-w-3xl px-5 py-20 text-center"><h1 className="text-2xl font-bold text-wayz-ink">Travel details are not available</h1><p className="mt-2 text-sm text-slate-500">Start a new trip to view its details here.</p><button onClick={() => navigate('/')} className="mt-6 rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white">Book an auto</button></div></PageLayout>

  const { pickup, destination, estimate } = booking
  const status = serverBooking?.status || booking.bookingStatus || 'REQUESTED'
  const driver = serverBooking?.driver || null
  const liveDriverLocation = driver?.locationIsFresh && Number.isFinite(Number(driver.currentLat)) && Number.isFinite(Number(driver.currentLng)) ? { lat: Number(driver.currentLat), lng: Number(driver.currentLng) } : null

  async function cancelBooking() {
    if (!booking?.bookingId || cancelling) return
    setCancelling(true); setTrackingError('')
    try {
      const result = await adminApi.cancelPassengerBooking(booking.bookingId, cancelReason, cancelDetails)
      setServerBooking(current => ({ ...(current || {}), ...(result.booking || {}) }))
      setBooking(current => current ? ({ ...current, bookingStatus: 'CANCELLED', serverBooking: { ...(current.serverBooking || {}), ...(result.booking || {}) } }) : current)
      setCancelDetails('')
      setCancelModalOpen(false)
    } catch (error) { setTrackingError(error.message || 'Unable to cancel booking.') }
    finally { setCancelling(false) }
  }

  async function retryDriverSearch() {
    if (!booking?.bookingId || retrying) return
    setRetrying(true)
    setRetryMessage('')
    setTrackingError('')
    try {
      const result = await adminApi.retryPassengerBooking(booking.bookingId)
      setRetryMessage(result.message || 'Your request has been sent to nearby drivers again.')
      await refreshNow()
    } catch (error) {
      setRetryMessage(error.message || 'Unable to retry driver search. Please refresh and try again.')
    } finally {
      setRetrying(false)
    }
  }

  async function createTripShareLink() {
    if (!booking?.bookingId || shareBusy) return
    setShareBusy(true); setShareMessage('')
    try {
      const result = await adminApi.createTripShareLink(booking.bookingId)
      const url = `${window.location.origin}/shared-trip/${result.token}`
      setShareUrl(url)
      setShareMessage('Secure link created. Anyone with this link can view the active trip.')
    } catch (error) { setShareMessage(error.message || 'Unable to create a sharing link.') }
    finally { setShareBusy(false) }
  }

  async function copyTripShareLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareMessage('Trip link copied. You can now send it to family or friends.')
    } catch {
      window.prompt('Copy this trip sharing link:', shareUrl)
    }
  }

  async function shareTripLink() {
    if (!shareUrl) return
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My 2WAYZ live trip', text: 'Follow my live 2WAYZ ride:', url: shareUrl })
        setShareMessage('Trip sharing link is ready to send.')
        return
      } catch (error) {
        if (error.name === 'AbortError') return
      }
    }
    await copyTripShareLink()
  }

  async function stopTripSharing() {
    if (!booking?.bookingId || !window.confirm('Stop sharing this trip? Anyone with the existing link will lose access.')) return
    setShareBusy(true); setShareMessage('')
    try {
      await adminApi.revokeTripShareLink(booking.bookingId)
      setShareUrl('')
      setShareMessage('Trip sharing has been stopped. The old link no longer works.')
    } catch (error) { setShareMessage(error.message || 'Unable to stop trip sharing.') }
    finally { setShareBusy(false) }
  }

  async function refreshNow() {
    if (!booking.bookingId) return
    setRefreshing(true)
    try { const result = await adminApi.booking(booking.bookingId); setServerBooking(result.booking); setTrackingError('') }
    catch (error) { setTrackingError(error.message || 'Unable to refresh booking status.') }
    finally { setRefreshing(false) }
  }

  return <PageLayout><div className="bg-wayz-mist/60"><div className="mx-auto max-w-7xl px-5 py-8 sm:py-10 lg:px-8">
    <div className="mb-6 overflow-hidden rounded-3xl bg-wayz-navy text-white shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8 sm:py-8">
        <div><button onClick={() => navigate('/')} className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-white/70 transition hover:text-white"><ArrowLeft size={15}/> Home</button><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Your 2WAYZ journey</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Travel tracking</h1><p className="mt-2 max-w-xl text-sm text-white/70">Your ride status and driver updates, all in one place.</p></div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3"><span className={'h-2.5 w-2.5 rounded-full ' + (status === 'COMPLETED' ? 'bg-emerald-400' : ['CANCELLED','CANCELED'].includes(status) ? 'bg-rose-400' : 'animate-pulse bg-amber-300')}/><div><p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Current status</p><p className="mt-0.5 text-sm font-bold">{statusLabels[status] || status.replaceAll('_', ' ')}</p></div></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/10 px-5 py-3 text-xs sm:px-8"><span className="text-white/70">Booking reference <strong className="ml-1 text-white">{serverBooking?.reference || booking.reference || '—'}</strong></span><button onClick={refreshNow} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 font-semibold text-white transition hover:bg-white/20"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/> Refresh status</button></div>
    </div>
    {trackingError && <p role="alert" className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{trackingError}</p>}
    {['CANCELLED','CANCELED'].includes(status) ? <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><strong>This ride has been cancelled.</strong> You can now request another auto whenever you are ready.</div> : status !== 'COMPLETED' && <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><strong>One ride at a time:</strong> another booking will be available after this ride is completed or cancelled.</div>}
    <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Ride progress</p><h2 className="mt-1 text-base font-bold text-wayz-ink">{status === 'COMPLETED' ? 'You have reached your destination' : statusLabels[status] || 'Your ride status'}</h2></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Live updates · 5 sec</span></div>
      <div className="grid grid-cols-5 gap-1 sm:gap-3">{[{key:'REQUESTED',label:'Requested'},{key:'DRIVER_ASSIGNED',label:'Accepted'},{key:'DRIVER_ARRIVED',label:'Arrived'},{key:'IN_PROGRESS',label:'On trip'},{key:'COMPLETED',label:'Done'}].map((step,index)=>{const current=['REQUESTED','DRIVER_ASSIGNED','DRIVER_ARRIVED','IN_PROGRESS','COMPLETED'].indexOf(status);const done=current>=index;return <div key={step.key} className="text-center"><div className={'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ' + (done ? 'bg-wayz-blue text-white' : 'bg-slate-100 text-slate-400')}>{done ? '✓' : index+1}</div><p className={'mt-2 text-[10px] font-bold sm:text-xs ' + (done ? 'text-wayz-blue' : 'text-slate-400')}>{step.label}</p><div className={'mt-2 h-1 rounded-full ' + (done ? 'bg-wayz-blue' : 'bg-slate-100')}/></div>})}</div>
    </section>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]"><div className="space-y-5">
          {['DRIVER_ASSIGNED','DRIVER_ARRIVED','IN_PROGRESS'].includes(status) && <section className="mb-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-wayz-blue"><Share2 size={22}/></span><div><h2 className="font-bold text-wayz-ink">Share live trip with family</h2><p className="mt-1 text-xs text-slate-500">Let someone you trust follow your ride in real time.</p></div></div>
      <p className="mt-3 text-sm leading-6 text-slate-600">Create a private link to share your journey, ride status and the driver's latest available location. The link expires after 24 hours and stops working when the ride ends. Anyone with the link can view it, so share it only with people you trust.</p>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={createTripShareLink} disabled={shareBusy} className="inline-flex items-center gap-2 rounded-xl bg-wayz-blue px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{shareBusy ? <LoaderCircle size={16} className="animate-spin"/> : <Share2 size={16}/>} {shareUrl ? 'Generate a new link' : 'Create share link'}</button>{shareUrl && <button type="button" onClick={stopTripSharing} disabled={shareBusy} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-3 text-sm font-bold text-rose-700 disabled:opacity-60"><XCircle size={16}/> Stop sharing</button>}</div>
      {shareUrl && <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input readOnly value={shareUrl} aria-label="Trip sharing link" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600"/><div className="flex gap-2"><button type="button" onClick={shareTripLink} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-wayz-yellow px-4 py-3 text-sm font-bold text-wayz-ink"><Share2 size={16}/> Share</button><button type="button" onClick={copyTripShareLink} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"><Copy size={16}/> Copy</button></div></div>}
      {shareMessage && <p role="status" className="mt-3 text-xs font-semibold text-wayz-blue">{shareMessage}</p>}
    </section>}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3"><span className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-full ' + (driver ? 'bg-emerald-50 text-emerald-600' : status === 'REQUESTED' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600')}>{driver ? <CheckCircle2 size={23}/> : status === 'REQUESTED' ? <Search size={22}/> : <CheckCircle2 size={23}/>}</span><div><p className="text-lg font-bold text-wayz-ink">{status === 'REQUESTED' && !driver ? 'Finding your driver' : 'Ride request submitted'}</p><p className="mt-1 text-sm text-slate-500">Reference: <span className="font-bold text-wayz-ink">{serverBooking?.reference || booking.reference || 'Not generated'}</span></p></div></div>
        {status === 'REQUESTED' && !driver ? <div className="mt-5 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-amber-50 p-4 sm:p-5">
          <style>{`@keyframes twoWayzSearchSweep { 0% { transform: translateX(-110%); } 50% { transform: translateX(110%); } 100% { transform: translateX(320%); } }`}</style>
          <div className="flex items-center gap-3"><span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-wayz-blue text-white shadow-md"><span className="absolute inset-0 rounded-2xl bg-wayz-blue/20 animate-ping"/><CarFront size={26} className="relative animate-bounce"/></span><div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-wayz-navy sm:text-base">Finding your driver</p><p className="mt-1 text-xs text-slate-600">We’re checking for available autos near your pickup point.</p></div><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 animate-pulse"/></div>
          <div className="mt-5"><div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500"><span>Searching nearby drivers</span><span>Live</span></div><div className="relative h-2.5 overflow-hidden rounded-full bg-blue-100"><div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-wayz-blue via-blue-400 to-wayz-yellow shadow-sm" style={{ animation: 'twoWayzSearchSweep 2.2s ease-in-out infinite' }}/></div></div>
          <p className="mt-3 text-xs leading-5 text-slate-600">{retryMessage || booking.dispatchMessage || 'Your request is active. Nearby approved drivers who are online and eligible can accept it.'} We’ll update this page automatically every 5 seconds.</p>
          <button type="button" onClick={retryDriverSearch} disabled={retrying} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-wayz-blue px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-wayz-navy disabled:cursor-not-allowed disabled:opacity-60">{retrying ? <><LoaderCircle size={16} className="animate-spin"/> Searching again…</> : <><RefreshCw size={16}/> Search again</>}</button>
        </div> : <div className={'mt-5 rounded-xl p-4 ' + (driver ? 'bg-emerald-50' : 'bg-slate-100')}><p className={'text-sm font-bold ' + (driver ? 'text-emerald-900' : 'text-slate-800')}>{statusLabels[status] || status.replaceAll('_', ' ')}</p><p className={'mt-1 text-xs leading-5 ' + (driver ? 'text-emerald-800' : 'text-slate-600')}>{driver ? 'Your driver has accepted the request. Their location is updated automatically while they are online and sharing GPS.' : (booking.dispatchMessage || 'Your booking status is updated.')}</p></div>}
      </section>
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-wayz-ink">Travel details</h2><div className="mt-4 space-y-4"><div className="flex gap-3"><MapPin className="mt-1 shrink-0 text-emerald-600" size={19}/><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup</p><p className="mt-1 text-sm font-bold text-wayz-ink">{pickup.name}</p><p className="text-xs text-slate-500">{pickup.address || ''}</p></div></div><div className="flex gap-3"><MapPin className="mt-1 shrink-0 text-rose-500" size={19}/><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</p><p className="mt-1 text-sm font-bold text-wayz-ink">{destination.name}</p><p className="text-xs text-slate-500">{destination.address || ''}</p></div></div></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-wayz-mist/70 p-3"><RouteIcon size={17} className="text-wayz-blue"/><p className="mt-2 text-lg font-bold text-wayz-ink">{estimate.km.toFixed(1)} km</p><p className="text-xs text-slate-500">Distance</p></div><div className="rounded-xl bg-wayz-mist/70 p-3"><Clock3 size={17} className="text-wayz-blue"/><p className="mt-2 text-lg font-bold text-wayz-ink">{estimate.durationMinutes} min</p><p className="text-xs text-slate-500">Estimated travel time</p></div></div></section>
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-wayz-ink">Assigned driver</h2>{driver ? <div className="mt-4 flex items-center gap-4 rounded-xl bg-emerald-50 p-4"><span className="flex h-14 w-16 items-center justify-center rounded-xl bg-wayz-yellow/40 text-wayz-navy"><CarFront size={34}/></span><div className="min-w-0 flex-1"><p className="font-bold text-wayz-ink">{driver.name}</p><p className="mt-1 text-sm text-slate-600">{driver.phone}</p><p className="mt-1 text-xs font-semibold text-emerald-700">Vehicle: {driver.vehicleNumber}</p><p className="mt-1 text-xs text-slate-500">{liveDriverLocation ? "Live location updating" : "Waiting for the driver’s next GPS update"}</p></div></div> : <div className="mt-4 flex items-center gap-4 rounded-xl bg-wayz-mist/60 p-4"><span className="flex h-14 w-16 items-center justify-center rounded-xl bg-wayz-yellow/30 text-wayz-navy"><CarFront size={34}/></span><div className="flex-1"><p className="font-bold text-wayz-ink">Auto rickshaw</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Users size={13}/> Up to 3 passengers</p><p className="mt-1 text-xs font-semibold text-amber-700">Waiting for a driver</p></div></div>}</section>
      {status === 'DRIVER_ARRIVED' && <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
        <div className="flex items-center gap-2"><ShieldCheck size={20} className="text-amber-700"/><h2 className="text-base font-bold text-amber-950">Your ride-start OTP</h2></div>
        <p className="mt-2 text-sm leading-6 text-amber-900">Your driver has arrived. Share this 4-digit code with the driver to verify your ride before it starts.</p>
        {serverBooking?.rideStartOtp ? <p className="mt-4 rounded-xl border border-amber-200 bg-white px-4 py-4 text-center text-4xl font-black tracking-[.45em] text-wayz-blue">{serverBooking.rideStartOtp}</p> : <p className="mt-3 rounded-lg bg-white/80 p-3 text-xs text-amber-900">Your secure ride code is being prepared. Refresh this page in a moment.</p>}
        <p className="mt-3 text-[11px] leading-5 text-amber-800">For your safety, share the code only with the driver who has arrived for this booking.</p>
      </section>}{driver && !liveDriverLocation && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">The driver’s latest GPS update is unavailable or older than 60 seconds. The map will show their position again when a fresh update arrives.</p>}
          <div className="mt-6 grid gap-4">
      {['REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED'].includes(status) && <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col items-start gap-3"><h2 className="text-sm font-bold text-wayz-ink">Need to cancel?</h2><p className="text-xs text-slate-500">You can cancel this ride before it starts.</p><button type="button" onClick={() => setCancelModalOpen(true)} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100">Cancel booking</button></div></section>}
      {["REQUESTED","DRIVER_ASSIGNED","DRIVER_ARRIVED","IN_PROGRESS"].includes(status) && <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm sm:p-6"><SosButton bookingId={booking.bookingId} role="PASSENGER"/></section>}
    </div>
    </div><aside className="space-y-5"><NotificationCenter role="PASSENGER"/><section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="px-1 pb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Route map</p><RouteMap route={estimate.route} driverLocation={liveDriverLocation}/></section><section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{status === "COMPLETED" ? "Final fare" : "Fare estimate"}</p><p className="mt-2 text-4xl font-black text-wayz-blue">₹{status === "COMPLETED" ? (serverBooking?.finalFare ?? serverBooking?.estimatedFare ?? estimate.fare) : (serverBooking?.estimatedFare ?? estimate.fare)}</p><p className="mt-1 text-xs text-slate-500">{status === "COMPLETED" ? "Trip completed · final fare recorded" : "Indicative fare · final fare may vary"}</p><div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={16} className="text-emerald-600"/>{status === "COMPLETED" ? "Please settle the fare directly with your driver." : "No payment has been collected."}</div></section>{['COMPLETED','CANCELLED','CANCELED'].includes(status) ? <button onClick={() => navigate('/')} className="w-full rounded-xl bg-wayz-yellow px-5 py-4 text-sm font-bold text-wayz-ink transition hover:bg-amber-300">Book another ride</button> : null}</aside></div> 
    {cancelModalOpen && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget && !cancelling) setCancelModalOpen(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title" className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><XCircle size={21}/></span><h2 id="cancel-booking-title" className="mt-3 text-lg font-extrabold text-wayz-ink">Cancel this booking?</h2><p className="mt-1 text-sm leading-5 text-slate-500">Please tell us why you’re cancelling your ride.</p></div><button type="button" aria-label="Close" disabled={cancelling} onClick={() => setCancelModalOpen(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><XCircle size={20}/></button></div>
        <label className="mt-5 block text-xs font-bold text-slate-600">CANCELLATION REASON<select value={cancelReason} onChange={event => setCancelReason(event.target.value)} className="mt-2 h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-wayz-blue focus:bg-white focus:ring-4 focus:ring-blue-100"><option value="CHANGE_OF_PLANS">My plans have changed</option><option value="WRONG_PICKUP">Pickup location is incorrect</option><option value="WRONG_DESTINATION">Destination is incorrect</option><option value="DRIVER_UNAVAILABLE">Driver is unavailable</option><option value="OTHER">Other reason</option></select></label>
        {cancelReason === 'OTHER' && <label className="mt-4 block text-xs font-bold text-slate-600">TELL US MORE (OPTIONAL)<textarea value={cancelDetails} onChange={event => setCancelDetails(event.target.value)} maxLength={500} rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-wayz-blue focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="Add a short reason"/></label>}
        <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" disabled={cancelling} onClick={() => setCancelModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">Keep booking</button><button type="button" disabled={cancelling} onClick={cancelBooking} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60">{cancelling ? <><LoaderCircle size={16} className="animate-spin"/> Cancelling…</> : 'Yes, cancel ride'}</button></div>
      </section>
    </div>}
  </div></div></PageLayout>
}
