import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, MapPinned } from 'lucide-react'

export default function RouteMap({ route, driverLocation = null, pickup = null, destination = null }) {
  const mapElementRef = useRef(null)
  const [mapError, setMapError] = useState('')
  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef(null)
  const driverMarkerRef = useRef(null)
  const driverRoutePolylineRef = useRef(null)
  const driverRouteRequestRef = useRef({ lat: null, lng: null, requestedAt: 0 })

  useEffect(() => {
    let active = true
    let polylines = []
    let markers = []

    async function renderRoute() {
      try {
        if (!window.google?.maps?.importLibrary) throw new Error('Google Maps is not available. Please reload the page.')
        const [{ Map }, { LatLngBounds }] = await Promise.all([
          window.google.maps.importLibrary('maps'),
          window.google.maps.importLibrary('core'),
        ])
        if (!active || !mapElementRef.current) return

        const hasCoordinates = pickup?.lat != null && pickup?.lng != null && destination?.lat != null && destination?.lng != null &&
          [pickup.lat, pickup.lng, destination.lat, destination.lng].every(value => Number.isFinite(Number(value)))
        const map = new Map(mapElementRef.current, {
          center: hasCoordinates ? { lat: Number(pickup.lat), lng: Number(pickup.lng) } : { lat: 12.2253, lng: 79.0747 },
          zoom: 13, mapId: 'DEMO_MAP_ID', mapTypeControl: false, streetViewControl: false,
          fullscreenControl: true, clickableIcons: false,
        })
        mapRef.current = map

        if (route?.createPolylines && route?.createWaypointAdvancedMarkers) {
          polylines = route.createPolylines({ polylineOptions: { strokeColor: '#2563eb', strokeOpacity: 0.95, strokeWeight: 6 } })
          polylines.forEach(polyline => polyline.setMap(map))
          markers = await route.createWaypointAdvancedMarkers({ map })
          if (!active) {
            polylines.forEach(polyline => polyline.setMap(null))
            markers.forEach(marker => { marker.map = null })
            return
          }
          markers.forEach(marker => { marker.map = map })
          const bounds = new LatLngBounds()
          route.path?.forEach(point => bounds.extend(point))
          if (route.path?.length) map.fitBounds(bounds, 48)
        } else if (hasCoordinates) {
          // Use the current Google Maps Routes Library rather than the legacy service.
          const { Route: GoogleRoute } = await window.google.maps.importLibrary('routes')
          if (!active) return
          const result = await GoogleRoute.computeRoutes({
            origin: { lat: Number(pickup.lat), lng: Number(pickup.lng) },
            destination: { lat: Number(destination.lat), lng: Number(destination.lng) },
            travelMode: 'DRIVING',
            fields: ['path'],
          })
          if (!active) return
          const calculatedRoute = result.routes?.[0]
          if (!calculatedRoute?.path?.length) {
            throw new Error('Google Maps could not find a driving route for these pickup and destination points.')
          }
          polylines = calculatedRoute.createPolylines({
            polylineOptions: { strokeColor: '#2563eb', strokeOpacity: 0.95, strokeWeight: 6 },
          })
          polylines.forEach(polyline => polyline.setMap(map))
          markers = await calculatedRoute.createWaypointAdvancedMarkers({ map })
          if (!active) {
            polylines.forEach(polyline => polyline.setMap(null))
            markers.forEach(marker => { marker.map = null })
            return
          }
          markers.forEach(marker => { marker.map = map })
          const bounds = new LatLngBounds()
          calculatedRoute.path.forEach(point => bounds.extend(point))
          map.fitBounds(bounds, 48)
        } else {
          setMapError('The saved route coordinates are unavailable for this ride.')
        }
      } catch (error) {
        if (active) setMapError(error.message || 'Unable to display the route map.')
      } finally {
        if (active) {
          setMapReady(true)
          setLoading(false)
        }
      }
    }

    setLoading(true)
    setMapReady(false)
    setMapError('')
    renderRoute()
    return () => {
      active = false
      mapRef.current = null
      setMapReady(false)
      if (driverMarkerRef.current) { driverMarkerRef.current.map = null; driverMarkerRef.current = null }
      if (driverRoutePolylineRef.current) { driverRoutePolylineRef.current.setMap(null); driverRoutePolylineRef.current = null }
      driverRouteRequestRef.current = { lat: null, lng: null, requestedAt: 0 }
      polylines.forEach(polyline => polyline.setMap(null))
      markers.forEach(marker => { marker.map = null })
    }
  }, [route, pickup?.lat, pickup?.lng, destination?.lat, destination?.lng])

  useEffect(() => {
    let active = true
    async function updateDriverMarker() {
      const map = mapRef.current
      if (!map || !driverLocation || !Number.isFinite(Number(driverLocation.lat)) || !Number.isFinite(Number(driverLocation.lng))) {
        if (driverMarkerRef.current) { driverMarkerRef.current.map = null; driverMarkerRef.current = null }
        return
      }
      try {
        const { AdvancedMarkerElement, PinElement } = await window.google.maps.importLibrary('marker')
        if (!active || !mapRef.current) return
        const position = { lat: Number(driverLocation.lat), lng: Number(driverLocation.lng) }
        const pin = new PinElement({ background: '#facc15', borderColor: '#0f172a', glyphColor: '#0f172a', glyph: '🚕', scale: 1.5 })
        if (!driverMarkerRef.current) {
          driverMarkerRef.current = new AdvancedMarkerElement({ map: mapRef.current, position, title: 'Your assigned auto driver', content: pin.element })
        } else {
          driverMarkerRef.current.position = position
        }

        // Keep the live auto visible if it moves beyond the current map viewport.
        // Do not recenter on every GPS heartbeat when the marker is already visible.
        const bounds = mapRef.current.getBounds()
        if (!bounds || !bounds.contains(position)) {
          mapRef.current.panTo(position)
        }
      } catch (error) {
        console.error('Unable to update driver map marker:', error)
      }
    }
    updateDriverMarker()
    return () => { active = false }
  }, [driverLocation?.lat, driverLocation?.lng, mapReady])

  useEffect(() => {
    let active = true

    async function updateDriverToPickupRoute() {
      const map = mapRef.current
      const hasDriver = driverLocation && Number.isFinite(Number(driverLocation.lat)) && Number.isFinite(Number(driverLocation.lng))
      const hasPickup = pickup?.lat != null && pickup?.lng != null && Number.isFinite(Number(pickup.lat)) && Number.isFinite(Number(pickup.lng))

      if (!map || !hasDriver || !hasPickup || !mapReady) {
        if (!hasDriver && driverRoutePolylineRef.current) {
          driverRoutePolylineRef.current.setMap(null)
          driverRoutePolylineRef.current = null
        }
        return
      }

      const origin = { lat: Number(driverLocation.lat), lng: Number(driverLocation.lng) }
      const previous = driverRouteRequestRef.current
      const toRadians = value => value * Math.PI / 180
      const latDistance = toRadians(origin.lat - previous.lat)
      const lngDistance = toRadians(origin.lng - previous.lng)
      const distance = previous.lat == null ? Infinity : 6371000 * 2 * Math.asin(Math.sqrt(
        Math.sin(latDistance / 2) ** 2 + Math.cos(toRadians(previous.lat)) * Math.cos(toRadians(origin.lat)) * Math.sin(lngDistance / 2) ** 2
      ))
      const elapsed = Date.now() - previous.requestedAt
      // Avoid a Routes API request for every 5-second GPS heartbeat.
      if (distance < 25 && elapsed < 15000) return
      driverRouteRequestRef.current = { ...origin, requestedAt: Date.now() }

      try {
        const { Route: GoogleRoute } = await window.google.maps.importLibrary('routes')
        const result = await GoogleRoute.computeRoutes({
          origin,
          destination: { lat: Number(pickup.lat), lng: Number(pickup.lng) },
          travelMode: 'DRIVING',
          fields: ['path'],
        })
        if (!active || !mapRef.current) return
        const calculatedRoute = result.routes?.[0]
        if (!calculatedRoute?.path?.length) return

        const nextPolylines = calculatedRoute.createPolylines({
          polylineOptions: { strokeColor: '#16a34a', strokeOpacity: 0.95, strokeWeight: 5, zIndex: 2 },
        })
        nextPolylines.forEach(polyline => polyline.setMap(mapRef.current))
        if (driverRoutePolylineRef.current) driverRoutePolylineRef.current.setMap(null)
        driverRoutePolylineRef.current = nextPolylines[0] || null
        nextPolylines.slice(1).forEach(polyline => polyline.setMap(null))
      } catch (error) {
        console.error('Unable to update driver-to-pickup route:', error)
      }
    }

    updateDriverToPickupRoute()
    return () => { active = false }
  }, [driverLocation?.lat, driverLocation?.lng, pickup?.lat, pickup?.lng, mapReady])

  return (
    <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-blue-100 bg-slate-100 sm:min-h-[340px] lg:h-full lg:min-h-[390px]">
      <div ref={mapElementRef} className="absolute inset-0" aria-label="Map showing the route and assigned driver location" />
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-slate-100/90 text-sm font-medium text-slate-600">
          <LoaderCircle size={18} className="animate-spin" /> Loading route map…
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-100 px-5 text-center text-sm text-slate-600">
          <MapPinned size={24} className="text-wayz-blue" />
          <span>{mapError}</span>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg bg-white/95 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-sm">
        A <span className="mx-1">Pickup</span>
        <span className="mx-2 text-slate-300">|</span>
        B <span className="ml-1">Destination</span>
        {driverLocation && <><span className="mx-2 text-slate-300">|</span><span>Driver</span></>}
      </div>
    </div>
  )
}
