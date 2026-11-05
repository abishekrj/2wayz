import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from '../context/BookingContext'
import {
  Zap, Search, Info, Clock3,
  Route as RouteIcon, LoaderCircle, MapPin, ArrowLeftRight,
} from 'lucide-react'
import GooglePlaceField from './GooglePlaceField'
import RouteMap from './RouteMap'
import { adminApi } from '../lib/adminApi'

const FARE = { base: 30, includedKm: 1, perKm: 18, minimum: 50, rounding: 5 }

async function calculateRoute(pickup, destination) {
  if (!pickup || !destination) {
    throw new Error('Please select both locations.')
  }

  const { Place } = await window.google.maps.importLibrary('places')
  const { Route } = await window.google.maps.importLibrary('routes')
  async function resolvePlace(location) {
    if (location.placeId) return new Place({ id: location.placeId })
    const { places = [] } = await Place.searchByText({
      textQuery: location.searchText || `${location.name}, Tiruvannamalai, Tamil Nadu, India`,
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
    })
    if (!places[0]?.id) throw new Error(`Could not find ${location.name} on Google Maps. Please edit and select a suggestion.`)
    return places[0]
  }
  const [origin, end] = await Promise.all([resolvePlace(pickup), resolvePlace(destination)])
  const response = await Route.computeRoutes({
    origin,
    destination: end,
    travelMode: 'DRIVING',
    computeAlternativeRoutes: true,
    fields: ['distanceMeters', 'durationMillis', 'path'],
  })
  const routes = (response.routes || [])
    .filter(route => Number.isFinite(route.distanceMeters) && route.distanceMeters > 0)
    .sort((a, b) => a.distanceMeters - b.distanceMeters || (a.durationMillis || 0) - (b.durationMillis || 0))
  const route = routes[0]
  if (!route) throw new Error('No driving route found between these locations.')

  const km = route.distanceMeters / 1000
  const durationMinutes = Math.max(1, Math.round((route.durationMillis || 0) / 60000))
  const raw = Math.max(FARE.minimum, FARE.base + Math.max(0, km - FARE.includedKm) * FARE.perKm)
  const fare = Math.ceil(raw / FARE.rounding) * FARE.rounding

  return {
    km,
    durationMinutes,
    fare,
    distanceCharge: Math.max(0, fare - FARE.base),
    route,
  }
}

export default function BookingPanel({ initialDestination = null }) {
  const navigate = useNavigate()
  const { setBooking } = useBooking()
  const [pickup, setPickup] = useState(null)
  const [destination, setDestination] = useState(null)
  const [estimate, setEstimate] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activeRide, setActiveRide] = useState(null)
  const [checkingActiveRide, setCheckingActiveRide] = useState(true)

  useEffect(() => {
    let mounted = true
    adminApi.activePassengerBooking()
      .then(result => { if (mounted) setActiveRide(result.booking || null) })
      .catch(() => {})
      .finally(() => { if (mounted) setCheckingActiveRide(false) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!initialDestination) return
    setDestination(initialDestination)
    setEstimate(null)
    setError('')
  }, [initialDestination])

  function selectPickup(value) {
    setPickup(value)
    setEstimate(null)
    setError('')
  }

  function selectDestination(value) {
    setDestination(value)
    setEstimate(null)
    setError('')
  }

  function swapLocations() {
    setPickup(destination)
    setDestination(pickup)
    setEstimate(null)
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setEstimate(null)

    if (!pickup || !destination) {
      setError('Choose both locations from the Google suggestions.')
      return
    }

    setBusy(true)
    try {
      const routeEstimate = await calculateRoute(pickup, destination)
      setEstimate(routeEstimate)
      setBooking({ mode: 'instant', pickup, destination, estimate: routeEstimate, vehicle: 'auto' })
      navigate('/travel-details')
    } catch (err) {
      setError(err.message || 'Unable to calculate the route. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (activeRide) return (
    <div id="book" className="relative z-30 w-full overflow-hidden rounded-[24px] border border-amber-200 bg-white text-left shadow-[0_18px_55px_rgba(3,25,58,.18)]">
      <div className="bg-wayz-navy px-5 py-5 text-white sm:px-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-300">Your current ride</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">You already have an active booking</h2><p className="mt-2 text-sm text-white/75">To keep driver assignments clear, finish or cancel this ride before booking another auto.</p></div>
      <div className="p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">{({ REQUESTED: 'Finding a driver', DRIVER_ASSIGNED: 'Driver accepted', DRIVER_ARRIVED: 'Driver arrived', IN_PROGRESS: 'Trip in progress' })[activeRide.status] || activeRide.status}</span><span className="text-xs font-bold text-slate-400">{activeRide.reference}</span></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-emerald-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Pickup</p><p className="mt-1 text-sm font-bold text-wayz-ink">{activeRide.pickupName}</p></div><div className="rounded-xl bg-rose-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Destination</p><p className="mt-1 text-sm font-bold text-wayz-ink">{activeRide.destinationName}</p></div></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><div><p className="text-xs text-slate-500">Estimated fare</p><p className="text-2xl font-black text-wayz-blue">₹{Number(activeRide.estimatedFare || 0).toLocaleString('en-IN')}</p></div><button type="button" onClick={() => navigate('/my-bookings')} className="rounded-xl bg-wayz-yellow px-6 py-3.5 text-sm font-bold text-wayz-ink transition hover:bg-amber-300">Track / manage ride</button></div>
      </div>
    </div>
  )

  return (
    <div id="book" className="relative z-30 w-full rounded-[24px] border border-slate-100 bg-white p-5 text-left shadow-[0_18px_55px_rgba(3,25,58,.18)] sm:p-7">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Book your local auto</p>
          <h2 className="mt-1 text-xl font-bold text-wayz-ink sm:text-2xl">Where would you like to go?</h2>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-bold text-wayz-blue"><Zap size={16} /> Instant booking</span>
      </div>

      <form onSubmit={submit} className="relative z-20 grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
        <GooglePlaceField label="PICKUP LOCATION" placeholder="Search pickup point in or near Tiruvannamalai" icon={MapPin} value={pickup} onSelect={selectPickup} enableCurrentLocation />
        <button
          type="button"
          onClick={swapLocations}
          disabled={!pickup && !destination}
          aria-label="Swap pickup and destination"
          title="Swap pickup and destination"
          className="mb-[9px] flex h-10 w-10 items-center justify-center justify-self-center rounded-full border border-blue-200 bg-white text-wayz-blue shadow-sm transition hover:border-wayz-blue hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeftRight size={19} />
        </button>
        <GooglePlaceField key={destination?.name || 'destination-empty'} label="DESTINATION" placeholder="Where would you like to go?" tone="red" value={destination} onSelect={selectDestination} />

        <button disabled={busy} type="submit" className="flex h-[58px] w-full items-center justify-center gap-2 rounded-xl bg-wayz-yellow px-5 font-bold text-wayz-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70">
          {busy ? <LoaderCircle className="animate-spin" size={19} /> : <Search size={19} />}
          {busy ? 'Calculating route…' : 'Get fare estimate'}
        </button>
      </form>

      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {estimate && (
        <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-bold text-wayz-ink">
              <Info size={16} className="text-wayz-blue" /> Indicative auto fare
            </p>
            <p className="text-3xl font-black text-wayz-blue">₹{estimate.fare}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)]">
            <div className="min-w-0">
              <div className="rounded-xl bg-white p-3">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup</p>
                    <p className="truncate text-sm font-semibold text-wayz-ink">{pickup.name}</p>
                  </div>
                </div>
                <div className="ml-1.5 my-2 h-4 border-l border-dashed border-slate-300" />
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</p>
                    <p className="truncate text-sm font-semibold text-wayz-ink">{destination.name}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white p-3">
                  <RouteIcon size={17} className="text-wayz-blue" />
                  <p className="mt-2 text-lg font-bold text-wayz-ink">{estimate.km.toFixed(1)} km</p>
                  <p className="text-[11px] text-slate-500">Route distance</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <Clock3 size={17} className="text-wayz-blue" />
                  <p className="mt-2 text-lg font-bold text-wayz-ink">{estimate.durationMinutes} min</p>
                  <p className="text-[11px] text-slate-500">Travel time</p>
                </div>
              </div>

              <div className="mt-3 space-y-2 rounded-xl bg-white p-3 text-xs text-slate-600">
                <div className="flex justify-between"><span>Base fare (first {FARE.includedKm} km)</span><span>₹{FARE.base}</span></div>
                <div className="flex justify-between"><span>Distance component + rounding</span><span>₹{estimate.distanceCharge}</span></div>
                <div className="flex justify-between font-bold text-wayz-ink"><span>Indicative total</span><span>₹{estimate.fare}</span></div>
              </div>
              <p className="mt-3 text-[10px] leading-4 text-slate-500">
                Illustrative starter tariff: ₹{FARE.base} base, ₹{FARE.perKm}/km after the first {FARE.includedKm} km, minimum ₹{FARE.minimum}, rounded up to ₹{FARE.rounding}. Confirm and configure local driver-approved rates before accepting bookings. Actual fare may vary.
              </p>
            </div>

            <div className="min-w-0">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Selected route</p>
              <RouteMap route={estimate.route} />
            </div>
          </div>
        </section>
      )}

    </div>
  )
}
