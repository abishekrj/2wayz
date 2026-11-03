import { useEffect, useRef, useState } from 'react'
import { MapPin, LoaderCircle } from 'lucide-react'
let mapsPromise
function loadGoogleMaps() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!key) return Promise.reject(new Error('Add VITE_GOOGLE_MAPS_API_KEY to your .env.local file.'))
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps)
  if (!mapsPromise) mapsPromise = new Promise((resolve,reject) => {
    const callbackName='__wayzGoogleMapsReady'
    window[callbackName]=()=>resolve(window.google.maps)
    const script=document.createElement('script')
    script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${callbackName}`
    script.async=true
    script.onerror=()=>reject(new Error('Google Maps could not load. Check the API key and enabled APIs.'))
    document.head.appendChild(script)
  })
  return mapsPromise
}
export default function GooglePlaceField({label,placeholder,icon:Icon=MapPin,tone='green',onSelect}) {
  const hostRef=useRef(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  useEffect(()=>{
    let alive=true, element, handleSelect
    loadGoogleMaps().then(async maps=>{
      const places=await maps.importLibrary('places')
      if(!alive||!hostRef.current)return
      element=new places.PlaceAutocompleteElement({includedRegionCodes:['in']})
      element.placeholder=placeholder;element.requestedLanguage='en';element.requestedRegion='IN'
      element.locationBias={north:12.34,south:12.10,east:79.20,west:78.94}
      element.className='wayz-google-autocomplete'
      handleSelect=async event=>{
        try {
          const place=event.placePrediction.toPlace()
          await place.fetchFields({fields:['id','displayName','formattedAddress','location']})
          onSelect({placeId:place.id,name:place.displayName||'',address:place.formattedAddress||place.displayName||'',location:place.location?{lat:place.location.lat(),lng:place.location.lng()}:null})
        } catch {setError('Could not read this location. Please select another suggestion.')}
      }
      element.addEventListener('gmp-select',handleSelect)
      element.addEventListener('gmp-error',()=>setError('Google Places could not find suggestions.'))
      hostRef.current.replaceChildren(element);setLoading(false)
    }).catch(err=>{if(alive){setError(err.message);setLoading(false)}})
    return ()=>{alive=false;if(element&&handleSelect)element.removeEventListener('gmp-select',handleSelect)}
  },[placeholder,onSelect])
  return <label className="block min-w-0"><span className="mb-2 block text-[11px] font-bold tracking-[.13em] text-slate-600">{label}</span><span className={`relative flex min-h-[58px] items-center rounded-xl border border-slate-200 bg-white pl-4 pr-3 transition focus-within:border-wayz-blue focus-within:ring-4 focus-within:ring-blue-100 ${tone==='red'?'text-rose-500':'text-emerald-600'}`}><Icon size={19} className="mr-3 shrink-0"/><span ref={hostRef} className="min-w-0 flex-1"/>{loading&&<LoaderCircle className="ml-2 animate-spin text-slate-400" size={17}/>}</span>{error&&<span className="mt-1 block text-xs text-rose-600">{error}</span>}</label>
}