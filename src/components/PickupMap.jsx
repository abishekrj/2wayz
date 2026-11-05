import { useEffect, useRef, useState } from 'react'
import { LocateFixed, MapPin } from 'lucide-react'
import { loadGoogleMaps } from './GooglePlaceField'
import { adminApi } from '../lib/adminApi'

const TIRUVANNAMALAI_CENTER = { lat: 12.2253, lng: 79.0747 }

export default function PickupMap({ value, onSelect }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const dragTimerRef = useRef(null)
  const requestRef = useRef(0)
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
          const center = map.getCenter()
          if (!center) return
          const lat = center.lat()
          const lng = center.lng()
          const requestId = ++requestRef.current
          window.clearTimeout(dragTimerRef.current)
          setStatus('Updating pickup point…')
          dragTimerRef.current = window.setTimeout(async () => {
            try {
              const result = await adminApi.reverseGeocode(lat, lng)
              if (!mounted || requestId !== requestRef.current || !result.place) return
              onSelect(result.place)
              setStatus('')
            } catch {
              if (mounted && requestId === requestRef.current) {
                setStatus('Could not identify this point. You can search for the pickup address.')
              }
            }
          }, 450)
        })
        setMapReady(true)
        setStatus(value?.location ? '' : 'Move the map to choose your pickup point')
      })
      .catch(() => {
        if (mounted) setStatus('Map unavailable. You can still search for your pickup location.')
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
    const map = mapRef.current
    const location = value?.location
    if (!map || !location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) return
    const current = map.getCenter()
    if (current && Math.abs(current.lat() - Number(location.lat)) < 0.00002 && Math.abs(current.lng() - Number(location.lng)) < 0.00002) return
    map.panTo({ lat: Number(location.lat), lng: Number(location.lng) })
    map.setZoom(17)
    setStatus('')
  }, [value?.location?.lat, value?.location?.lng, mapReady])

  return (
    <div className="relative h-[285px] w-full overflow-hidden bg-[#eaf1f8] sm:h-[350px] lg:h-[410px]">
      <div ref={containerRef} className="absolute inset-0" aria-label="Map to choose your pickup location" />
      {mapReady && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
            <MapPin size={43} fill="#073B83" stroke="white" strokeWidth={1.8} className="drop-shadow-[0_3px_5px_rgba(0,0,0,0.35)]" />
            <span className="absolute left-1/2 top-[13px] h-2 w-2 -translate-x-1/2 rounded-full bg-wayz-yellow" />
          </div>
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/80 bg-white/95 px-3.5 py-2 text-[11px] font-semibold text-wayz-ink shadow-lg backdrop-blur-sm">
            <LocateFixed size={14} className="text-wayz-blue" />
            Drag the map to adjust pickup
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
