import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from '../context/BookingContext'
import {
  Search, Clock3, Route as RouteIcon, BadgeIndianRupee, LoaderCircle, ArrowLeftRight,
} from 'lucide-react'
import GooglePlaceField from './GooglePlaceField'
import { adminApi } from '../lib/adminApi'

const DEFAULT_FARE = { baseFare: 30, includedDistanceKm: 1, perKmRate: 18, minimumFare: 50, roundingIncrement: 5, isActive: true }

async function calculateRoute(pickup, destination, fareSettings) {
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
  const raw = Math.max(fareSettings.minimumFare, fareSettings.baseFare + Math.max(0, km - fareSettings.includedDistanceKm) * fareSettings.perKmRate)
  const fare = Math.ceil(raw / fareSettings.roundingIncrement) * fareSettings.roundingIncrement

  return {
    km,
    durationMinutes,
    fare,
    distanceCharge: Math.max(0, fare - fareSettings.baseFare),
    fareSettings,
    route,
  }
}

export default function BookingPanel({ initialDestination = null, pickup: externalPickup, onPickupChange, destination: externalDestination, onDestinationChange, activeField, onActiveFieldChange, onEstimateChange }) {
  const navigate = useNavigate()
  const { setBooking } = useBooking()
  const [internalPickup, setInternalPickup] = useState(null)
  const isPickupControlled = typeof onPickupChange === 'function'
  const pickup = isPickupControlled ? externalPickup : internalPickup
  const setPickup = isPickupControlled ? onPickupChange : setInternalPickup
  const [internalDestination, setInternalDestination] = useState(null)
  const isDestinationControlled = typeof onDestinationChange === 'function'
  const destination = isDestinationControlled ? externalDestination : internalDestination
  const setDestination = isDestinationControlled ? onDestinationChange : setInternalDestination
  const [estimate, setEstimate] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activeRide, setActiveRide] = useState(null)
  const [checkingActiveRide, setCheckingActiveRide] = useState(true)
  const [fareSettings, setFareSettings] = useState(DEFAULT_FARE)

  useEffect(() => {
    let mounted = true
    adminApi.activePassengerBooking()
      .then(result => { if (mounted) setActiveRide(result.booking || null) })
      .catch(() => {})
      .finally(() => { if (mounted) setCheckingActiveRide(false) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    adminApi.publicFareSettings()
      .then(result => {
        if (mounted && result.settings) setFareSettings(result.settings)
      })
      .catch(error => console.error('Unable to load fare settings; using the default tariff:', error))
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!initialDestination) return
    setDestination(initialDestination)
    setEstimate(null)
    setError('')
  }, [initialDestination])

  useEffect(() => {
    setEstimate(null)
    onEstimateChange?.(null)
    setError('')
  }, [pickup, destination])

  function selectPickup(value) {
    setPickup(value)
    setEstimate(null)
    onEstimateChange?.(null)
    setError('')
  }

  function selectDestination(value) {
    setDestination(value)
    setEstimate(null)
    onEstimateChange?.(null)
    setError('')
  }

  function swapLocations() {
    setPickup(destination)
    setDestination(pickup)
    setEstimate(null)
    onEstimateChange?.(null)
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    setEstimate(null)
    onEstimateChange?.(null)

    if (!pickup || !destination) {
      setError('Choose both locations from the Google suggestions.')
      return
    }

    setBusy(true)
    try {
      const latestFare = await adminApi.publicFareSettings().catch(() => null)
      const activeFareSettings = latestFare?.settings || fareSettings
      if (latestFare?.settings) setFareSettings(latestFare.settings)
      const routeEstimate = await calculateRoute(pickup, destination, activeFareSettings)
      setEstimate(routeEstimate)
      onEstimateChange?.(routeEstimate.route)
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
    <div id="book" className="relative z-30 w-full text-left">
      <div className="rounded-2xl border border-white/25 bg-[#073B83] px-4 pt-4 pb-3 shadow-[0_16px_42px_rgba(3,25,58,.2)] sm:rounded-[24px] sm:px-7 sm:pt-7 sm:pb-5">
      <div className="hidden sm:block">
        <h2 className="mb-5 text-2xl font-bold leading-tight text-white">Where would you like to go?</h2>
      </div>

      <form onSubmit={submit} className="relative z-20 grid grid-cols-1 items-end gap-2.5 sm:gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
        <GooglePlaceField label="PICKUP LOCATION" placeholder="Choose your pickup point" value={pickup} onSelect={selectPickup} onFocus={() => onActiveFieldChange?.('pickup')} enableCurrentLocation />
        <button
          type="button"
          onClick={swapLocations}
          disabled={!pickup && !destination}
          aria-label="Swap pickup and destination"
          title="Swap pickup and destination"
          className="hidden h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-white text-wayz-blue shadow-sm transition hover:border-wayz-blue hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 md:flex"
        >
          <ArrowLeftRight size={19} />
        </button>
        <GooglePlaceField label="DESTINATION" placeholder="Where would you like to go?" tone="red" value={destination} onSelect={selectDestination} onFocus={() => onActiveFieldChange?.('destination')} />
        <button disabled={busy} type="submit" className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-wayz-yellow px-5 py-3 font-bold text-wayz-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70 sm:h-[58px]">
          {busy ? <LoaderCircle className="animate-spin" size={19} /> : <Search size={19} />}
          {busy ? 'Calculating route…' : 'Get fare estimate'}
        </button>
      </form>

      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      </div>

      {estimate && (
        <section className="mt-3 grid grid-cols-4 items-stretch gap-1.5 rounded-2xl border border-blue-100 bg-white p-2.5 shadow-sm sm:mt-4 sm:gap-3 sm:p-3">
          <div className="flex min-w-0 flex-col items-center justify-center rounded-lg border border-blue-100 bg-white px-1 py-2 text-center sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5">
            <RouteIcon size={15} className="shrink-0 text-wayz-blue sm:size-[17px]" />
            <div className="min-w-0">
              <p className="whitespace-nowrap text-xs font-bold text-wayz-ink sm:text-base">{estimate.km.toFixed(1)} km</p>
              <p className="text-[9px] font-medium text-slate-500 sm:text-xs">Distance</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-col items-center justify-center rounded-lg border border-white/20 bg-transparent px-1 py-2 text-center sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5">
            <Clock3 size={15} className="shrink-0 text-white/80 sm:size-[17px]" />
            <div className="min-w-0">
              <p className="whitespace-nowrap text-xs font-bold text-white sm:text-base">{estimate.durationMinutes} min</p>
              <p className="text-[9px] font-medium text-white/75 sm:text-xs">Time</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-col items-center justify-center rounded-lg border border-white/20 bg-transparent px-1 py-2 text-center sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5">
            <BadgeIndianRupee size={15} className="shrink-0 text-white/80 sm:size-[17px]" />
            <div className="min-w-0">
              <p className="whitespace-nowrap text-xs font-bold text-white sm:text-base">₹{estimate.fare}</p>
              <p className="text-[9px] font-medium text-white/75 sm:text-xs">Price</p>
            </div>
          </div>
          <button type="button" onClick={() => { setBooking({ mode: 'instant', pickup, destination, estimate, vehicle: 'auto' }); navigate('/travel-details') }} className="flex min-w-0 min-h-[52px] items-center justify-center rounded-xl bg-wayz-yellow px-2 py-3 text-center text-xs font-bold leading-tight text-wayz-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-300 sm:h-[58px] sm:px-4 sm:text-sm">Continue booking</button>
        </section>
      )}
    </div>
  )
}
