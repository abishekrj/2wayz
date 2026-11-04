import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, MapPin, Landmark, Sparkles } from 'lucide-react'
import { SiteHeader, SiteFooter } from '../components/SiteChrome'
import { adminApi } from '../lib/adminApi'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/api'
const mediaUrl = value => value && value.startsWith('/') ? new URL(value, API_BASE).toString() : value

export default function PlacesPage() {
  const [heading, setHeading] = useState('Places to Visit in Tiruvannamalai')
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    adminApi.publicPlaces()
      .then(data => {
        if (!active) return
        setHeading(data.heading || 'Places to Visit in Tiruvannamalai')
        setPlaces(Array.isArray(data.places) ? data.places : [])
      })
      .catch(err => { if (active) setError(err.message || 'Unable to load destinations.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function choosePlace(place) {
    const destination = {
      name: place.name,
      searchText: place.name + ', Tiruvannamalai, Tamil Nadu, India',
      address: place.name + ', Tiruvannamalai, Tamil Nadu, India',
      placeId: null,
      location: null
    }
    navigate('/', { state: { destination } })
  }

  return <div className="min-h-screen bg-[#f5f8fc]"><SiteHeader/><main>
    <section className="relative overflow-hidden bg-[#073b83] py-12 text-white sm:py-16">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl"/>
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-blue-100 transition hover:text-white"><ArrowLeft size={15}/> Back to home</Link>
        <p className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.2em] text-blue-100"><Sparkles size={13}/> Explore Tiruvannamalai</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">{heading}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Discover temples, ashrams and special places around town. Choose a destination and use it as your drop-off point with 2WAYZ.</p>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-10 sm:py-14 lg:px-8">
      {loading ? <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">Loading places…</div>
        : error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        : places.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><MapPin size={34} className="mx-auto text-slate-300"/><h2 className="mt-3 font-bold text-wayz-ink">Places are being updated</h2><p className="mt-1 text-sm text-slate-500">Please check back soon.</p></div>
        : <><div className="mb-6 flex items-center justify-between"><p className="text-sm font-semibold text-slate-600">{places.length} destinations</p><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-wayz-blue shadow-sm">Tiruvannamalai, Tamil Nadu</span></div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{places.map((place,index) => <article key={place.id || place.name || index} className="group overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,45,80,0.055)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_40px_rgba(15,45,80,0.12)]">
            <div className="relative aspect-[5/4] overflow-hidden bg-[#eaf2fc]">{place.imageUrl || place.image ? <img src={mediaUrl(place.imageUrl || place.image)} alt={place.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"/> : <div className="flex h-full items-center justify-center text-wayz-blue"><Landmark size={54} strokeWidth={1.35}/></div>}<span className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-wayz-blue">Local destination</span></div>
            <div className="p-5"><h2 className="font-extrabold leading-snug text-wayz-ink">{place.name}</h2>{place.subtitle && <p className="mt-1 text-xs font-bold text-wayz-blue">{place.subtitle}</p>}{place.detail && <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-500">{place.detail}</p>}<button type="button" onClick={() => choosePlace(place)} className="mt-5 inline-flex w-full items-center justify-between rounded-xl bg-blue-50 px-4 py-3 text-xs font-extrabold text-wayz-blue transition hover:bg-wayz-blue hover:text-white"><span className="inline-flex items-center gap-2"><MapPin size={15}/> Set as drop-off</span><ArrowRight size={16}/></button></div>
          </article>)}</div></>}
    </section>
  </main><SiteFooter/></div>
}
