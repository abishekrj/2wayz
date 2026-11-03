import { ArrowUpRight, Flower2, Landmark, MapPin, Mountain, Compass } from 'lucide-react'

const places = [
  {
    name: 'Arunachaleswarar Temple',
    subtitle: 'The heart of Tiruvannamalai',
    detail: 'A landmark temple at the foot of Arunachala hill.',
    icon: Landmark,
    image: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Thiruvannamalai_Arunachaleswarar_Temple_Rajagopuram.jpg',
    imageAlt: 'Rajagopuram of Arunachaleswarar Temple',
  },
  {
    name: 'Sri Ramana Ashram',
    subtitle: 'Spiritual retreat',
    detail: 'A well-known ashram on the road around Arunachala.',
    icon: Flower2,
    image: 'https://bharatabharati.in/wp-content/uploads/2010/12/ramanaashram_entrance.jpg',
    imageAlt: 'Entrance to Sri Ramana Ashram',
  },
  {
    name: 'Virupaksha Cave',
    subtitle: 'Arunachala hill',
    detail: 'A historic meditation cave reached by the hill path.',
    icon: Mountain,
    image: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Virupaksha_Cave%2C_Tiruvnnamalai.jpg',
    imageAlt: 'Virupaksha Cave on Arunachala hill',
  },
  {
    name: 'Skandashramam',
    subtitle: 'Arunachala hill',
    detail: 'A peaceful ashram above Sri Ramana Ashram.',
    icon: Mountain,
    image: 'https://www.tvmalai.in/tvmalai/uploads/2025/05/ashramam.png',
    imageAlt: 'Entrance path to Skandashramam',
  },
  {
    name: 'Yogi Ramsuratkumar Ashram',
    subtitle: 'Sannidhi Street area',
    detail: 'A popular spiritual destination in town.',
    icon: Compass,
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Yogi_Ramsuratkumar_Ashram_main_entrance.jpg',
    imageAlt: 'Entrance to Yogi Ramsuratkumar Ashram',
  },
  {
    name: 'Adi Annamalai Temple',
    subtitle: 'Girivalam route',
    detail: 'An ancient temple along the Arunachala circumambulation route.',
    icon: Landmark,
    image: 'https://maproute.in/wp-content/uploads/2025/04/0a682-whatsapp-image-2023-08-06-at-11.44.082.webp?w=900',
    imageAlt: 'Adi Annamalai Temple courtyard',
  },
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

        <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {places.map(place => {
            const Icon = place.icon
            return (
              <button
                key={place.name}
                type="button"
                onClick={() => choosePlace(place)}
                aria-label={`Set ${place.name} as your destination`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-card focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                  {place.image ? (
                    <img
                      src={place.image}
                      alt={place.imageAlt}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 text-wayz-blue">
                      <Icon size={42} strokeWidth={1.5} />
                    </div>
                  )}
                  <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-wayz-blue shadow-sm">
                    <MapPin size={12} className="mr-1 inline" /> Tiruvannamalai
                  </span>
                </div>
                <span className="flex flex-1 flex-col p-5">
                  <span className="text-base font-extrabold text-wayz-ink">{place.name}</span>
                  <span className="mt-1 text-xs font-semibold text-wayz-blue">{place.subtitle}</span>
                  <span className="mt-2 text-xs leading-5 text-slate-500">{place.detail}</span>
                  <span className="mt-auto flex items-center gap-1 pt-5 text-xs font-bold text-wayz-blue">Set as destination <ArrowUpRight size={14}/></span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
