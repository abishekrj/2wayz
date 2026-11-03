import { useState } from 'react'
import { CheckCircle2, CarFront, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import AuthLayout from './AuthLayout'

export default function DriverRegistration() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    vehicleNumber: '',
    licenceNumber: '',
    area: 'Tiruvannamalai',
  })

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function submit(event) {
    event.preventDefault()
    setSubmitted(true)
  }

  const inputClass = 'mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none transition focus:border-wayz-blue focus:ring-2 focus:ring-blue-100'

  return (
    <AuthLayout
      title="Register as a driver"
      subtitle="Join the 2WAYZ local driver network. Share your details and our team can contact you to complete verification."
      footer={
        <p>
          Looking for a passenger account?{' '}
          <Link to="/register" className="font-bold text-wayz-blue hover:underline">Create an account</Link>
        </p>
      }
    >
      {submitted ? (
        <div className="rounded-2xl bg-emerald-50 p-6 text-center">
          <CheckCircle2 className="mx-auto text-emerald-600" size={42} />
          <h3 className="mt-3 text-xl font-extrabold text-wayz-ink">Details captured</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This is a front-end registration preview. Your details have not been sent to a server yet. Backend submission, OTP verification and document upload will be connected in a later phase.
          </p>
          <Link to="/" className="mt-5 inline-flex rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white">
            Return to home
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600 sm:col-span-2">
            FULL NAME
            <input required name="name" value={form.name} onChange={update} placeholder="Enter your full name" className={inputClass} />
          </label>

          <label className="text-xs font-bold text-slate-600">
            MOBILE NUMBER
            <input required name="mobile" value={form.mobile} onChange={update} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit mobile number" className={inputClass} />
          </label>

          <label className="text-xs font-bold text-slate-600">
            SERVICE AREA
            <input required name="area" value={form.area} onChange={update} className={inputClass} />
          </label>

          <label className="text-xs font-bold text-slate-600">
            AUTO / VEHICLE NUMBER
            <input required name="vehicleNumber" value={form.vehicleNumber} onChange={update} placeholder="TN XX XX 0000" className={inputClass} />
          </label>

          <label className="text-xs font-bold text-slate-600">
            DRIVING LICENCE NUMBER
            <input required name="licenceNumber" value={form.licenceNumber} onChange={update} placeholder="Enter licence number" className={inputClass} />
          </label>

          <div className="rounded-xl bg-wayz-mist p-4 text-xs leading-5 text-slate-600 sm:col-span-2">
            <p className="flex items-center gap-2 font-bold text-wayz-ink">
              <ShieldCheck size={16} className="text-wayz-blue" /> Verification will be completed separately
            </p>
            <p className="mt-1">Keep your driving licence, vehicle RC, insurance and permit ready. Secure document upload and OTP verification are not connected in this starter.</p>
          </div>

          <button type="submit" className="rounded-xl bg-wayz-yellow px-6 py-4 text-sm font-extrabold text-wayz-ink transition hover:brightness-95 sm:col-span-2">
            <span className="inline-flex items-center justify-center gap-2"><CarFront size={17} /> Submit registration interest</span>
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
