import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from '../context/BookingContext'
import {
  CalendarDays, Zap, Search, Info, Clock3,
  Route as RouteIcon, LoaderCircle, MapPin, ArrowLeftRight,
} from 'lucide-react'
import GooglePlaceField from './GooglePlaceField'
import RouteMap from './RouteMap'

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
    fields: ['distanceMeters', 'durationMillis', 'path'],
  })
  const route = response.routes?.[0]
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
  const [mode, setMode] = useState('instant')
  const [pickup, setPickup] = useState(null)
  const [destination, setDestination] = useState(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [estimate, setEstimate] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
    if (mode === 'schedule' && (!date || !time)) {
      setError('Choose your preferred pickup date and time.')
      return
    }

    setBusy(true)
    try {
      const routeEstimate = await calculateRoute(pickup, destination)
      setEstimate(routeEstimate)
      setBooking({ mode, pickup, destination, date, time, estimate: routeEstimate, vehicle: 'auto' })
      navigate('/travel-details')
    } catch (err) {
      setError(err.message || 'Unable to calculate the route. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="book" className="relative z-30 w-full rounded-[24px] border border-slate-100 bg-white p-5 text-left shadow-[0_18px_55px_rgba(3,25,58,.18)] sm:p-7">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Book your local auto</p>
          <h2 className="mt-1 text-xl font-extrabold text-wayz-ink sm:text-2xl">Where would you like to go?</h2>
        </div>
        <div className="inline-flex w-fit rounded-xl bg-wayz-mist p-1">
          <button type="button" onClick={() => { setMode('instant'); setEstimate(null) }} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold ${mode === 'instant' ? 'bg-wayz-blue text-white shadow' : 'text-slate-600'}`}>
            <Zap size={16} /> Instant
          </button>
          <button type="button" onClick={() => { setMode('schedule'); setEstimate(null) }} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold ${mode === 'schedule' ? 'bg-wayz-blue text-white shadow' : 'text-slate-600'}`}>
            <CalendarDays size={16} /> Schedule
          </button>
        </div>
      </div>

      <form onSubmit={submit} className={`relative z-20 mt-5 grid grid-cols-1 items-end gap-3 ${mode === "schedule" ? "lg:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1.2fr)_.72fr_.72fr_auto]" : "md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]"}`}>
        <GooglePlaceField label="PICKUP LOCATION" placeholder="Search pickup point in or near Tiruvannamalai" icon={MapPin} value={pickup} onSelect={selectPickup} />
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
        <GooglePlaceField label="DESTINATION" placeholder="Where would you like to go?" tone="red" value={destination} onSelect={selectDestination} />

        {mode === 'schedule' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:contents">
            <label className="text-[11px] font-bold tracking-wider text-slate-600">
              PICKUP DATE
              <input type="date" min={new Date().toLocaleDateString('en-CA')} value={date} onChange={event => setDate(event.target.value)} className="mt-2 h-[58px] w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700" />
            </label>
            <label className="text-[11px] font-bold tracking-wider text-slate-600">
              PICKUP TIME
              <input type="time" value={time} onChange={event => setTime(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700" />
            </label>
          </div>
        )}

        <button disabled={busy} type="submit" className="flex h-[58px] w-full items-center justify-center gap-2 rounded-xl bg-wayz-yellow px-5 font-extrabold text-wayz-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70">
          {busy ? <LoaderCircle className="animate-spin" size={19} /> : <Search size={19} />}
          {busy ? 'Calculating route…' : 'Get fare estimate'}
        </button>
      </form>

      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {estimate && (
        <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-extrabold text-wayz-ink">
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
                  <p className="mt-2 text-lg font-extrabold text-wayz-ink">{estimate.km.toFixed(1)} km</p>
                  <p className="text-[11px] text-slate-500">Route distance</p>
                </div>
                <div className="rounded-xl bg-white p-3">
                  <Clock3 size={17} className="text-wayz-blue" />
                  <p className="mt-2 text-lg font-extrabold text-wayz-ink">{estimate.durationMinutes} min</p>
                  <p className="text-[11px] text-slate-500">Travel time</p>
                </div>
              </div>

              <div className="mt-3 space-y-2 rounded-xl bg-white p-3 text-xs text-slate-600">
                <div className="flex justify-between"><span>Base fare (first {FARE.includedKm} km)</span><span>₹{FARE.base}</span></div>
                <div className="flex justify-between"><span>Distance component + rounding</span><span>₹{estimate.distanceCharge}</span></div>
                <div className="flex justify-between font-extrabold text-wayz-ink"><span>Indicative total</span><span>₹{estimate.fare}</span></div>
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

      <p className="mt-4 text-center text-[11px] text-slate-400">Location suggestions and route distance are provided by Google Maps Platform.</p>
    </div>
  )
}
