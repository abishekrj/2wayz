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

export default function GooglePlaceField({ label, placeholder, icon: Icon = MapPin, tone = 'green', value, onSelect }) {
  const hostRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(!value)
  const selectedName = value?.name || ''
  const [autocompleteVersion, setAutocompleteVersion] = useState(0)

  useEffect(() => {
    let alive = true
    let element
    let handleSelect

    setLoading(true)
    loadGoogleMaps().then(async maps => {
      const places = await maps.importLibrary('places')
      if (!alive || !hostRef.current) return

      element = new places.PlaceAutocompleteElement({ includedRegionCodes: ['in'] })
      element.placeholder = placeholder
      if (editing && value?.name) element.value = value.name
      element.noInputIcon = true
      element.style.border = '0'
      element.style.borderRadius = '0'
      element.style.backgroundColor = 'transparent'
      element.requestedLanguage = 'en'
      element.requestedRegion = 'IN'
      element.locationBias = { north: 12.34, south: 12.10, east: 79.20, west: 78.94 }
      element.className = 'wayz-google-autocomplete'

      handleSelect = async event => {
        try {
          const place = event.placePrediction.toPlace()
          await place.fetchFields({ fields: ['id', 'displayName', 'formattedAddress', 'location'] })
          const name = place.displayName || place.formattedAddress || 'Selected place'
          onSelectRef.current({
            placeId: place.id,
            name,
            address: place.formattedAddress || name,
            location: place.location
              ? { lat: place.location.lat(), lng: place.location.lng() }
              : null,
          })
          setError('')
          setEditing(false)
        } catch {
          setError('Could not read this location. Please select another suggestion.')
        }
      }

      element.addEventListener('gmp-select', handleSelect)
      element.addEventListener('gmp-error', () => setError('Google Places could not find suggestions.'))
      hostRef.current.style.visibility = 'visible'
      hostRef.current.replaceChildren(element)
      setLoading(false)
      if (editing) {
        requestAnimationFrame(() => {
          const input = element?.shadowRoot?.querySelector('input')
          if (!input) {
            element?.focus()
            return
          }
          input.focus()
          const end = input.value.length
          input.setSelectionRange(end, end)
        })
      }
    }).catch(err => {
      if (alive) {
        setError(err.message)
        setLoading(false)
      }
    })

    return () => {
      alive = false
      if (element && handleSelect) element.removeEventListener('gmp-select', handleSelect)
    }
  }, [placeholder, autocompleteVersion, editing, value?.name])

  function changePlace() {
    setError('')
    setEditing(true)
    setAutocompleteVersion(version => version + 1)
  }

  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-[11px] font-bold tracking-[.13em] text-slate-600">{label}</span>
      <span
        onClick={() => {
          if (selectedName && !editing) changePlace()
        }}
        className={`relative flex min-h-[58px] items-center rounded-xl border border-slate-200 bg-white pl-[64px] pr-3 transition focus-within:border-2 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100 ${tone === 'red' ? 'text-rose-500' : 'text-emerald-600'} ${selectedName && !editing ? 'cursor-text' : ''}`}
      >
        <Icon size={36} className="absolute left-3 top-1/2 z-[99] box-content h-10 w-10 -translate-y-1/2 bg-white" />
        {selectedName && !editing ? (
          <span className="min-w-0 flex-1 truncate py-2 text-left text-sm font-semibold text-slate-800">
            {selectedName}
          </span>
        ) : (
          <span ref={hostRef} className="min-w-0 flex-1" />
        )}
        {loading && (!selectedName || editing) && <LoaderCircle className="ml-2 animate-spin text-slate-400" size={17} />}
      </span>
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  )
}
