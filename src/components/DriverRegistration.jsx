import { useState } from 'react'
import { CheckCircle2, CarFront, ShieldCheck, Camera, FileCheck2, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import { adminApi } from '../lib/adminApi'

export default function DriverRegistration() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [form, setForm] = useState({ name: '', mobile: '', password: '', vehicleNumber: '', licenceNumber: '', drivingLicenceExpiryDate: '', vehicleInsuranceExpiryDate: '', fcExpiryDate: '', age: '', area: 'Tiruvannamalai' })
  const minExpiryDate = (() => { const d = new Date(); d.setDate(d.getDate()+1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
  function choosePhoto(event) { const file = event.target.files?.[0] || null; setProfilePhoto(file); setPhotoPreview(file ? URL.createObjectURL(file) : '') }
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = new FormData()
      Object.entries({ name: form.name, phone: form.mobile, password: form.password, vehicleNumber: form.vehicleNumber, licenceNumber: form.licenceNumber, drivingLicenceExpiryDate: form.drivingLicenceExpiryDate, vehicleInsuranceExpiryDate: form.vehicleInsuranceExpiryDate, fcExpiryDate: form.fcExpiryDate, age: form.age, serviceArea: form.area }).forEach(([key, value]) => payload.append(key, value))
      if (profilePhoto) payload.append('profilePhoto', profilePhoto)
      const result = await adminApi.registerDriver(payload)
      setSuccessMessage(result.message)
      setSubmitted(true)
    } catch (err) { setError(err.message || 'Registration could not be submitted.') }
    finally { setLoading(false) }
  }
  const inputClass = 'mt-2 h-12 w-full rounded-lg border border-slate-300 px-4 text-base font-normal outline-none transition focus:border-wayz-blue focus:ring-2 focus:ring-blue-100'
  return <AuthLayout title="Register as a driver" subtitle="Join the 2WAYZ local driver network. Your account must be verified before you can go online." footer={<p>Already registered? <Link to="/driver/login" className="font-bold text-wayz-blue hover:underline">Driver sign in</Link></p>}>
    {submitted ? <div className="rounded-2xl bg-emerald-50 p-6 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={42}/><h3 className="mt-3 text-xl font-bold text-wayz-ink">Registration received</h3><p className="mt-2 text-sm leading-6 text-slate-600">{successMessage}</p><Link to="/driver/login" className="mt-5 inline-flex rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white">Continue to driver sign in</Link></div> :
    <form onSubmit={submit} className="space-y-6">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3"><span className="rounded-lg bg-blue-50 p-2 text-wayz-blue"><UserRound size={19}/></span><div><h3 className="text-base font-bold text-wayz-ink">Personal details</h3><p className="text-xs text-slate-500">Your contact and identity information</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Full name<input required name="name" value={form.name} onChange={update} minLength={2} maxLength={100} placeholder="Enter your full name" className={inputClass}/></label>
          <label className="text-sm font-semibold text-slate-700">Mobile number<input required name="mobile" value={form.mobile} onChange={update} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit mobile number" className={inputClass}/></label>
          <label className="text-sm font-semibold text-slate-700">Age<input required type="number" name="age" value={form.age} onChange={update} min="18" max="100" step="1" placeholder="18 or above" className={inputClass}/></label>
          <label className="text-sm font-semibold text-slate-700">Create password<input required type="password" name="password" value={form.password} onChange={update} minLength={8} maxLength={128} autoComplete="new-password" placeholder="At least 8 characters" className={inputClass}/></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Service area<input required name="area" value={form.area} onChange={update} maxLength={100} className={inputClass}/></label>
        </div>
        <div className="mt-5"><label className="text-sm font-semibold text-slate-700">Profile photo <span className="text-rose-600">*</span></label>
          <div className="mt-2 flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            {photoPreview ? <img src={photoPreview} alt="Profile preview" className="h-20 w-20 rounded-lg border object-cover"/> : <span className="flex h-20 w-20 items-center justify-center rounded-lg bg-blue-50 text-wayz-blue"><Camera size={28}/></span>}
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">Upload a clear face photo</p><p className="mt-1 text-xs text-slate-500">JPG, PNG or WEBP · Maximum 5 MB</p><input required={!profilePhoto} type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-wayz-blue"/></div>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3"><span className="rounded-lg bg-amber-50 p-2 text-amber-700"><CarFront size={19}/></span><div><h3 className="text-base font-bold text-wayz-ink">Vehicle details</h3><p className="text-xs text-slate-500">Registration and fitness information</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Auto / vehicle number<input required name="vehicleNumber" value={form.vehicleNumber} onChange={update} minLength={5} maxLength={20} placeholder="TN XX XX 0000" className={inputClass}/></label>
          <label className="text-sm font-semibold text-slate-700">Vehicle insurance expiry date<input required type="date" name="vehicleInsuranceExpiryDate" value={form.vehicleInsuranceExpiryDate} onChange={update} min={minExpiryDate} className={inputClass}/></label>
          <label className="text-sm font-semibold text-slate-700">FC expiry date (Fitness Certificate)<input required type="date" name="fcExpiryDate" value={form.fcExpiryDate} onChange={update} min={today} className={inputClass}/></label>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><FileCheck2 size={19}/></span><div><h3 className="text-base font-bold text-wayz-ink">Driving licence details</h3><p className="text-xs text-slate-500">Enter your licence number and validity</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Driving licence number<input required name="licenceNumber" value={form.licenceNumber} onChange={update} minLength={5} maxLength={40} placeholder="Enter driving licence number" className={inputClass}/></label>
          <label className="text-sm font-semibold text-slate-700">Driving licence expiry date<input required type="date" name="drivingLicenceExpiryDate" value={form.drivingLicenceExpiryDate} onChange={update} min={today} className={inputClass}/></label>
        </div>
      </section>
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-slate-700"><p className="flex items-center gap-2 font-bold text-wayz-ink"><ShieldCheck size={17} className="text-wayz-blue"/>Document validity and approval</p><p className="mt-1">All three expiry dates must be valid. If your driving licence, vehicle insurance or FC expires, your account will automatically be suspended and you will receive an in-app notification. A Super Admin must verify updated documents before you can go online again.</p></div>
      <button disabled={loading} type="submit" className="w-full rounded-lg bg-wayz-yellow px-6 py-4 text-base font-bold text-wayz-ink transition hover:brightness-95 disabled:opacity-60"><span className="inline-flex items-center justify-center gap-2"><CarFront size={18}/>{loading ? 'Submitting…' : 'Submit driver registration'}</span></button>

    </form>}
  </AuthLayout>
}
