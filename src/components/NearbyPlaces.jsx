import { ArrowUpRight, Flower2, Landmark, MapPin, Mountain, Compass } from 'lucide-react'

const places = [
  { name: 'Arunachaleswarar Temple', subtitle: 'The heart of Tiruvannamalai', detail: 'A landmark temple at the foot of Arunachala hill.', icon: Landmark },
  { name: 'Sri Ramana Ashram', subtitle: 'Spiritual retreat', detail: 'A well-known ashram on the road around Arunachala.', icon: Flower2 },
  { name: 'Virupaksha Cave', subtitle: 'Arunachala hill', detail: 'A historic meditation cave reached by the hill path.', icon: Mountain },
  { name: 'Skandashramam', subtitle: 'Arunachala hill', detail: 'A peaceful ashram above Sri Ramana Ashram.', icon: Mountain },
  { name: 'Yogi Ramsuratkumar Ashram', subtitle: 'Sannidhi Street area', detail: 'A popular spiritual destination in town.', icon: Compass },
  { name: 'Adi Annamalai Temple', subtitle: 'Girivalam route', detail: 'An ancient temple along the Arunachala circumambulation route.', icon: Landmark },
  { name: 'Seshadri Swamigal Ashram', subtitle: 'Near the main temple', detail: 'A quiet spiritual stop close to the temple area.', icon: Flower2 },
  { name: 'Pachaiamman Temple', subtitle: 'Tiruvannamalai outskirts', detail: 'A local temple destination outside the busy town centre.', icon: Landmark },
]

export default function NearbyPlaces({ onSelectPlace }) {
  function choosePlace(place) {
    onSelectPlace({
      name: place.name,
      searchText: `${place.name}, Tiruvannamalai, Tamil Nadu, India`,
      address: `${place.name}, Tiruvannamalai, Tamil Nadu, India`,
      placeId: null,
      location: null,
    })
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section aria-labelledby="nearby-places-heading" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-wayz-blue">Explore the town</p>
            <h2 id="nearby-places-heading" className="mt-3 text-3xl font-extrabold text-wayz-ink sm:text-4xl">Nearby Places in Tiruvannamalai</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Choose a popular temple or local destination. We’ll set it as your drop-off point in the booking form.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-wayz-blue"><MapPin size={15}/> Select a destination</span>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {places.map(place => {
            const Icon = place.icon
            return (
              <button
                key={place.name}
                type="button"
                onClick={() => choosePlace(place)}
                aria-label={`Set ${place.name} as your destination`}
                className="group flex min-h-[190px] flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-card focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-wayz-blue transition group-hover:bg-wayz-blue group-hover:text-white"><Icon size={21}/></span>
                <span className="mt-4 text-base font-extrabold text-wayz-ink">{place.name}</span>
                <span className="mt-1 text-xs font-semibold text-wayz-blue">{place.subtitle}</span>
                <span className="mt-2 text-xs leading-5 text-slate-500">{place.detail}</span>
                <span className="mt-auto flex items-center gap-1 pt-4 text-xs font-bold text-wayz-blue">Set as destination <ArrowUpRight size={14}/></span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
