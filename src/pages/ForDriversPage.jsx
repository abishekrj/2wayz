import { Wallet, Users, ClipboardCheck, CarFront, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import InfoPageLayout from '../components/InfoPageLayout'

const benefits = [
  { icon: Users, title: 'Connect with nearby passengers', text: 'Be part of a local platform intended to connect Tiruvannamalai auto drivers with people looking for rides.' },
  { icon: Wallet, title: 'Understand trip earnings', text: 'The planned driver experience will show trip and earning information clearly. Wallet and commission workflows are not active in this frontend prototype.' },
  { icon: ClipboardCheck, title: 'A straightforward driver journey', text: 'The driver registration flow collects basic contact, vehicle and licence details for initial interest.' },
  { icon: CarFront, title: 'Designed for local autos', text: '2WAYZ is focused on local auto-rickshaw journeys and the needs of drivers serving the town.' },
]

export default function ForDriversPage() {
  return <InfoPageLayout eyebrow="For auto drivers" title="Your local rides. Your local customers." intro="2WAYZ aims to give auto drivers in Tiruvannamalai a simple way to connect with passengers and participate in local digital mobility.">
    <div className="grid gap-5 sm:grid-cols-2">{benefits.map(({icon:Icon,title,text})=><article key={title} className="rounded-3xl border border-slate-100 p-7"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-wayz-blue"><Icon size={23}/></div><h2 className="mt-5 text-lg font-bold text-wayz-ink">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div>
    <section className="mt-10 rounded-3xl bg-wayz-navy p-7 text-white sm:p-9"><h2 className="text-2xl font-bold">Interested in joining 2WAYZ?</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Submit your name, mobile number, service area, vehicle number and driving licence number. The current form is a frontend preview; secure submission, OTP verification and document checks will be added with the backend.</p><ul className="mt-5 grid gap-2 text-sm text-blue-50 sm:grid-cols-2">{['Mobile number','Vehicle registration number','Driving licence number','Service area'].map(item=><li key={item} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-wayz-yellow"/>{item}</li>)}</ul><Link to="/driver/register" className="mt-7 inline-flex rounded-xl bg-wayz-yellow px-6 py-3.5 text-sm font-bold text-wayz-ink">Register as a driver</Link></section>
  </InfoPageLayout>
}
