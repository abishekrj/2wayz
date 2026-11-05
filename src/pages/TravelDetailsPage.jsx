import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CarFront, Clock3, LoaderCircle, MapPin, Route as RouteIcon, ShieldCheck, Users } from 'lucide-react'
import PageLayout from '../components/PageLayout'
import RouteMap from '../components/RouteMap'
import { useBooking } from '../context/BookingContext'
import { adminApi } from '../lib/adminApi'

const money = value => '₹' + Number(value || 0).toLocaleString('en-IN')

export default function TravelDetailsPage() {
  const navigate = useNavigate()
  const { booking, setBooking } = useBooking()
  const [confirming, setConfirming] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const estimate = booking?.estimate
  const fareSettings = estimate?.fareSettings || { baseFare: 30, includedDistanceKm: 1, perKmRate: 18, minimumFare: 50, roundingIncrement: 5 }
  const pickup = booking?.pickup
  const destination = booking?.destination

  if (!booking || !estimate || !pickup || !destination) return <PageLayout><div className="mx-auto max-w-xl px-5 py-20 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-wayz-blue"><RouteIcon size={26}/></div><h1 className="mt-5 text-2xl font-bold text-wayz-ink">No fare estimate found</h1><p className="mt-2 text-sm leading-6 text-slate-500">Choose your pickup and destination to calculate your ride fare.</p><button onClick={() => navigate('/')} className="mt-6 rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white">Back to booking</button></div></PageLayout>

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
        vehicle: 'auto',
        estimate: {
          ...current.estimate,
          km: Number(result.booking.distanceKm),
          durationMinutes: Number(result.booking.estimatedMinutes),
          fare: Number(result.booking.estimatedFare),
          distanceCharge: Math.max(0, Number(result.booking.estimatedFare) - Number(result.booking.fareBaseAmount ?? fareSettings.baseFare)),
          fareSettings: {
            baseFare: Number(result.booking.fareBaseAmount ?? fareSettings.baseFare),
            includedDistanceKm: Number(result.booking.fareIncludedDistanceKm ?? fareSettings.includedDistanceKm),
            perKmRate: Number(result.booking.farePerKmRate ?? fareSettings.perKmRate),
            minimumFare: Number(result.booking.fareMinimumAmount ?? fareSettings.minimumFare),
            roundingIncrement: Number(result.booking.fareRoundingIncrement ?? fareSettings.roundingIncrement)
          }
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
    } finally {
      setConfirming(false)
    }
  }

  return (
    <PageLayout>
      <div className="min-h-[70vh] bg-[#f5f8fc]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
          <button type="button" onClick={() => navigate('/')} className="mb-5 inline-flex items-center gap-2 rounded-lg px-1 py-2 text-sm font-semibold text-wayz-blue transition hover:gap-3">
            <ArrowLeft size={17}/> Back to edit
          </button>

          <header className="mb-6 sm:mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-wayz-blue">FARE ESTIMATE</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-wayz-ink sm:text-3xl">Review your ride</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Check your route and estimated fare before requesting an auto.</p>
          </header>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.75fr)] lg:gap-7">
            <div className="space-y-4">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div>
                    <h2 className="text-sm font-bold text-wayz-ink">Your route</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Google Maps driving route</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-wayz-blue">LOCAL AUTO</span>
                </div>
                <div className="p-2 pt-0 sm:p-3 sm:pt-0">
                  <RouteMap route={estimate.route}/>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><MapPin size={17}/></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pickup</p>
                      <p className="mt-1 break-words text-sm font-semibold leading-5 text-wayz-ink">{pickup.name}</p>
                      {pickup.address && pickup.address !== pickup.name && <p className="mt-1 break-words text-xs leading-5 text-slate-500">{pickup.address}</p>}
                    </div>
                  </div>
                  <div className="ml-4 h-4 border-l border-dashed border-slate-300"/>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600"><MapPin size={17}/></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</p>
                      <p className="mt-1 break-words text-sm font-semibold leading-5 text-wayz-ink">{destination.name}</p>
                      {destination.address && destination.address !== destination.name && <p className="mt-1 break-words text-xs leading-5 text-slate-500">{destination.address}</p>}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                <div className="bg-[#073B83] px-5 py-5 text-white sm:px-6">
                  <p className="text-xs font-semibold text-blue-100">Estimated fare</p>
                  <p className="mt-1 text-4xl font-black tracking-tight">{money(estimate.fare)}</p>
                  <p className="mt-1 text-[11px] text-blue-100">Indicative amount · final fare may vary</p>
                </div>
                <div className="grid grid-cols-2 divide-x divide-blue-100">
                  <div className="px-4 py-4 text-center">
                    <RouteIcon size={18} className="mx-auto text-wayz-blue"/>
                    <p className="mt-2 text-lg font-bold text-wayz-ink">{Number(estimate.km).toFixed(1)} km</p>
                    <p className="text-xs text-slate-500">Distance</p>
                  </div>
                  <div className="px-4 py-4 text-center">
                    <Clock3 size={18} className="mx-auto text-wayz-blue"/>
                    <p className="mt-2 text-lg font-bold text-wayz-ink">{estimate.durationMinutes} min</p>
                    <p className="text-xs text-slate-500">Travel time</p>
                  </div>
                </div>
              </section>

              <section className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-wayz-blue"><CarFront size={27}/></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-wayz-ink">Auto rickshaw</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Users size={13}/> Up to 3 passengers</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Selected</span>
              </section>

              <div className="rounded-xl bg-blue-50/80 p-3">
                <div className="flex items-start gap-2 text-xs leading-5 text-blue-900">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600"/>
                  <p>Pay the driver directly after your ride. 2WAYZ does not collect payment online.</p>
                </div>
              </div>

              {bookingError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-700">{bookingError}{/log in/i.test(bookingError) && <button type="button" onClick={() => navigate(`/login?returnTo=${encodeURIComponent('/travel-details')}`)} className="ml-1 font-bold underline">Sign in</button>}</div>}

              <button type="button" onClick={confirmBooking} disabled={confirming} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-wayz-yellow px-5 py-4 text-sm font-bold text-wayz-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60">
                {confirming ? <LoaderCircle size={19} className="animate-spin"/> : null}
                {confirming ? 'Confirming ride…' : 'Confirm Booking'}
                {!confirming && <ArrowRight size={18}/>}
              </button>
              <p className="text-center text-[11px] leading-5 text-slate-500">Your request will be sent to nearby eligible drivers.</p>
            </aside>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
