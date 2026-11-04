import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CarFront, Clock3, MapPinned, RefreshCw, Search, Wifi, WifiOff } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

let mapsLoader
function loadGoogleMaps() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!key) return Promise.reject(new Error('Add VITE_GOOGLE_MAPS_API_KEY to your .env.local file to display the live driver map.'))
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps)
  if (!mapsLoader) mapsLoader = new Promise((resolve, reject) => {
    const callbackName = '__twoWayzLiveMapReady'
    window[callbackName] = () => resolve(window.google.maps)
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${callbackName}`
    script.async = true
    script.onerror = () => { mapsLoader = null; reject(new Error('Google Maps could not load. Check the API key and enabled Maps JavaScript API.')) }
    document.head.appendChild(script)
  })
  return mapsLoader
}

const timeAgo = value => {
  if (!value) return 'No GPS update'
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export default function AdminLiveDriverMapPage() {
  const [drivers, setDrivers] = useState([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [mapError, setMapError] = useState('')
  const [mapReady, setMapReady] = useState(false)
  const mapElement = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(new Map())

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    try {
      const result = await adminApi.liveDrivers()
      setDrivers(result.drivers || [])
      setError('')
    } catch (err) {
      setError(err.message || 'Could not load live driver locations.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(() => load(true), 5000)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    let active = true
    async function initialize() {
      try {
        await loadGoogleMaps()
        const { Map } = await window.google.maps.importLibrary('maps')
        if (!active || !mapElement.current) return
        mapRef.current = new Map(mapElement.current, {
          center: { lat: 12.2253, lng: 79.0747 },
          zoom: 13,
          mapId: 'DEMO_MAP_ID',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false
        })
        setMapReady(true)
        setMapError('')
      } catch (err) {
        if (active) setMapError(err.message || 'Unable to initialize Google Maps.')
      }
    }
    initialize()
    return () => {
      active = false
      markersRef.current.forEach(marker => { marker.map = null })
      markersRef.current.clear()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    let active = true
    async function syncMarkers() {
      if (!mapReady || !mapRef.current) return
      try {
        const { AdvancedMarkerElement, PinElement } = await window.google.maps.importLibrary('marker')
        if (!active) return
        const validDrivers = drivers.filter(driver => Number.isFinite(Number(driver.currentLat)) && Number.isFinite(Number(driver.currentLng)) && driver.currentLat != null && driver.currentLng != null)
        const visibleIds = new Set(validDrivers.map(driver => driver.id))
        markersRef.current.forEach((marker, id) => {
          if (!visibleIds.has(id)) { marker.map = null; markersRef.current.delete(id) }
        })
        validDrivers.forEach(driver => {
          const stale = !driver.locationIsFresh
          const background = stale ? '#f59e0b' : driver.isOnTrip ? '#2563eb' : '#16a34a'
          const pin = new PinElement({ background, borderColor: '#ffffff', glyphColor: '#ffffff', glyphText: 'A', scale: 1.2 })
          const title = `${driver.name} · ${driver.vehicleNumber}${stale ? ' · GPS stale' : ''}`
          let marker = markersRef.current.get(driver.id)
          if (!marker) {
            marker = new AdvancedMarkerElement({ map: mapRef.current, position: { lat: Number(driver.currentLat), lng: Number(driver.currentLng) }, title, content: pin.element })
            marker.addListener('click', () => setSelectedId(driver.id))
            markersRef.current.set(driver.id, marker)
          } else {
            marker.position = { lat: Number(driver.currentLat), lng: Number(driver.currentLng) }
            marker.title = title
            marker.content = pin.element
            marker.map = mapRef.current
          }
        })
      } catch (err) {
        if (active) setMapError(err.message || 'Unable to update driver markers.')
      }
    }
    syncMarkers()
    return () => { active = false }
  }, [drivers, mapReady])

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return drivers
    return drivers.filter(driver => [driver.name, driver.phone, driver.vehicleNumber, driver.serviceArea].some(value => String(value || '').toLowerCase().includes(query)))
  }, [drivers, search])

  const selected = drivers.find(driver => driver.id === selectedId) || null
  const withLocation = drivers.filter(driver => driver.currentLat != null && driver.currentLng != null)
  const freshCount = drivers.filter(driver => driver.locationIsFresh).length
  const staleCount = drivers.length - freshCount
  const tripCount = drivers.filter(driver => driver.isOnTrip).length

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Driver operations</p>
        <h1 className="mt-2 text-3xl font-extrabold text-wayz-ink">Live Driver Map</h1>
        <p className="mt-2 text-sm text-slate-500">Monitor approved drivers who are currently online. Locations refresh every 5 seconds.</p>
      </div>
      <button onClick={() => load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-60">
        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''}/> Refresh
      </button>
    </div>

    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Online drivers</p><p className="mt-2 text-2xl font-extrabold text-wayz-ink">{drivers.length}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Fresh GPS · under 60 sec</p><p className="mt-2 text-2xl font-extrabold text-emerald-600">{freshCount}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Stale / missing GPS</p><p className="mt-2 text-2xl font-extrabold text-amber-600">{staleCount}</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">On an active trip</p><p className="mt-2 text-2xl font-extrabold text-blue-600">{tripCount}</p></div>
    </div>

    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="font-bold text-wayz-ink">Tiruvannamalai driver locations</h2>
          <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-600"/>Available</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-blue-600"/>On trip</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-500"/>GPS stale</span>
          </div>
        </div>
        <div className="relative h-[520px] bg-slate-100">
          <div ref={mapElement} className="absolute inset-0"/>
          {mapError && <div className="absolute inset-0 flex items-center justify-center bg-slate-100/95 p-6 text-center text-sm text-rose-700">{mapError}</div>}
          {!mapReady && !mapError && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">Loading Google Map…</div>}
          {mapReady && withLocation.length === 0 && <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-lg bg-white/95 px-4 py-2 text-xs font-semibold text-slate-600 shadow">No driver GPS locations available yet</div>}
        </div>
      </section>

      <aside className="min-w-0">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, mobile or vehicle" aria-label="Search online drivers" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-wayz-blue"/>
        </div>
        <p className="mt-3 text-xs text-slate-500">Showing {filteredDrivers.length} of {drivers.length} online drivers</p>
        <div className="mt-3 max-h-[465px] space-y-3 overflow-y-auto pr-1">
          {loading ? <p className="rounded-xl border bg-white p-5 text-sm text-slate-500">Loading online drivers…</p>
            : filteredDrivers.length === 0 ? <p className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-slate-500">No online drivers found.</p>
            : filteredDrivers.map(driver => <button key={driver.id} onClick={() => { setSelectedId(driver.id); if (driver.currentLat != null && driver.currentLng != null && mapRef.current) mapRef.current.panTo({ lat: Number(driver.currentLat), lng: Number(driver.currentLng) }) }} className={`w-full rounded-xl border p-4 text-left transition hover:border-wayz-blue ${selectedId === driver.id ? 'border-wayz-blue bg-blue-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-2"><span className="font-bold text-wayz-ink">{driver.name}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${driver.locationIsFresh ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{driver.locationIsFresh ? 'GPS live' : 'GPS stale'}</span></div>
                <p className="mt-1 text-xs text-slate-500">{driver.phone} · {driver.vehicleNumber}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">{driver.isOnTrip ? <CarFront size={14}/> : <Wifi size={14}/>} {driver.isOnTrip ? `On trip · ${driver.activeBooking?.reference || ''}` : 'Available for rides'}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400"><Clock3 size={13}/>{timeAgo(driver.locationUpdatedAt)}</p>
              </button>)}
        </div>
        {selected && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-2 font-bold text-wayz-ink"><MapPinned size={17}/> {selected.name}</div>
          <p className="mt-2 text-xs text-slate-600">{selected.phone} · {selected.vehicleNumber}</p>
          <p className="mt-1 text-xs text-slate-600">Service area: {selected.serviceArea}</p>
          {selected.activeBooking && <p className="mt-2 text-xs text-slate-700">Ride {selected.activeBooking.reference}: {selected.activeBooking.pickupName} → {selected.activeBooking.destinationName}</p>}
          {selected.currentLat != null && <p className="mt-2 break-all text-[11px] text-slate-500">GPS: {Number(selected.currentLat).toFixed(6)}, {Number(selected.currentLng).toFixed(6)}</p>}
          {!selected.locationIsFresh && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertTriangle size={14}/> Location is older than 60 seconds.</p>}
        </div>}
      </aside>
    </div>
    <p className="mt-4 text-[11px] text-slate-400">Driver locations are visible only to Super Admin. The map itself is loaded once; automatic refresh reads GPS data from the 2WAYZ API, not from Google Maps.</p>
  </div>
}
