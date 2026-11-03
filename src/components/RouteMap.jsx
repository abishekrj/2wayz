import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, MapPinned } from 'lucide-react'

export default function RouteMap({ route }) {
  const mapElementRef = useRef(null)
  const [mapError, setMapError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let map
    let polylines = []
    let markers = []

    async function renderRoute() {
      try {
        if (!window.google?.maps?.importLibrary) {
          throw new Error('Google Maps is not available. Please reload the page.')
        }

        const [{ Map }, { LatLngBounds }] = await Promise.all([
          window.google.maps.importLibrary('maps'),
          window.google.maps.importLibrary('core'),
        ])

        if (!active || !mapElementRef.current) return

        map = new Map(mapElementRef.current, {
          center: { lat: 12.2253, lng: 79.0747 },
          zoom: 13,
          mapId: 'DEMO_MAP_ID',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        })

        polylines = route.createPolylines({
          polylineOptions: {
            strokeColor: '#2563eb',
            strokeOpacity: 0.95,
            strokeWeight: 6,
          },
        })
        polylines.forEach(polyline => polyline.setMap(map))

        markers = await route.createWaypointAdvancedMarkers()
        if (!active) {
          polylines.forEach(polyline => polyline.setMap(null))
          markers.forEach(marker => { marker.map = null })
          return
        }
        markers.forEach(marker => { marker.map = map })

        const bounds = new LatLngBounds()
        route.path?.forEach(point => bounds.extend(point))
        if (route.path?.length) map.fitBounds(bounds, 48)
      } catch (error) {
        if (active) setMapError(error.message || 'Unable to display the route map.')
      } finally {
        if (active) setLoading(false)
      }
    }

    setLoading(true)
    setMapError('')
    renderRoute()

    return () => {
      active = false
      polylines.forEach(polyline => polyline.setMap(null))
      markers.forEach(marker => { marker.map = null })
    }
  }, [route])

  return (
    <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-blue-100 bg-slate-100 sm:min-h-[340px] lg:h-full lg:min-h-[390px]">
      <div ref={mapElementRef} className="absolute inset-0" aria-label="Map showing the selected pickup, destination and driving route" />
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
      </div>
    </div>
  )
}
