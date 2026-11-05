import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CarFront, MapPin, Power, RefreshCw, LogOut, CheckCircle2, Clock3, Navigation, XCircle, Wallet, UploadCloud } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import AuthLayout from '../components/AuthLayout'
import { adminApi } from '../lib/adminApi'
import NotificationCenter from '../components/NotificationCenter'
import SosButton from '../components/SosButton'
import DailyEarningsSummary from '../components/DailyEarningsSummary'
import DriverRatingsSummary from '../components/DriverRatingsSummary'
import DriverSubscriptionPanel from '../components/DriverSubscriptionPanel'

const money = value => '₹' + Number(value || 0).toLocaleString('en-IN')

export default function DriverPortalPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const isLoginRoute = location.pathname === '/driver/login'
  const [driver, setDriver] = useState(null)
  const [checking, setChecking] = useState(true)
  const [form, setForm] = useState({ phone: '', password: '' })
  const [offers, setOffers] = useState([])
  const [activeBookings, setActiveBookings] = useState([])
  const [walletData, setWalletData] = useState(null)
  const [rechargeForm, setRechargeForm] = useState({ amount: '', paymentReference: '', proof: null })
  const [finalFareInputs, setFinalFareInputs] = useState({})
  const [rideOtpInputs, setRideOtpInputs] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [gpsError, setGpsError] = useState('')
  const watchId = useRef(null)
  const gpsHeartbeatId = useRef(null)
  const gpsSendInFlight = useRef(false)
  const lastSentAt = useRef(0)

  const refreshActiveBookings = useCallback(async () => {
    try {
      const result = await adminApi.driverActiveBookings()
      setActiveBookings(result.bookings || [])
    } catch (err) {
      if (err.message && !/sign in/i.test(err.message)) setError(err.message)
    }
  }, [])

  useEffect(() => {
    if (!driver?.id) return
    refreshActiveBookings()
    const timer = window.setInterval(refreshActiveBookings, 5000)
    return () => window.clearInterval(timer)
  }, [driver?.id, refreshActiveBookings])

  const loadWallet = useCallback(async () => {
    try { setWalletData(await adminApi.walletMe()) }
    catch (err) { if (err.message && !/sign in/i.test(err.message)) setError(err.message) }
  }, [])

  useEffect(() => {
    if (!driver?.id) return
    loadWallet()
    const timer = window.setInterval(loadWallet, 15000)
    return () => window.clearInterval(timer)
  }, [driver?.id, loadWallet])

  async function submitRecharge(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const form = new FormData()
      form.append('amount', rechargeForm.amount)
      form.append('paymentReference', rechargeForm.paymentReference)
      if (rechargeForm.proof) form.append('proof', rechargeForm.proof)
      const result = await adminApi.submitWalletRecharge(form)
      setNotice(result.message)
      setRechargeForm({ amount: '', paymentReference: '', proof: null })
      event.target.reset()
      await loadWallet()
    } catch (err) { setError(err.message || 'Could not submit recharge request.') }
    finally { setBusy(false) }
  }

  const refreshOffers = useCallback(async () => {
    try { const result = await adminApi.driverOffers(); setOffers(result.offers || []) }
    catch (err) { if (err.message && !/sign in/i.test(err.message)) setError(err.message) }
  }, [])

  useEffect(() => {
    if (isLoginRoute) {
      setDriver(null)
      setChecking(false)
      return
    }
    let active = true
    setChecking(true)
    adminApi.driverMe().then(result => { if (active) setDriver(result.driver) }).catch(() => {}).finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [isLoginRoute])

  useEffect(() => {
    if (!driver?.id || isLoginRoute) return
    const refreshDriverSession = async () => {
      try {
        const result = await adminApi.driverMe()
        setDriver(result.driver)
      } catch {}
    }
    const timer = window.setInterval(refreshDriverSession, 30000)
    return () => window.clearInterval(timer)
  }, [driver?.id, isLoginRoute])

  useEffect(() => {
    if (!driver?.isOnline) return
    refreshOffers()
    const timer = window.setInterval(refreshOffers, 5000)
    return () => window.clearInterval(timer)
  }, [driver?.isOnline, refreshOffers])

  const hasActiveRide = activeBookings.some(item => ['DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(item.status))
  const shouldShareGps = Boolean(driver?.isOnline || hasActiveRide)

  useEffect(() => {
    if (!driver?.id || !shouldShareGps) return
    if (!navigator.geolocation) { setGpsError('This browser does not support GPS location.'); return }

    let active = true
    const minimumInterval = hasActiveRide ? 5000 : 12000

    // Send a location heartbeat even when the auto is stationary.
    // watchPosition alone may not fire again if GPS coordinates do not change.
    const sendPosition = async position => {
      if (!active || gpsSendInFlight.current || Date.now() - lastSentAt.current < minimumInterval) return
      gpsSendInFlight.current = true
      try {
        await adminApi.driverLocation(position.coords.latitude, position.coords.longitude)
        lastSentAt.current = Date.now()
        if (active) setGpsError('')
      } catch (err) {
        if (active) setGpsError(err.message || 'Unable to update GPS location.')
      } finally {
        gpsSendInFlight.current = false
      }
    }

    const requestCurrentPosition = () => {
      navigator.geolocation.getCurrentPosition(
        position => { sendPosition(position) },
        err => {
          if (active) setGpsError(err.code === 1
            ? 'Location permission was denied. Enable location access to share your position during an active ride.'
            : 'GPS signal unavailable. Move to an area with better reception.')
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      )
    }

    watchId.current = navigator.geolocation.watchPosition(
      position => { sendPosition(position) },
      err => {
        if (active) setGpsError(err.code === 1
          ? 'Location permission was denied. Enable location access to share your position during an active ride.'
          : 'GPS signal unavailable. Move to an area with better reception.')
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    )

    requestCurrentPosition()
    gpsHeartbeatId.current = window.setInterval(requestCurrentPosition, minimumInterval)

    return () => {
      active = false
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
      if (gpsHeartbeatId.current != null) window.clearInterval(gpsHeartbeatId.current)
      watchId.current = null
      gpsHeartbeatId.current = null
    }
  }, [driver?.id, shouldShareGps, hasActiveRide])

  async function login(event) {
    event.preventDefault(); setError(''); setBusy(true)
    try { const result = await adminApi.driverLogin(form.phone, form.password); setDriver(result.driver); setNotice('Signed in successfully.'); navigate('/driver', { replace: true }) }
    catch (err) { setError(err.message || 'Sign in failed.') }
    finally { setBusy(false) }
  }

  async function toggleOnline() {
    setError(''); setGpsError(''); setBusy(true)
    try {
      if (driver.isOnline) {
        const result = await adminApi.driverAvailability(false)
        setDriver(result.driver); setNotice('You are now offline. GPS sharing has stopped.')
      } else {
        if (!navigator.geolocation) throw new Error('This browser does not support GPS location.')
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, err => reject(new Error(err.code === 1 ? 'Allow location access in your browser to go online.' : 'Could not get your location. Please try again in an open area.')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }))
        await adminApi.driverLocation(position.coords.latitude, position.coords.longitude)
        const result = await adminApi.driverAvailability(true)
        setDriver(result.driver); setNotice('You are online. Nearby ride offers will appear here.')
      }
    } catch (err) { setError(err.message || 'Availability could not be updated.') }
    finally { setBusy(false) }
  }

  async function actOnOffer(offer, accept) {
    setBusy(true); setError(''); setNotice('')
    try {
      if (accept) {
        const result = await adminApi.acceptDriverOffer(offer.id)
        setNotice(result.message || 'Ride accepted. Your location is now being shared with the passenger.')
        setOffers(current => current.filter(item => item.id !== offer.id))

        // Send a fresh GPS fix immediately after acceptance instead of waiting
        // for the background watchPosition callback.
        if (navigator.geolocation) {
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 12000
              })
            })
            await adminApi.driverLocation(position.coords.latitude, position.coords.longitude)
            setGpsError('')
          } catch (locationError) {
            setGpsError(locationError.code === 1
              ? 'Location permission is disabled. Allow location access so the passenger can track your auto.'
              : 'Waiting for a fresh GPS signal. Keep location enabled during the ride.')
          }
        } else {
          setGpsError('This browser does not support GPS location sharing.')
        }

        await Promise.all([refreshOffers(), refreshActiveBookings()])
      } else {
        await adminApi.declineDriverOffer(offer.id)
        setOffers(current => current.filter(item => item.id !== offer.id))
        await refreshOffers()
      }
    } catch (err) {
      setError(err.message || 'Could not update this offer.')
      await Promise.all([refreshOffers(), refreshActiveBookings()])
    } finally {
      setBusy(false)
    }
  }

  async function cancelActiveBooking(item) {
    const options = [
      ['PASSENGER_UNAVAILABLE', 'Passenger unavailable'],
      ['PASSENGER_REQUESTED', 'Passenger requested cancellation'],
      ['VEHICLE_ISSUE', 'Vehicle issue'],
      ['SAFETY_CONCERN', 'Safety concern'],
      ['WRONG_LOCATION', 'Wrong location'],
      ['OTHER', 'Other']
    ]
    const answer = window.prompt('Choose cancellation reason number:\n' + options.map((option, index) => (index + 1) + '. ' + option[1]).join('\n'), '1')
    if (answer == null) return
    const selected = options[Number(answer) - 1]
    if (!selected) { setError('Enter a valid reason number from 1 to 6.'); return }
    if (!window.confirm('Cancel ride ' + item.reference + '? The cancellation will be recorded for Super Admin review.')) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await adminApi.cancelDriverBooking(item.id, selected[0])
      setNotice(result.message || 'Ride cancelled.')
      await refreshActiveBookings()
    } catch (err) { setError(err.message || 'Unable to cancel this ride.') }
    finally { setBusy(false) }
  }

  async function updateTripStatus(booking, status, otp) {
    setBusy(true); setError(''); setNotice('')
    try {
      const fare = status === 'COMPLETED' ? (finalFareInputs[booking.id] ?? String(booking.estimatedFare)) : undefined
      const result = await adminApi.updateDriverBookingStatus(booking.id, status, fare, otp)
      if (status === 'IN_PROGRESS') setRideOtpInputs(current => ({ ...current, [booking.id]: '' }))
      setNotice(result.message)
      await refreshActiveBookings()
      if (status === 'COMPLETED') await loadWallet()
    } catch (err) {
      setError(err.message || 'Could not update this trip.')
      await refreshActiveBookings()
    } finally { setBusy(false) }
  }

  async function logout() {
    try { await adminApi.driverLogout() } catch (err) { setError(err.message || 'Could not sign out.') }
    setDriver(null); setOffers([]); setWalletData(null); setNotice(''); setError(''); navigate('/driver/login', { replace: true })
  }

  if (checking || (driver && isLoginRoute)) return <PageLayout><div className="mx-auto max-w-3xl px-5 py-20 text-center text-sm text-slate-500">Checking driver session…</div></PageLayout>
  if (!driver) return <AuthLayout title="Driver sign in" subtitle="Sign in to manage your availability and receive nearby ride offers." footer={<p>Not registered yet? <button onClick={() => navigate('/driver/register')} className="font-bold text-wayz-blue hover:underline">Register as a driver</button></p>}>
    <form onSubmit={login} className="space-y-5">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <label className="block text-xs font-bold text-slate-600">MOBILE NUMBER<input required value={form.phone} onChange={e => setForm(v => ({ ...v, phone: e.target.value }))} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-wayz-blue" placeholder="10-digit mobile number"/></label>
      <label className="block text-xs font-bold text-slate-600">PASSWORD<input required type="password" autoComplete="current-password" value={form.password} onChange={e => setForm(v => ({ ...v, password: e.target.value }))} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-wayz-blue" placeholder="Your password"/></label>
      <button disabled={busy} className="w-full rounded-xl bg-wayz-blue px-5 py-4 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Signing in…' : 'Driver sign in'}</button>
    </form>
  </AuthLayout>

  return <PageLayout><div className="min-h-[70vh] bg-wayz-mist/50"><div className="mx-auto max-w-5xl px-5 py-8 sm:py-10">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Driver portal</p><h1 className="mt-2 text-3xl font-bold text-wayz-ink">Hello, {driver.name}</h1><p className="mt-1 text-sm text-slate-500">{driver.vehicleNumber} · {driver.serviceArea}</p></div><button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"><LogOut size={16}/> Sign out</button></div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    {driver?.id && <div className="mt-5"><NotificationCenter role="DRIVER"/></div>}
    {driver.status !== 'APPROVED' ? <>
      <section className="mt-7 rounded-2xl border border-amber-200 bg-white p-6"><Clock3 className="text-amber-600" size={30}/><h2 className="mt-3 text-xl font-bold text-wayz-ink">{driver.status === 'SUSPENDED' ? 'Driver account suspended' : driver.status === 'REJECTED' ? 'Driver account rejected' : 'Account awaiting verification'}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{driver.status === 'SUSPENDED' ? 'Your account has been disabled because one or more required documents have expired. Check your notifications and contact the 2WAYZ Super Admin with renewed documents. Your account can be reactivated after document review. Any ride already in progress can still be completed below.' : driver.status === 'REJECTED' ? 'Your registration was not approved. Please contact 2WAYZ support for more information.' : 'Your registration is pending review. A Super Admin must approve your details before you can go online or receive ride offers.'}</p></section>
      {driver.status === 'SUSPENDED' && activeBookings.length > 0 && <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold text-wayz-ink">Finish your active ride</h2><p className="mt-1 text-sm text-slate-500">You cannot accept new rides while suspended, but please complete a ride that was already in progress.</p><div className="mt-4 space-y-4">{activeBookings.map(item => <article key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-wayz-ink">{item.reference}</strong><span className="text-xs font-bold text-slate-500">{item.status.replaceAll('_', ' ')}</span></div><p className="mt-2 text-sm text-slate-700">{item.pickupName} → {item.destinationName}</p><div className="mt-3"><SosButton bookingId={item.id} role="DRIVER"/></div>
        {item.status === 'DRIVER_ASSIGNED' && <button disabled={busy} onClick={() => updateTripStatus(item, 'DRIVER_ARRIVED')} className="mt-3 w-full rounded-lg bg-wayz-yellow px-4 py-3 text-sm font-bold text-wayz-ink disabled:opacity-60">Mark arrived at pickup</button>}
        {item.status === 'DRIVER_ARRIVED' && <div className="mt-3 space-y-2"><label className="block text-xs font-bold text-slate-600">PASSENGER 4-DIGIT OTP<input inputMode="numeric" maxLength={4} value={rideOtpInputs[item.id] || ''} onChange={event => setRideOtpInputs(current => ({...current, [item.id]: event.target.value.replace(/\D/g, '').slice(0, 4)}))} className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 text-center text-xl tracking-widest"/></label><button disabled={busy || (rideOtpInputs[item.id] || '').length !== 4} onClick={() => updateTripStatus(item, 'IN_PROGRESS', rideOtpInputs[item.id])} className="w-full rounded-lg bg-wayz-blue px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Verify OTP & start trip</button></div>}
        {item.status === 'IN_PROGRESS' && <div className="mt-3 space-y-2"><label className="block text-xs font-bold text-slate-600">FINAL FARE (₹)<input type="number" min="0" value={finalFareInputs[item.id] ?? String(item.estimatedFare)} onChange={event => setFinalFareInputs(current => ({...current, [item.id]: event.target.value}))} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3"/></label><button disabled={busy} onClick={() => updateTripStatus(item, 'COMPLETED')} className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">Complete trip</button></div>}
      </article>)}</div></section>}
      </> :
    <>
      <section className="mt-7 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6"><div className="flex items-center gap-4"><span className={'flex h-14 w-14 items-center justify-center rounded-2xl ' + (driver.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}><Power size={28}/></span><div><p className="text-lg font-bold text-wayz-ink">{driver.isOnline ? 'You are online' : 'You are offline'}</p><p className="mt-1 text-sm text-slate-500">{driver.isOnline ? 'Your GPS location is shared for dispatch.' : 'Go online when you are ready to accept rides.'}</p></div></div><button disabled={busy} onClick={toggleOnline} className={'rounded-xl px-6 py-3.5 text-sm font-bold disabled:opacity-60 ' + (driver.isOnline ? 'border border-slate-200 bg-white text-slate-700' : 'bg-wayz-yellow text-wayz-ink')}>{busy ? 'Please wait…' : driver.isOnline ? 'Go offline' : 'Share location & go online'}</button></section>
      {gpsError && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{gpsError}</p>}
      <DriverSubscriptionPanel/>
      <DailyEarningsSummary role="DRIVER"/>
      <DriverRatingsSummary/>
       <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-3 text-wayz-blue"><Wallet size={22}/></span><div><h2 className="text-lg font-bold text-wayz-ink">My wallet</h2><p className="text-xs text-slate-500">Manual recharge · Commission on completed rides</p></div></div><button onClick={loadWallet} className="rounded-lg p-2 text-wayz-blue" aria-label="Refresh wallet"><RefreshCw size={17}/></button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Available balance</p><p className="mt-1 text-2xl font-black text-wayz-blue">{money(walletData?.wallet?.balance)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Total commission paid</p><p className="mt-1 text-2xl font-black text-slate-700">{money(walletData?.totalCommissionDeducted)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Outstanding commission</p><p className="mt-1 text-2xl font-black text-amber-700">{money(walletData?.outstandingCommission)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Minimum balance</p><p className="mt-1 text-2xl font-black text-wayz-ink">{money(walletData?.settings?.minimumBalance)}</p></div></div>
        {walletData?.settings && <p className="mt-3 text-xs text-slate-500">Commission: {walletData.settings.commissionMode === 'PERCENTAGE' ? walletData.settings.commissionValue + '%' : money(walletData.settings.commissionValue)} per completed ride.</p>}
        {walletData?.outstandingCommission > 0 && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Recharge your wallet to clear outstanding commission before receiving new ride offers.</p>}
        {walletData?.settings?.isActive && walletData.wallet?.balance < walletData.settings.minimumBalance && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Your wallet is below the minimum balance. New ride offers are paused until you recharge.</p>}
        {!walletData?.settings?.isActive && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Wallet setup is pending Super Admin activation.</p>}
        <form onSubmit={submitRecharge} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">RECHARGE AMOUNT (₹)<input required type="number" min="50" max="50000" step="1" value={rechargeForm.amount} onChange={e=>setRechargeForm(v=>({...v,amount:e.target.value}))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" placeholder="Minimum ₹50"/></label>
          <label className="text-xs font-bold text-slate-600">UPI / PAYMENT REFERENCE<input required minLength="4" maxLength="100" value={rechargeForm.paymentReference} onChange={e=>setRechargeForm(v=>({...v,paymentReference:e.target.value}))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" placeholder="Enter transaction reference"/></label>
          <label className="text-xs font-bold text-slate-600 sm:col-span-2">PAYMENT SCREENSHOT (OPTIONAL)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setRechargeForm(v=>({...v,proof:e.target.files?.[0]||null}))} className="mt-2 block w-full rounded-xl border border-slate-200 p-2 text-xs"/></label>
          <div className="sm:col-span-2"><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><UploadCloud size={16}/>{busy?'Submitting…':'Submit recharge request'}</button><p className="mt-2 text-xs text-slate-500">Your recharge is credited only after Super Admin verifies the payment.</p></div>
        </form>
        {walletData?.recharges?.length>0 && <div className="mt-5"><h3 className="text-sm font-bold text-wayz-ink">Recent recharge requests</h3><div className="mt-2 divide-y rounded-xl border border-slate-100">{walletData.recharges.slice(0,5).map(item=><div key={item.id} className="flex justify-between gap-3 p-3 text-xs"><span>{money(item.amount)} · {item.paymentReference}</span><strong>{item.status}</strong></div>)}</div></div>}
        {walletData?.transactions?.length>0 && <div className="mt-5"><h3 className="text-sm font-bold text-wayz-ink">Recent wallet transactions</h3><div className="mt-2 divide-y rounded-xl border border-slate-100">{walletData.transactions.slice(0,8).map(item=><div key={item.id} className="flex flex-wrap justify-between gap-2 p-3 text-xs"><span className="text-slate-600">{item.description}</span><span className="font-bold">{['COMMISSION', 'ADJUSTMENT_DEBIT'].includes(item.type)?'-':item.type==='ADJUSTMENT_CREDIT'?'+':''}{money(item.type==='COMMISSION'?item.settledAmount:item.amount)} · Balance {money(item.balanceAfter)}</span></div>)}</div></div>}
      </section>
      <div className="mt-8 flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-wayz-ink">Nearby ride offers</h2><p className="mt-1 text-sm text-slate-500">Offers refresh every 5 seconds while you are online.</p></div><button onClick={refreshOffers} className="rounded-lg p-2 text-wayz-blue hover:bg-white" aria-label="Refresh offers"><RefreshCw size={18}/></button></div>
      {!driver.isOnline && <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">Go online and share your location to receive ride offers.</div>}
      {driver.isOnline && offers.length === 0 && <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><CarFront className="mx-auto text-slate-400" size={32}/><p className="mt-3 font-bold text-slate-700">No ride offers right now</p><p className="mt-1 text-sm text-slate-500">Keep your status online. New nearby requests will appear here.</p></div>}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-wayz-ink">Active rides</h2><p className="mt-1 text-sm text-slate-500">Update each ride as you arrive, start and finish the trip.</p></div><button onClick={refreshActiveBookings} className="rounded-lg p-2 text-wayz-blue hover:bg-white" aria-label="Refresh active rides"><RefreshCw size={18}/></button></div>
        {activeBookings.length === 0
          ? <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">Accepted rides will appear here.</div>
          : <div className="mt-4 space-y-4">{activeBookings.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-wayz-blue">{item.reference}</span><span className="text-xs font-bold text-slate-600">{item.status.replaceAll('_', ' ')}</span></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup</p><p className="mt-1 text-sm font-bold text-wayz-ink">{item.pickupName}</p><p className="text-xs text-slate-500">{item.pickupAddress}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</p><p className="mt-1 text-sm font-bold text-wayz-ink">{item.destinationName}</p><p className="text-xs text-slate-500">{item.destinationAddress}</p></div></div>
              <p className="mt-3 text-sm font-semibold text-wayz-blue">Estimated fare: {money(item.estimatedFare)}</p>
              <div className="mt-4"><SosButton bookingId={item.id} role="DRIVER"/></div>
              {item.mode === 'schedule' && item.scheduledAt && <p className="mt-2 rounded-lg bg-blue-50 p-3 text-xs font-semibold text-blue-800">Scheduled pickup: {new Date(item.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
              {['DRIVER_ASSIGNED', 'DRIVER_ARRIVED'].includes(item.status) && <button disabled={busy} onClick={() => cancelActiveBooking(item)} className="mt-4 w-full rounded-xl border border-rose-200 px-4 py-3 text-sm font-bold text-rose-700 disabled:opacity-60">Cancel ride</button>}
              {item.status === 'DRIVER_ASSIGNED' && <button disabled={busy} onClick={() => updateTripStatus(item, 'DRIVER_ARRIVED')} className="mt-4 w-full rounded-xl bg-wayz-yellow px-4 py-3 text-sm font-bold text-wayz-ink disabled:opacity-60">Mark arrived at pickup</button>}
              {item.status === 'DRIVER_ARRIVED' && <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-bold text-wayz-ink">Passenger ride-start OTP</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Ask the passenger for the 4-digit code shown in their 2WAYZ booking screen. Enter it to verify the passenger and start the ride.</p>
                <label className="mt-3 block text-xs font-bold text-slate-600">4-DIGIT OTP
                  <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={4} pattern="[0-9]{4}" value={rideOtpInputs[item.id] || ''} onChange={event => setRideOtpInputs(current => ({ ...current, [item.id]: event.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="Enter passenger OTP" className="mt-1.5 h-12 w-full rounded-lg border border-blue-200 bg-white px-4 text-center text-xl font-bold tracking-[.5em] outline-none focus:border-wayz-blue"/>
                </label>
                <button disabled={busy || (rideOtpInputs[item.id] || '').length !== 4} onClick={() => updateTripStatus(item, 'IN_PROGRESS', rideOtpInputs[item.id])} className="mt-3 w-full rounded-xl bg-wayz-blue px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Verify OTP & start trip</button>
              </div>}
              {item.status === 'IN_PROGRESS' && <div className="mt-4 space-y-3"><label className="block text-xs font-bold text-slate-600">FINAL FARE (₹)<input type="number" min="0" max="100000" step="1" value={finalFareInputs[item.id] ?? String(item.estimatedFare)} onChange={event => setFinalFareInputs(current => ({ ...current, [item.id]: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-wayz-blue"/></label><button disabled={busy} onClick={() => updateTripStatus(item, 'COMPLETED')} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">Complete trip</button></div>}
            </article>)}</div>}
      </section>
      <div className="mt-4 space-y-4">{offers.map(offer => <article key={offer.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-wayz-blue">Ride {offer.booking.reference}</span><p className="mt-3 text-2xl font-black text-wayz-blue">{money(offer.booking.estimatedFare)}</p><p className="mt-1 text-xs text-slate-500">{offer.booking.distanceKm.toFixed(1)} km · approx. {offer.booking.estimatedMinutes} min</p>{offer.booking.mode === 'schedule' && offer.booking.scheduledAt && <p className="mt-2 rounded-lg bg-blue-50 p-2 text-xs font-semibold text-blue-800">Pickup: {new Date(offer.booking.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>}</div><span className="text-xs font-semibold text-slate-400">{offer.booking.mode === 'schedule' ? 'Scheduled ride' : 'Instant ride'}</span></div><div className="mt-4 space-y-3"><div className="flex gap-3"><MapPin className="mt-1 shrink-0 text-emerald-600" size={18}/><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup</p><p className="text-sm font-bold text-wayz-ink">{offer.booking.pickupName}</p><p className="text-xs text-slate-500">{offer.booking.pickupAddress}</p></div></div><div className="flex gap-3"><Navigation className="mt-1 shrink-0 text-rose-500" size={18}/><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</p><p className="text-sm font-bold text-wayz-ink">{offer.booking.destinationName}</p><p className="text-xs text-slate-500">{offer.booking.destinationAddress}</p></div></div></div><div className="mt-5 grid grid-cols-2 gap-3"><button disabled={busy} onClick={() => actOnOffer(offer, true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><CheckCircle2 size={17}/> Accept ride</button><button disabled={busy} onClick={() => actOnOffer(offer, false)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 disabled:opacity-60"><XCircle size={17}/> Decline</button></div></article>)}</div>
    </>}
  </div></div></PageLayout>
}
