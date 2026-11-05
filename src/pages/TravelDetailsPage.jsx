import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, CarFront, CheckCircle2, Clock3, IndianRupee, MapPin, Route as RouteIcon, ShieldCheck, Users } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import RouteMap from '../components/RouteMap'
import { useBooking } from '../context/BookingContext'
import { adminApi } from '../lib/adminApi'

const money = value => '₹' + Number(value || 0).toLocaleString('en-IN')

export default function TravelDetailsPage() {
  const navigate = useNavigate()
  const { booking, setBooking } = useBooking()
  const [vehicle, setVehicle] = useState('auto')
  const [confirming, setConfirming] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const estimate = booking?.estimate
  const pickup = booking?.pickup
  const destination = booking?.destination
  const dateLabel = 'As soon as a driver accepts'

  if (!booking || !estimate || !pickup || !destination) return <PageLayout><div className="mx-auto max-w-3xl px-5 py-20 text-center"><h1 className="text-2xl font-bold text-wayz-ink">No travel estimate found</h1><p className="mt-2 text-sm text-slate-500">Please enter your pickup and destination to calculate a fare.</p><button onClick={() => navigate('/')} className="mt-6 rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white">Back to booking</button></div></PageLayout>

  async function confirmBooking() {
    setConfirming(true)
    setBookingError('')
    try {
      const payload = {
        pickup,
        destination,
        estimate: { distanceKm: estimate.km, durationMinutes: estimate.durationMinutes },
        mode: 'instant'
      }
      const result = await adminApi.createBooking(payload)
      setBooking(current => ({
        ...current,
        vehicle,
        estimate: {
          ...current.estimate,
          km: Number(result.booking.distanceKm),
          durationMinutes: Number(result.booking.estimatedMinutes),
          fare: Number(result.booking.estimatedFare),
          distanceCharge: Math.max(0, Number(result.booking.estimatedFare) - 30)
        },
        bookingId: result.booking.id,
        bookingStatus: result.booking.status,
        reference: result.booking.reference,
        serverBooking: result.booking,
        dispatchMessage: result.message
      }))
      navigate('/travel-tracking')
    } catch (err) {
      if (/log in/i.test(err.message || '')) {
        setBookingError('Please sign in to submit and save your ride request.')
      } else {
        setBookingError(err.message || 'Your booking could not be submitted. Please try again.')
      }
    } finally { setConfirming(false) }
  }

  return <PageLayout>
    <div className="bg-wayz-mist/60"><div className="mx-auto max-w-7xl px-5 py-8 sm:py-10 lg:px-8">
      <button onClick={() => navigate('/')} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-wayz-blue transition hover:gap-3"><ArrowLeft size={17}/> Back to search</button>
      <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Review your journey</p><h1 className="mt-2 text-3xl font-bold text-wayz-ink sm:text-4xl">Travel details</h1><p className="mt-2 text-sm text-slate-500">Check your route, estimated fare and vehicle before continuing.</p></div>
      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-wayz-ink">Your trip</h2><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-wayz-blue">Instant ride</span></div>
            <div className="mt-5 rounded-xl bg-wayz-mist/60 p-4"><div className="flex gap-3"><span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-emerald-500"/><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup location</p><p className="mt-1 break-words text-sm font-bold text-wayz-ink">{pickup.name}</p><p className="mt-1 text-xs text-slate-500">{pickup.address || ''}</p></div></div><div className="ml-1.5 my-3 h-7 border-l-2 border-dashed border-slate-300"/><div className="flex gap-3"><span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-rose-500"/><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</p><p className="mt-1 break-words text-sm font-bold text-wayz-ink">{destination.name}</p><p className="mt-1 text-xs text-slate-500">{destination.address || ''}</p></div></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-slate-100 p-3"><RouteIcon size={18} className="text-wayz-blue"/><p className="mt-2 text-lg font-bold text-wayz-ink">{estimate.km.toFixed(1)} km</p><p className="text-xs text-slate-500">Distance</p></div><div className="rounded-xl border border-slate-100 p-3"><Clock3 size={18} className="text-wayz-blue"/><p className="mt-2 text-lg font-bold text-wayz-ink">{estimate.durationMinutes} min</p><p className="text-xs text-slate-500">Travel time</p></div><div className="rounded-xl border border-slate-100 p-3"><CalendarDays size={18} className="text-wayz-blue"/><p className="mt-2 text-sm font-bold text-wayz-ink">{dateLabel}</p><p className="text-xs text-slate-500">Pickup time</p></div></div>
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-wayz-ink">Choose vehicle</h2><span className="text-xs text-slate-400">1 option available</span></div><button type="button" onClick={() => setVehicle('auto')} className={'mt-4 flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition ' + (vehicle === 'auto' ? 'border-wayz-blue bg-blue-50/60' : 'border-slate-100 hover:border-slate-200')}><div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-xl bg-wayz-yellow/30 text-wayz-navy"><CarFront size={34}/></div><div className="min-w-0 flex-1"><p className="font-bold text-wayz-ink">Auto rickshaw</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Users size={13}/> Up to 3 passengers · Local ride</p><p className="mt-1 text-xs font-semibold text-emerald-700">Standard 2WAYZ vehicle</p></div><div className="text-right"><p className="text-lg font-black text-wayz-blue">{money(estimate.fare)}</p><span className="text-[10px] text-slate-400">Indicative fare</span></div>{vehicle === 'auto' && <CheckCircle2 className="shrink-0 text-wayz-blue" size={20}/>}</button><p className="mt-3 text-xs leading-5 text-slate-500">Driver and vehicle registration details will appear after a driver accepts the request. The vehicle shown here is the requested vehicle category, not an assigned auto.</p></section>
        </div>
        <aside className="space-y-5"><section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-wayz-ink">Indicative fare</h2><p className="mt-2 text-4xl font-black text-wayz-blue">{money(estimate.fare)}</p><p className="mt-1 text-xs text-slate-500">Estimated total for this route</p><div className="my-5 space-y-3 border-y border-slate-100 py-4 text-sm"><div className="flex justify-between text-slate-600"><span>Base fare</span><span>{money(30)}</span></div><div className="flex justify-between text-slate-600"><span>Distance component + rounding</span><span>{money(estimate.distanceCharge)}</span></div><div className="flex justify-between font-bold text-wayz-ink"><span>Estimated total</span><span>{money(estimate.fare)}</span></div></div><p className="text-[11px] leading-5 text-slate-500">Illustrative starter tariff only. Actual fare may vary and will need confirmation by the driver.</p><div className="mt-5 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><ShieldCheck size={17} className="mt-0.5 shrink-0"/>Your route and estimate are ready to review. No payment is collected on this prototype.</div></section><section className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"><p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Route preview</p><RouteMap route={estimate.route}/></section></aside>
      </div>
      <div className="mt-7 flex flex-col-reverse gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><p className="text-xs leading-5 text-slate-500">By continuing, you submit a real ride request to nearby approved online drivers. No payment is collected.</p>{bookingError && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{bookingError} <button type="button" onClick={() => navigate(`/login?returnTo=${encodeURIComponent("/travel-details")}`)} className="underline">Sign in</button></p>}</div><button onClick={confirmBooking} disabled={confirming} className="inline-flex items-center justify-center gap-2 rounded-xl bg-wayz-yellow px-7 py-4 text-sm font-bold text-wayz-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:opacity-60">Confirm Booking <ArrowRight size={18}/></button></div>
    </div></div>
  </PageLayout>
}
