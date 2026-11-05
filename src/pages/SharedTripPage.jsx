import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CarFront, Clock3, MapPin, RefreshCw, ShieldCheck, Route as RouteIcon } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import SharedTripMap from '../components/SharedTripMap'
import { adminApi } from '../lib/adminApi'

const labels = {
  DRIVER_ASSIGNED: 'Driver accepted the ride',
  DRIVER_ARRIVED: 'Driver arrived at pickup',
  IN_PROGRESS: 'Trip in progress'
}

export default function SharedTripPage() {
  const { token } = useParams()
  const [trip, setTrip] = useState(null)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let active = true
    let timer
    const load = async () => {
      try {
        const result = await adminApi.sharedTrip(token)
        if (!active) return
        setTrip(result.trip)
        setError('')
        setUpdatedAt(new Date())
      } catch (err) {
        if (!active) return
        setError(err.message || 'This trip sharing link is unavailable.')
        if (/expired|stopped|ended|invalid/i.test(err.message || '')) { setTrip(null); window.clearInterval(timer) }
      }
    }
    load()
    timer = window.setInterval(load, 10000)
    return () => { active = false; window.clearInterval(timer) }
  }, [token])

  async function refresh() {
    setRefreshing(true)
    try {
      const result = await adminApi.sharedTrip(token)
      setTrip(result.trip); setError(''); setUpdatedAt(new Date())
    } catch (err) { setError(err.message || 'Unable to refresh trip details.') }
    finally { setRefreshing(false) }
  }

  return <PageLayout><div className="min-h-[70vh] bg-wayz-mist/60 px-4 py-8 sm:px-6 sm:py-10">
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 rounded-3xl bg-wayz-navy px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">2WAYZ · Trip sharing</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-black sm:text-3xl">Live trip shared with you</h1><p className="mt-2 text-sm text-white/70">Follow the ride progress and the driver's latest available location.</p></div>
          <button onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20 disabled:opacity-60"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/> Refresh</button>
        </div>
      </div>
      {error && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"><div className="flex items-center gap-2 font-bold"><ShieldCheck size={19}/> Trip sharing unavailable</div><p className="mt-2 leading-6">{error}</p><p className="mt-3 text-xs">Ask the passenger to create a new sharing link if the ride is still active.</p></section>}
      {trip && <>
        <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Booking reference</p><p className="mt-1 text-xl font-black text-wayz-ink">{trip.reference}</p></div>
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">{labels[trip.status] || trip.status}</span>
        </section>
        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4"><div className="mb-3 flex items-center justify-between px-1"><h2 className="font-bold text-wayz-ink">Live location</h2><span className="text-[11px] font-semibold text-slate-400">Auto refresh · 10 sec</span></div><SharedTripMap trip={trip}/><p className="mt-3 text-xs leading-5 text-slate-500">{trip.driver?.locationIsFresh ? 'Driver location is updating.' : 'The driver’s latest GPS position is not currently available. The map will update when a fresh location arrives.'}{updatedAt ? ' Last checked ' + updatedAt.toLocaleTimeString() + '.' : ''}</p></section>
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="font-bold text-wayz-ink">Journey details</h2><div className="mt-4 space-y-4"><div className="flex gap-3"><MapPin size={19} className="mt-1 shrink-0 text-emerald-600"/><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup</p><p className="mt-1 text-sm font-bold text-wayz-ink">{trip.pickupName}</p><p className="text-xs text-slate-500">{trip.pickupAddress}</p></div></div><div className="flex gap-3"><MapPin size={19} className="mt-1 shrink-0 text-rose-500"/><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</p><p className="mt-1 text-sm font-bold text-wayz-ink">{trip.destinationName}</p><p className="text-xs text-slate-500">{trip.destinationAddress}</p></div></div></div></section>
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="font-bold text-wayz-ink">Assigned driver</h2>{trip.driver ? <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 p-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-wayz-yellow/40 text-wayz-navy"><CarFront size={27}/></span><div><p className="font-bold text-wayz-ink">{trip.driver.name}</p><p className="mt-1 text-xs text-slate-600">Vehicle: {trip.driver.vehicleNumber}</p><p className="mt-1 text-xs font-semibold text-emerald-700">{trip.driver.locationIsFresh ? 'Location available' : 'Location temporarily unavailable'}</p></div></div> : <p className="mt-3 text-sm text-slate-500">Driver details are not available yet.</p>}</section>
            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><div className="flex items-center gap-2 font-bold"><ShieldCheck size={18}/> Privacy protected</div><p className="mt-2 text-xs leading-5">This link shows only ride progress, journey locations and limited driver details. Passenger contact details and ride-start PIN are never shown.</p></section>
          </div>
        </div>
      </>}
    </div>
  </div></PageLayout>
}
