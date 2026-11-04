import { useEffect, useRef, useState } from 'react'
import { MapPin, LoaderCircle } from 'lucide-react'

let mapsPromise

function loadGoogleMaps() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!key) return Promise.reject(new Error('Add VITE_GOOGLE_MAPS_API_KEY to your .env.local file.'))
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps)
  if (!mapsPromise) mapsPromise = new Promise((resolve, reject) => {
    const callbackName = '__wayzGoogleMapsReady'
    window[callbackName] = () => resolve(window.google.maps)
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${callbackName}`
    script.async = true
    script.onerror = () => {
      mapsPromise = null
      reject(new Error('Google Maps could not load. Check the API key and enabled APIs.'))
    }
    document.head.appendChild(script)
  })
  return mapsPromise
}

export default function GooglePlaceField({ label, placeholder, icon: Icon = MapPin, tone = 'green', value, onSelect, enableCurrentLocation = false }) {
  const inputRef = useRef(null)
  const placesRef = useRef(null)
  const requestRef = useRef(0)
  const autoLocationRequested = useRef(false)
  const [editing, setEditing] = useState(!value)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const selectedName = value?.name || ''

  useEffect(() => {
    if (selectedName) {
      setQuery('')
      setSuggestions([])
      setEditing(false)
    } else {
      setEditing(true)
    }
  }, [value, selectedName])

  useEffect(() => {
    let alive = true
    loadGoogleMaps()
      .then(maps => maps.importLibrary('places'))
      .then(places => {
        if (!alive) return
        placesRef.current = places
        setLoading(false)
      })
      .catch(err => {
        if (alive) {
          setError(err.message)
          setLoading(false)
        }
      })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!editing || !query.trim() || !placesRef.current) {
      setSuggestions([])
      return
    }
    const requestId = ++requestRef.current
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const { suggestions: results = [] } = await placesRef.current.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query.trim(),
          includedRegionCodes: ['in'],
          locationBias: { north: 12.34, south: 12.10, east: 79.20, west: 78.94 },
        })
        if (requestId === requestRef.current) setSuggestions(results.filter(item => item.placePrediction).slice(0, 6))
      } catch {
        if (requestId === requestRef.current) setError('Google Places could not find suggestions. Please try again.')
      } finally {
        if (requestId === requestRef.current) setSearching(false)
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query, editing])

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Location is not supported by this browser. Please search for your pickup point.')
      return
    }
    setError('')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        if (!window.google?.maps?.Geocoder) throw new Error('Google Maps is still loading. Please try again.')
        const geocoder = new window.google.maps.Geocoder()
        const result = await geocoder.geocode({
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
        })
        const place = result.results?.[0]
        if (!place) throw new Error('Could not identify your current location. Please search for your pickup point.')
        const name = place.address_components?.find(component =>
          component.types.includes('premise') || component.types.includes('point_of_interest') ||
          component.types.includes('establishment') || component.types.includes('sublocality')
        )?.long_name || place.formatted_address
        onSelect({
          placeId: place.place_id,
          name,
          address: place.formatted_address || name,
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
        })
      } catch (err) {
        setError(err.message || 'Unable to identify your current location. Please search manually.')
      } finally {
        setLocating(false)
      }
    }, error => {
      const message = error.code === 1
        ? 'Location permission was denied. Allow location access in your browser or search for your pickup point.'
        : error.code === 3
          ? 'Getting your location took too long. Please try again.'
          : 'Unable to get your location. Check your GPS or network and try again.'
      setError(message)
      setLocating(false)
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 })
  }

  useEffect(() => {
    if (!enableCurrentLocation || loading || value || autoLocationRequested.current) return
    autoLocationRequested.current = true
    useCurrentLocation()
  }, [enableCurrentLocation, loading, value])

  function startEditing() {
    setError('')
    setQuery(selectedName)
    setSuggestions([])
    setEditing(true)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      const end = inputRef.current?.value.length || 0
      inputRef.current?.setSelectionRange(end, end)
    })
  }

  async function chooseSuggestion(suggestion) {
    try {
      setSearching(true)
      const place = suggestion.placePrediction.toPlace()
      await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location'] })
      const name = place.displayName || place.formattedAddress || 'Selected place'
      setSuggestions([])
      setQuery('')
      setEditing(false)
      setError('')
      onSelect({
        placeId: place.id,
        name,
        address: place.formattedAddress || name,
        location: place.location ? { lat: place.location.lat(), lng: place.location.lng() } : null,
      })
    } catch {
      setError('Could not read this location. Please select another suggestion.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="relative z-40 min-w-0">
      <span className="mb-2 block text-[11px] font-bold tracking-[.13em] text-slate-600">{label}</span>
      <div
        onClick={() => { if (selectedName && !editing) startEditing() }}
        className={`relative flex min-h-[58px] items-center rounded-xl border border-slate-200 bg-white pl-[64px] pr-3 transition focus-within:border-2 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100 ${tone === 'red' ? 'text-rose-500' : 'text-emerald-600'} ${selectedName && !editing ? 'cursor-text' : ''}`}
      >
        <Icon size={36} className="absolute left-3 top-1/2 z-[99] box-content h-10 w-10 -translate-y-1/2 bg-white" />
        {editing ? (
          <input
            ref={inputRef}
            value={query}
            onChange={event => { setQuery(event.target.value); setError('') }}
            onFocus={() => setError('')}
            onKeyDown={event => { if (event.key === 'Escape') { setSuggestions([]); if (selectedName) setEditing(false) } }}
            placeholder={placeholder}
            autoComplete="off"
            className="h-[54px] min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] font-medium text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-0 focus:outline-none focus:ring-0"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate py-2 text-left text-sm font-semibold text-slate-800">{selectedName}</span>
        )}
        {(loading || searching || locating) && <LoaderCircle className="ml-2 shrink-0 animate-spin text-slate-400" size={17} />}
      </div>

      {editing && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-[1000] mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {suggestions.map((item, index) => {
            const prediction = item.placePrediction
            return (
              <button
                key={prediction.placeId || index}
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => chooseSuggestion(item)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-blue-50"
              >
                <MapPin size={17} className="mt-0.5 shrink-0 text-slate-400" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-800">{prediction.mainText?.text || prediction.text?.text}</span>
                  {prediction.secondaryText?.text && <span className="mt-0.5 block truncate text-xs text-slate-500">{prediction.secondaryText.text}</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </div>
  )
}
