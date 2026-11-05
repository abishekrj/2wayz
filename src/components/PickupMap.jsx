import { useEffect, useRef, useState } from 'react'
import { LocateFixed, MapPin } from 'lucide-react'
import { loadGoogleMaps } from './GooglePlaceField'
import { adminApi } from '../lib/adminApi'

const TIRUVANNAMALAI_CENTER = { lat: 12.2253, lng: 79.0747 }

export default function PickupMap({ value, onSelect, activeField = 'pickup', route = null }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const dragTimerRef = useRef(null)
  const requestRef = useRef(0)
  const onSelectRef = useRef(onSelect)
  const routeRef = useRef(route)
  onSelectRef.current = onSelect
  routeRef.current = route
  const [status, setStatus] = useState('Loading map…')
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    let mounted = true
    let map
    let dragListener

    loadGoogleMaps()
      .then(() => window.google.maps.importLibrary('maps'))
      .then(({ Map }) => {
        if (!mounted || !containerRef.current) return
        const initialCenter = value?.location || TIRUVANNAMALAI_CENTER
        map = new Map(containerRef.current, {
          center: initialCenter,
          mapId: 'DEMO_MAP_ID',
          zoom: value?.location ? 17 : 15,
          minZoom: 12,
          maxZoom: 20,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
          keyboardShortcuts: false,
          backgroundColor: '#eaf1f8',
        })
        mapRef.current = map
        dragListener = map.addListener('dragend', () => {
          if (routeRef.current) return
          const center = map.getCenter()
          if (!center) return
          const lat = center.lat()
          const lng = center.lng()
          const requestId = ++requestRef.current
          window.clearTimeout(dragTimerRef.current)
          setStatus('Updating map location…')
          dragTimerRef.current = window.setTimeout(async () => {
            try {
              const result = await adminApi.reverseGeocode(lat, lng)
              if (!mounted || requestId !== requestRef.current || !result.place) return
              onSelectRef.current({ ...result.place, source: 'map', name: result.place.address || result.place.name })
              setStatus('')
            } catch {
              if (mounted && requestId === requestRef.current) {
                setStatus('Could not identify this point. You can search for the location.')
              }
            }
          }, 450)
        })
        setMapReady(true)
        setStatus(value?.location ? '' : `Move the map to choose your ${activeField === 'destination' ? 'drop' : 'pickup'} point`)
      })
      .catch(() => {
        if (mounted) setStatus('Map unavailable. You can still search for a location.')
      })

    return () => {
      mounted = false
      window.clearTimeout(dragTimerRef.current)
      requestRef.current += 1
      if (dragListener) dragListener.remove()
      if (map && window.google?.maps?.event) window.google.maps.event.clearInstanceListeners(map)
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    requestRef.current += 1
    window.clearTimeout(dragTimerRef.current)
    const map = mapRef.current
    const location = value?.location
    if (!map || !location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) return
    const current = map.getCenter()
    if (current && Math.abs(current.lat() - Number(location.lat)) < 0.00002 && Math.abs(current.lng() - Number(location.lng)) < 0.00002) return
    map.panTo({ lat: Number(location.lat), lng: Number(location.lng) })
    map.setZoom(17)
    setStatus('')
  }, [value?.location?.lat, value?.location?.lng, mapReady, activeField])


  useEffect(() => {
    let active = true
    let polylines = []
    let markers = []
    async function showRoute() {
      const map = mapRef.current
      if (!map || !route) return
      try {
        const { LatLngBounds } = await window.google.maps.importLibrary('core')
        polylines = route.createPolylines({ polylineOptions: { strokeColor: '#073B83', strokeOpacity: 0.95, strokeWeight: 6 } })
        polylines.forEach(line => line.setMap(map))
        markers = await route.createWaypointAdvancedMarkers({ map })
        if (!active) {
          polylines.forEach(line => line.setMap(null))
          markers.forEach(marker => { marker.map = null })
          return
        }
        const bounds = new LatLngBounds()
        route.path?.forEach(point => bounds.extend(point))
        if (route.path?.length) map.fitBounds(bounds, 56)
        setStatus('')
      } catch {
        if (active) setStatus('Route preview is temporarily unavailable.')
      }
    }
    if (route) showRoute()
    return () => {
      active = false
      polylines.forEach(line => line.setMap(null))
      markers.forEach(marker => { marker.map = null })
    }
  }, [route, mapReady])

  return (
    <div className="relative h-[250px] w-full overflow-hidden bg-[#eaf1f8] sm:h-[330px] lg:h-[390px]">
      <div ref={containerRef} className="absolute inset-0" aria-label={route ? "Map showing selected driving route" : "Map to choose your pickup or destination location"} />
      {mapReady && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center">
            <span className={`relative mb-2 whitespace-nowrap rounded-lg border border-white/80 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-x-[7px] after:border-t-[7px] after:border-x-transparent after:content-[''] ${activeField === 'destination' ? 'bg-rose-600 after:border-t-rose-600' : 'bg-[#073B83] after:border-t-[#073B83]'}`}>{activeField === 'destination' ? 'Drop point' : 'Pickup point'}</span>
            <div className="relative">
              <MapPin size={43} fill={activeField === "destination" ? "#e11d48" : "#073B83"} stroke="white" strokeWidth={1.8} className="drop-shadow-[0_3px_5px_rgba(0,0,0,0.35)]" />
              <span className="absolute left-1/2 top-[13px] h-2 w-2 -translate-x-1/2 rounded-full bg-white" />
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/80 bg-white/95 px-3.5 py-2 text-[11px] font-semibold text-wayz-ink shadow-lg backdrop-blur-sm">
            <LocateFixed size={14} className="text-wayz-blue" />
            {`Drag the map to adjust ${activeField === 'destination' ? 'drop-off' : 'pickup'}`}
          </div>
        </>
      )}
      {status && (
        <div role="status" className="absolute left-1/2 top-4 z-20 max-w-[90%] -translate-x-1/2 rounded-full border border-white/80 bg-white/95 px-4 py-2 text-center text-[11px] font-semibold text-slate-700 shadow-md">
          {status}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#f5f8fc]/65 to-transparent" />
    </div>
  )
}
