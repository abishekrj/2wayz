import { useEffect, useRef, useState } from 'react'
import { MapPin, LoaderCircle, X, Home, BriefcaseBusiness, Star } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

let mapsPromise

export function loadGoogleMaps() {
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

export default function GooglePlaceField({ label, placeholder, icon: Icon = MapPin, tone = 'green', value, onSelect, onFocus, enableCurrentLocation = false, savedPlaces = [], labelTone = 'light' }) {
  const inputRef = useRef(null)
  const fieldRef = useRef(null)
  const placesRef = useRef(null)
  const requestRef = useRef(0)
  const autoLocationRequested = useRef(false)
  const valueRef = useRef(value)
  valueRef.current = value
  const [editing, setEditing] = useState(!value)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
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
    if (!editing || (!dropdownOpen && suggestions.length === 0)) return
    function closeOnOutsidePointer(event) {
      if (!fieldRef.current?.contains(event.target)) {
        setSuggestions([])
        setDropdownOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [editing, dropdownOpen, suggestions.length])

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
        const result = await adminApi.reverseGeocode(position.coords.latitude, position.coords.longitude)
        if (!result.place) throw new Error('Could not identify your current location. Please search for your pickup point.')
        if (!valueRef.current) onSelect({ ...result.place, source: 'current-location' })
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
    setDropdownOpen(true)
    setQuery(selectedName)
    setSuggestions([])
    setEditing(true)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      const end = inputRef.current?.value.length || 0
      inputRef.current?.setSelectionRange(end, end)
    })
  }

  function chooseSavedPlace(place) {
    setSuggestions([])
    setDropdownOpen(false)
    setQuery('')
    setEditing(false)
    setError('')
    onSelect({
      source: 'saved-place',
      placeId: place.placeId || undefined,
      name: place.name,
      address: place.address,
      location: { lat: place.latitude, lng: place.longitude },
    })
  }

  async function chooseSuggestion(suggestion) {
    try {
      setSearching(true)
      const place = suggestion.placePrediction.toPlace()
      await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location'] })
      const name = place.displayName || place.formattedAddress || 'Selected place'
      setSuggestions([])
      setDropdownOpen(false)
      setQuery('')
      setEditing(false)
      setError('')
      onSelect({
        source: 'search',
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
    <div ref={fieldRef} className="relative z-10 min-w-0 focus-within:z-[60]">
      <span className={`mb-2 block text-[11px] font-bold tracking-[.13em] ${labelTone === 'dark' ? 'text-wayz-blue' : 'text-white'}`}>{label}</span>
      <div
        onClick={() => { if (selectedName && !editing) startEditing() }}
        className={`relative flex min-h-[56px] items-center rounded-xl border-2 border-slate-300 bg-white pl-14 pr-3 shadow-sm transition-colors duration-150 hover:border-slate-400 focus-within:border-[#2563a6] focus-within:ring-4 focus-within:ring-blue-100 ${tone === 'red' ? 'text-rose-500' : 'text-emerald-600'} ${selectedName && !editing ? 'cursor-text' : ''}`}
      >
        <Icon size={27} className="absolute left-3 top-1/2 z-[99] box-content h-8 w-8 -translate-y-1/2 bg-white" />
        {editing ? (
          <input
            ref={inputRef}
            value={query}
            onChange={event => { setQuery(event.target.value); setError('') }}
            onFocus={() => { setError(''); setDropdownOpen(true); onFocus?.() }}
            onKeyDown={event => { if (event.key === 'Escape') { setSuggestions([]); setDropdownOpen(false); if (selectedName) setEditing(false) } }}
            placeholder={placeholder}
            autoComplete="off"
            className="h-[52px] min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] font-medium text-slate-800 outline-none ring-0 placeholder:text-slate-400 focus:border-0 focus:outline-none focus:ring-0"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate py-2 text-left text-sm font-semibold text-slate-800">{selectedName}</span>
        )}
        {(loading || searching || locating) && <LoaderCircle className="ml-2 shrink-0 animate-spin text-slate-400" size={17} />}
        {selectedName && !editing && (
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()}`}
            title="Clear location"
            onClick={event => {
              event.stopPropagation()
              setQuery('')
              setSuggestions([])
              setError('')
              setEditing(true)
              onSelect(null)
              requestAnimationFrame(() => inputRef.current?.focus())
            }}
            className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wayz-blue"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {editing && (dropdownOpen || suggestions.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-[70] mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {savedPlaces.length > 0 && !query.trim() && (
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Saved places</p>
              {savedPlaces.map(place => {
                const SavedIcon = place.category === 'HOME' ? Home : place.category === 'WORK' ? BriefcaseBusiness : Star
                return (
                  <button key={place.id} type="button" onMouseDown={event => event.preventDefault()} onClick={() => chooseSavedPlace(place)} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-blue-50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-wayz-blue"><SavedIcon size={17}/></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{place.label}</span>
                      <span className="block truncate text-xs text-slate-500">{place.address || place.name}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
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
