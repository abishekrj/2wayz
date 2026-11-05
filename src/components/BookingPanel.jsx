import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from '../context/BookingContext'
import {
  Search, LoaderCircle, ArrowLeftRight, X, ChevronLeft, Pencil, Trash2, Home, BriefcaseBusiness, Star,
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

export default function BookingPanel({ initialDestination = null, pickup: externalPickup, onPickupChange, destination: externalDestination, onDestinationChange, activeField, onActiveFieldChange }) {
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activeRide, setActiveRide] = useState(null)
  const [checkingActiveRide, setCheckingActiveRide] = useState(true)
  const [fareSettings, setFareSettings] = useState(DEFAULT_FARE)
  const [savedPlaces, setSavedPlaces] = useState([])
  const [savedPlacesOpen, setSavedPlacesOpen] = useState(false)
  const [savedPlacesMode, setSavedPlacesMode] = useState('add')
  const [editingSavedPlace, setEditingSavedPlace] = useState(null)
  const [savedPlaceCategory, setSavedPlaceCategory] = useState('HOME')
  const [savedPlaceLabel, setSavedPlaceLabel] = useState('Home')
  const [savedPlaceLocation, setSavedPlaceLocation] = useState(null)
  const [savedPlaceBusy, setSavedPlaceBusy] = useState(false)
  const [savedPlaceError, setSavedPlaceError] = useState('')

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
    adminApi.savedPlaces().then(result => { if (mounted) setSavedPlaces(result.places || []) }).catch(() => {})
    const openManager = () => {
      setSavedPlacesMode('add')
      setEditingSavedPlace(null)
      setSavedPlaceCategory('HOME')
      setSavedPlaceLabel('Home')
      setSavedPlaceLocation(null)
      setSavedPlaceError('')
      setSavedPlacesOpen(true)
    }
    window.addEventListener('wayz:manage-saved-places', openManager)
    return () => { mounted = false; window.removeEventListener('wayz:manage-saved-places', openManager) }
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
    setError('')
  }, [initialDestination])

  useEffect(() => {
    setError('')
  }, [pickup, destination])

  function selectPickup(value) {
    setPickup(value)
    setError('')
  }

  function selectDestination(value) {
    setDestination(value)
    setError('')
  }


  async function refreshSavedPlaces() {
    try {
      const result = await adminApi.savedPlaces()
      setSavedPlaces(result.places || [])
    } catch (err) {
      setSavedPlaceError(err.message || 'Unable to load saved places.')
    }
  }
  function editSavedPlace(place) {
    setEditingSavedPlace(place)
    setSavedPlaceCategory(place.category)
    setSavedPlaceLabel(place.label)
    setSavedPlaceLocation({ source: 'saved-place', placeId: place.placeId || undefined, name: place.name, address: place.address, location: { lat: place.latitude, lng: place.longitude } })
    setSavedPlacesMode('edit')
    setSavedPlaceError('')
  }
  async function saveSavedPlace(event) {
    event.preventDefault()
    if (!savedPlaceLocation || !savedPlaceLocation.location) {
      setSavedPlaceError('Please choose a location from the Google suggestions.')
      return
    }
    setSavedPlaceBusy(true)
    setSavedPlaceError('')
    const payload = { category: savedPlaceCategory, label: savedPlaceLabel.trim(), name: savedPlaceLocation.name, address: savedPlaceLocation.address || savedPlaceLocation.name, placeId: savedPlaceLocation.placeId, location: savedPlaceLocation.location }
    try {
      if (savedPlacesMode === 'edit' && editingSavedPlace) await adminApi.updateSavedPlace(editingSavedPlace.id, payload)
      else await adminApi.createSavedPlace(payload)
      await refreshSavedPlaces()
      setSavedPlacesMode('list')
      setEditingSavedPlace(null)
      setSavedPlaceLocation(null)
    } catch (err) {
      setSavedPlaceError(err.message || 'Unable to save this place.')
    } finally {
      setSavedPlaceBusy(false)
    }
  }
  async function deleteSavedPlace(place) {
    if (!window.confirm('Remove "' + place.label + '" from saved places?')) return
    setSavedPlaceBusy(true)
    setSavedPlaceError('')
    try {
      await adminApi.deleteSavedPlace(place.id)
      await refreshSavedPlaces()
    } catch (err) {
      setSavedPlaceError(err.message || 'Unable to remove this place.')
    } finally {
      setSavedPlaceBusy(false)
    }
  }

  function swapLocations() {
    setPickup(destination)
    setDestination(pickup)
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
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
    <div id="book" className="relative z-30 w-full text-left">
      <div className="rounded-2xl border border-white/25 bg-[#073B83] px-4 pt-4 pb-3 shadow-[0_16px_42px_rgba(3,25,58,.2)] sm:rounded-[24px] sm:px-7 sm:pt-7 sm:pb-5">
      <div className="hidden sm:block">
        <h2 className="mb-5 text-2xl font-bold leading-tight text-white">Where would you like to go?</h2>
      </div>

      <form onSubmit={submit} className="relative z-20 grid grid-cols-1 items-end gap-2.5 sm:gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
        <GooglePlaceField label="PICKUP LOCATION" placeholder="Choose your pickup point" value={pickup} onSelect={selectPickup} onFocus={() => onActiveFieldChange?.('pickup')} savedPlaces={savedPlaces} enableCurrentLocation />
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
        <GooglePlaceField label="DESTINATION" placeholder="Where would you like to go?" tone="red" value={destination} onSelect={selectDestination} onFocus={() => onActiveFieldChange?.('destination')} savedPlaces={savedPlaces} />
        <button disabled={busy} type="submit" className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-wayz-yellow px-5 py-3 font-bold text-wayz-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70 sm:h-[58px]">
          {busy ? <LoaderCircle className="animate-spin" size={19} /> : <Search size={19} />}
          {busy ? 'Calculating route…' : 'Get fare estimate'}
        </button>
      </form>

      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      </div>


      {savedPlacesOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 p-3 sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) setSavedPlacesOpen(false) }}>
          <div className="flex max-h-[min(520px,90vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
              {savedPlacesMode !== 'add' && <button type="button" aria-label="Back" onClick={() => { setSavedPlacesMode('add'); setEditingSavedPlace(null); setSavedPlaceLocation(null); setSavedPlaceError('') }} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"><ChevronLeft size={20}/></button>}
              <div className="min-w-0 flex-1"><h3 className="text-base font-bold text-wayz-ink">{savedPlacesMode === 'list' ? 'Saved places' : savedPlacesMode === 'edit' ? 'Edit saved place' : 'Your shortcuts'}</h3><p className="text-xs text-slate-500">{savedPlacesMode === 'list' ? 'Manage your saved locations' : 'Add a place for quicker bookings'}</p></div>
              <button type="button" aria-label="Close" onClick={() => setSavedPlacesOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X size={18}/></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {savedPlacesMode === 'list' ? (
                <div className="space-y-2">
                  {savedPlaces.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">You haven't saved any places yet.</p>}
                  {savedPlaces.map(place => {
                    const PlaceIcon = place.category === 'HOME' ? Home : place.category === 'WORK' ? BriefcaseBusiness : Star
                    return <div key={place.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-wayz-blue"><PlaceIcon size={17}/></span>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{place.label}</p><p className="truncate text-xs text-slate-500">{place.address}</p></div>
                      <button type="button" aria-label={'Edit ' + place.label} onClick={() => editSavedPlace(place)} className="flex h-8 w-8 items-center justify-center rounded-lg text-wayz-blue hover:bg-blue-50"><Pencil size={15}/></button>
                      <button type="button" aria-label={'Delete ' + place.label} disabled={savedPlaceBusy} onClick={() => deleteSavedPlace(place)} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={15}/></button>
                    </div>
                  })}
                </div>
              ) : (
                <form onSubmit={saveSavedPlace} className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {['HOME','WORK','FAVOURITE'].map(category => <button key={category} type="button" onClick={() => { setSavedPlaceCategory(category); if (!editingSavedPlace) setSavedPlaceLabel(category === 'HOME' ? 'Home' : category === 'WORK' ? 'Work' : '') }} className={'rounded-lg border px-2 py-2 text-xs font-bold ' + (savedPlaceCategory === category ? 'border-wayz-blue bg-blue-50 text-wayz-blue' : 'border-slate-200 text-slate-500')}>{category === 'FAVOURITE' ? 'Favourite' : category === 'HOME' ? 'Home' : 'Work'}</button>)}
                  </div>
                  <label className="block text-xs font-semibold text-slate-600">Place label</label>
                  <input value={savedPlaceLabel} onChange={event => setSavedPlaceLabel(event.target.value)} maxLength={40} required placeholder="e.g. Home, Office, Temple" className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-wayz-blue focus:ring-2 focus:ring-blue-100"/>
                  <GooglePlaceField label="SELECT LOCATION" placeholder="Search for a place" labelTone="dark" value={savedPlaceLocation} onSelect={setSavedPlaceLocation} savedPlaces={[]} />
                  <button type="submit" disabled={savedPlaceBusy} className="flex min-h-11 w-full items-center justify-center rounded-lg bg-wayz-yellow px-4 py-2.5 text-sm font-bold text-wayz-ink disabled:opacity-60">{savedPlaceBusy ? 'Saving…' : savedPlacesMode === 'edit' ? 'Update place' : 'Save place'}</button>
                  {savedPlacesMode === 'add' && <button type="button" onClick={() => { setSavedPlacesMode('list'); setSavedPlaceError(''); refreshSavedPlaces() }} className="w-full py-2 text-sm font-semibold text-wayz-blue">View saved places ({savedPlaces.length})</button>}
                </form>
              )}
              {savedPlaceError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{savedPlaceError}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
