import { useState } from 'react'
import { CheckCircle2, CarFront, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { adminApi } from '../lib/adminApi'

export default function DriverRegistration() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [form, setForm] = useState({ name: '', mobile: '', password: '', vehicleNumber: '', licenceNumber: '', area: 'Tiruvannamalai' })
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await adminApi.registerDriver({ name: form.name, phone: form.mobile, password: form.password, vehicleNumber: form.vehicleNumber, licenceNumber: form.licenceNumber, serviceArea: form.area })
      setSuccessMessage(result.message)
      setSubmitted(true)
    } catch (err) { setError(err.message || 'Registration could not be submitted.') }
    finally { setLoading(false) }
  }
  const inputClass = 'mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-medium outline-none transition focus:border-wayz-blue focus:ring-2 focus:ring-blue-100'
  return <AuthLayout title="Register as a driver" subtitle="Join the 2WAYZ local driver network. Your account must be verified before you can go online." footer={<p>Already registered? <Link to="/driver/login" className="font-bold text-wayz-blue hover:underline">Driver sign in</Link></p>}>
    {submitted ? <div className="rounded-2xl bg-emerald-50 p-6 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={42}/><h3 className="mt-3 text-xl font-extrabold text-wayz-ink">Registration received</h3><p className="mt-2 text-sm leading-6 text-slate-600">{successMessage}</p><Link to="/driver/login" className="mt-5 inline-flex rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white">Continue to driver sign in</Link></div> :
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
      <label className="text-xs font-bold text-slate-600 sm:col-span-2">FULL NAME<input required name="name" value={form.name} onChange={update} minLength={2} maxLength={100} placeholder="Enter your full name" className={inputClass}/></label>
      <label className="text-xs font-bold text-slate-600">MOBILE NUMBER<input required name="mobile" value={form.mobile} onChange={update} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit mobile number" className={inputClass}/></label>
      <label className="text-xs font-bold text-slate-600">CREATE PASSWORD<input required type="password" name="password" value={form.password} onChange={update} minLength={8} maxLength={128} autoComplete="new-password" placeholder="At least 8 characters" className={inputClass}/></label>
      <label className="text-xs font-bold text-slate-600">SERVICE AREA<input required name="area" value={form.area} onChange={update} maxLength={100} className={inputClass}/></label>
      <label className="text-xs font-bold text-slate-600">AUTO / VEHICLE NUMBER<input required name="vehicleNumber" value={form.vehicleNumber} onChange={update} minLength={5} maxLength={20} placeholder="TN XX XX 0000" className={inputClass}/></label>
      <label className="text-xs font-bold text-slate-600 sm:col-span-2">DRIVING LICENCE NUMBER<input required name="licenceNumber" value={form.licenceNumber} onChange={update} minLength={5} maxLength={40} placeholder="Enter licence number" className={inputClass}/></label>
      <div className="rounded-xl bg-wayz-mist p-4 text-xs leading-5 text-slate-600 sm:col-span-2"><p className="flex items-center gap-2 font-bold text-wayz-ink"><ShieldCheck size={16} className="text-wayz-blue"/>Approval required</p><p className="mt-1">Your details are stored securely. A Super Admin must approve your driver account before it can receive ride offers. OTP verification and document upload are not included yet.</p></div>
      <button disabled={loading} type="submit" className="rounded-xl bg-wayz-yellow px-6 py-4 text-sm font-extrabold text-wayz-ink transition hover:brightness-95 disabled:opacity-60 sm:col-span-2"><span className="inline-flex items-center justify-center gap-2"><CarFront size={17}/>{loading ? 'Submitting…' : 'Submit driver registration'}</span></button>
    </form>}
  </AuthLayout>
}
