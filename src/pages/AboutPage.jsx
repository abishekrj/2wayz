import { MapPin, Users, Route, HeartHandshake } from 'lucide-react'
import InfoPageLayout from '../components/InfoPageLayout'

const values = [
  { icon: MapPin, title: 'Focused on our town', text: '2WAYZ is being built around everyday travel needs in Tiruvannamalai, from local errands to visits around town.' },
  { icon: Users, title: 'Passengers and drivers together', text: 'The platform is intended to make it easier for passengers to request local auto rides and for local drivers to connect with customers.' },
  { icon: Route, title: 'Clear journey information', text: 'Passengers can enter pickup and destination points and review an estimated road distance, travel time and indicative fare.' },
  { icon: HeartHandshake, title: 'A local-first approach', text: 'We aim to keep the experience straightforward and relevant to the people who use local autos every day.' },
]

export default function AboutPage() {
  return <InfoPageLayout eyebrow="About 2WAYZ" title="Local mobility, built around Tiruvannamalai." intro="2WAYZ is a local auto-booking platform concept designed to connect passengers with auto drivers in Tiruvannamalai. Our focus is a simple booking experience and a platform that understands local travel.">
    <div className="grid gap-5 sm:grid-cols-2">{values.map(({icon:Icon,title,text})=><article key={title} className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-wayz-blue"><Icon size={23}/></div><h2 className="mt-5 text-lg font-extrabold text-wayz-ink">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div>
    <p className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-900">2WAYZ is currently under development. Fare values shown in the prototype are indicative, and live driver matching, trip payments and real-time tracking are not yet available.</p>
  </InfoPageLayout>
}
