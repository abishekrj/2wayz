import { useState } from 'react'
import { Siren, PhoneCall, LoaderCircle, CheckCircle2 } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

export default function SosButton({ bookingId, role = 'PASSENGER' }) {
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState('')

  async function trigger() {
    if (!bookingId || busy || !window.confirm('Send an SOS emergency alert to the 2WAYZ Super Admin now?')) return
    setBusy(true)
    setMessage('')
    try {
      const location = await new Promise(resolve => {
        if (!navigator.geolocation) return resolve(null)
        navigator.geolocation.getCurrentPosition(
          position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, locationAccuracy: position.coords.accuracy }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
        )
      })
      const result = await adminApi.triggerSos({ bookingId, ...(location || {}) })
      setSent(true)
      setMessage(result.message || 'SOS alert recorded. If you are in immediate danger, call 112.')
    } catch (error) {
      setMessage(error.message || 'Unable to send the SOS alert. Call 112 if you are in immediate danger.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:p-5">
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white"><Siren size={23}/></span>
      <div className="min-w-0 flex-1">
        <h3 className="font-extrabold text-rose-950">Emergency SOS</h3>
        <p className="mt-1 text-xs leading-5 text-rose-800">{role === 'DRIVER' ? 'If you or your passenger feel unsafe, alert the 2WAYZ Super Admin.' : 'If you feel unsafe during this ride, alert the 2WAYZ Super Admin.'} Your booking and latest available GPS location will be shared.</p>
        <button type="button" disabled={busy || sent} onClick={trigger} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? <LoaderCircle size={17} className="animate-spin"/> : sent ? <CheckCircle2 size={17}/> : <Siren size={17}/>}
          {busy ? 'Sending emergency alert…' : sent ? 'SOS alert sent' : 'Send SOS alert'}
        </button>
        {message && <p role="status" className="mt-3 text-xs font-semibold text-rose-900">{message}</p>}
        <a href="tel:112" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-sm font-extrabold text-rose-700"><PhoneCall size={16}/> Call emergency number 112</a>
      </div>
    </div>
    <p className="mt-3 text-[11px] leading-4 text-rose-700">2WAYZ alerts its Super Admin only. It does not automatically contact police, ambulance or emergency services. Call 112 for immediate assistance.</p>
  </section>
}
