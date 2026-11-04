import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, MapPinned } from 'lucide-react'

export default function SharedTripMap({ trip }) {
  const elementRef = useRef(null)
  const mapRef = useRef(null)
  const driverMarkerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!trip || mapRef.current) return
    let active = true
    async function initialize() {
      try {
        if (!window.google?.maps?.importLibrary) throw new Error('Map is temporarily unavailable.')
        const [{ Map, InfoWindow }, { LatLngBounds }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
          window.google.maps.importLibrary('maps'),
          window.google.maps.importLibrary('core'),
          window.google.maps.importLibrary('marker')
        ])
        if (!active || !elementRef.current) return
        const pickup = { lat: Number(trip.pickupLat), lng: Number(trip.pickupLng) }
        const destination = { lat: Number(trip.destinationLat), lng: Number(trip.destinationLng) }
        const map = new Map(elementRef.current, {
          center: pickup, zoom: 13, mapId: 'DEMO_MAP_ID',
          mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
          clickableIcons: false
        })
        mapRef.current = map
        const bounds = new LatLngBounds()
        bounds.extend(pickup); bounds.extend(destination)
        const pickupPin = new PinElement({ background: '#16a34a', borderColor: '#14532d', glyphColor: '#ffffff', glyphText: 'P' })
        const destinationPin = new PinElement({ background: '#e11d48', borderColor: '#881337', glyphColor: '#ffffff', glyphText: 'D' })
        new AdvancedMarkerElement({ map, position: pickup, title: 'Pickup', content: pickupPin.element })
        new AdvancedMarkerElement({ map, position: destination, title: 'Destination', content: destinationPin.element })
        map.fitBounds(bounds, 60)
        setReady(true)
      } catch (err) {
        if (active) setError(err.message || 'Unable to load the map.')
      }
    }
    initialize()
    return () => { active = false; mapRef.current = null; driverMarkerRef.current = null }
  }, [trip?.pickupLat, trip?.pickupLng, trip?.destinationLat, trip?.destinationLng])

  useEffect(() => {
    let active = true
    async function updateDriver() {
      const map = mapRef.current
      if (!map || !ready) return
      if (!trip?.driver?.locationIsFresh || !Number.isFinite(Number(trip.driver.currentLat)) || !Number.isFinite(Number(trip.driver.currentLng))) {
        if (driverMarkerRef.current) { driverMarkerRef.current.map = null; driverMarkerRef.current = null }
        return
      }
      try {
        const { AdvancedMarkerElement, PinElement } = await window.google.maps.importLibrary('marker')
        if (!active || !mapRef.current) return
        const position = { lat: Number(trip.driver.currentLat), lng: Number(trip.driver.currentLng) }
        if (!driverMarkerRef.current) {
          const pin = new PinElement({ background: '#facc15', borderColor: '#0f172a', glyphColor: '#0f172a', glyphText: 'A', scale: 1.2 })
          driverMarkerRef.current = new AdvancedMarkerElement({ map, position, title: 'Assigned auto driver', content: pin.element })
        } else {
          driverMarkerRef.current.position = position
          driverMarkerRef.current.map = map
        }
      } catch (err) { console.error('Shared trip driver marker update failed:', err) }
    }
    updateDriver()
    return () => { active = false }
  }, [trip?.driver?.currentLat, trip?.driver?.currentLng, trip?.driver?.locationIsFresh, ready])

  return <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-blue-100 bg-slate-100 sm:min-h-[380px]">
    <div ref={elementRef} className="absolute inset-0" aria-label="Shared trip map showing pickup, destination and live driver position" />
    {!ready && !error && <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-100 text-sm text-slate-600"><LoaderCircle size={18} className="animate-spin"/> Loading map…</div>}
    {error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100 px-5 text-center text-sm text-slate-600"><MapPinned size={24} className="text-wayz-blue"/>{error}</div>}
    <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-sm">P · Pickup <span className="mx-2 text-slate-300">|</span>D · Destination <span className="mx-2 text-slate-300">|</span>A · Auto</div>
  </div>
}
