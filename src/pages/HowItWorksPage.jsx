import { MapPin, Route, IndianRupee, CalendarClock, Smartphone } from 'lucide-react'
import InfoPageLayout from '../components/InfoPageLayout'

const steps = [
  { icon: MapPin, number: '01', title: 'Enter pickup and destination', text: 'Choose where your trip starts and where you want to go. Location suggestions help you select the right places.' },
  { icon: CalendarClock, number: '02', title: 'Choose when to travel', text: 'Select an instant ride or enter a preferred time for a scheduled journey.' },
  { icon: Route, number: '03', title: 'Review your route', text: 'The prototype uses Google Routes to show road distance and estimated travel time.' },
  { icon: IndianRupee, number: '04', title: 'Check the indicative fare', text: 'Review the fare estimate before proceeding. The current tariff is a starter estimate and is not a final driver-approved price.' },
  { icon: Smartphone, number: '05', title: 'Continue with your ride request', text: 'Proceed to the trip details and tracking preview. Automatic driver dispatch and live trip updates are planned for a later phase.' },
]

export default function HowItWorksPage() {
  return <InfoPageLayout eyebrow="How it works" title="Plan your local auto ride in a few simple steps." intro="The 2WAYZ booking flow is designed to help you enter a route, understand the journey and review an indicative fare before continuing.">
    <div className="mx-auto max-w-4xl">{steps.map(({icon:Icon,number,title,text},index)=><div key={number} className="relative flex gap-5 pb-9 last:pb-0"><div className="flex flex-col items-center"><div className="z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-wayz-blue"><Icon size={22}/></div>{index !== steps.length-1 && <div className="mt-2 w-px flex-1 bg-blue-100"/>}</div><div className="pb-2"><p className="text-xs font-black tracking-widest text-wayz-blue">STEP {number}</p><h2 className="mt-1 text-lg font-bold text-wayz-ink">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div></div>)}</div>
    <div className="mt-10 rounded-2xl bg-amber-50 p-5 text-sm leading-6 text-amber-900">Please note: the current app is a working frontend prototype. Booking confirmation, driver assignment, OTP, payments, push notifications and live GPS tracking require backend integration.</div>
  </InfoPageLayout>
}
