import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Clock3, RefreshCw, Search, Users, X, FileClock } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/api').replace(/\/api\/?$/, '')

const statuses = [
  { value: 'PENDING', label: 'Pending review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' }
]

export default function AdminDriversPage() {
  const [status, setStatus] = useState('PENDING')
  const [drivers, setDrivers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingDriver, setEditingDriver] = useState(null)
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', age: '', serviceArea: '', vehicleNumber: '', licenceNumber: '', drivingLicenceExpiryDate: '', vehicleInsuranceExpiryDate: '', fcExpiryDate: '', password: '' })
  const [profilePhoto, setProfilePhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const minExpiryDate = (() => { const date = new Date(); date.setDate(date.getDate() + 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` })()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await adminApi.adminDrivers(status)
      setDrivers(result.drivers || [])
    } catch (err) {
      setError(err.message || 'Could not load drivers.')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { load() }, [load])

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return drivers
    return drivers.filter(driver => [
      driver.name,
      driver.phone,
      driver.serviceArea,
      driver.vehicleNumber,
      driver.licenceNumber,
      driver.age,
      driver.id,
      driver.status
    ].some(value => String(value ?? '').toLowerCase().includes(query)))
  }, [drivers, search])

  function editProfile(driver) {
    setEditingDriver(driver)
    setProfilePhoto(null)
    setPhotoPreview(driver.profilePhotoUrl ? `${API_ORIGIN}${driver.profilePhotoUrl}` : '')
    setProfileForm({
      name: driver.name || '',
      phone: driver.phone || '',
      age: String(driver.age || ''),
      serviceArea: driver.serviceArea || '',
      vehicleNumber: driver.vehicleNumber || '',
      licenceNumber: driver.licenceNumber || '',
      drivingLicenceExpiryDate: driver.drivingLicenceExpiryDate ? new Date(driver.drivingLicenceExpiryDate).toISOString().slice(0, 10) : '',
      vehicleInsuranceExpiryDate: driver.vehicleInsuranceExpiryDate ? new Date(driver.vehicleInsuranceExpiryDate).toISOString().slice(0, 10) : '',
      fcExpiryDate: driver.fcExpiryDate ? new Date(driver.fcExpiryDate).toISOString().slice(0, 10) : '',
      password: ''
    })
  }

  async function saveProfile(event) {
    event.preventDefault()
    if (!editingDriver) return
    setBusyId(editingDriver.id)
    setError('')
    setNotice('')
    try {
      const payload = new FormData()
      Object.entries({ ...profileForm, age: String(profileForm.age) }).forEach(([key, value]) => payload.append(key, value))
      if (profilePhoto) payload.append('profilePhoto', profilePhoto)
      const result = await adminApi.updateDriverProfile(editingDriver.id, payload)
      setNotice(result.message)
      setEditingDriver(null)
      setProfilePhoto(null)
      await load()
    } catch (err) { setError(err.message || 'Could not update driver profile.') }
    finally { setBusyId('') }
  }

  async function changeStatus(driver, nextStatus) {
    setBusyId(driver.id)
    setError('')
    setNotice('')
    try {
      const result = await adminApi.updateDriverStatus(driver.id, nextStatus)
      setNotice(result.message)
      await load()
    } catch (err) {
      setError(err.message || 'Could not update driver.')
    } finally {
      setBusyId('')
    }
  }

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Driver operations</p>
        <h1 className="mt-2 text-3xl font-bold text-wayz-ink">Registered drivers</h1>
        <p className="mt-2 text-sm text-slate-500">Review registrations and approve drivers before they can go online.</p>
      </div>
      <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"><RefreshCw size={16}/> Refresh</button>
    </div>

    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}

    <div className="mt-7 flex flex-wrap gap-2">
      {statuses.map(item => <button key={item.value} onClick={() => setStatus(item.value)} className={'rounded-full px-4 py-2 text-sm font-bold ' + (status === item.value ? 'bg-wayz-blue text-white' : 'border border-slate-200 bg-white text-slate-600')}>{item.label}</button>)}
    </div>

    <div className="relative mt-5">
      <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="Search by driver name, mobile, service area, vehicle or licence number"
        aria-label="Search registered drivers"
        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-wayz-ink outline-none transition placeholder:text-slate-400 focus:border-wayz-blue focus:ring-2 focus:ring-wayz-blue/10"
      />
    </div>

    {!loading && <p className="mt-3 text-xs text-slate-500">Showing {filteredDrivers.length} of {drivers.length} drivers</p>}

    {loading ? <div className="py-16 text-center text-sm text-slate-500">Loading drivers…</div>
      : filteredDrivers.length === 0
        ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Users className="mx-auto text-slate-400" size={32}/>
            <p className="mt-3 font-bold text-slate-700">{drivers.length === 0 ? 'No drivers in this category' : 'No matching drivers found'}</p>
            <p className="mt-1 text-sm text-slate-500">{drivers.length === 0 ? 'New driver registrations will appear here.' : 'Try a different name, mobile number, service area or vehicle detail.'}</p>
          </div>
        : <div className="mt-5 space-y-4">
            {filteredDrivers.map(driver => <article key={driver.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-wayz-ink">{driver.name}</h2>
                    <span className={'rounded-full px-3 py-1 text-xs font-bold ' + (driver.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : ['REJECTED', 'SUSPENDED'].includes(driver.status) ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800')}>{driver.status}</span>
                    {driver.isOnline && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Online</span>}
                  </div>
                  <div className="mb-3 flex items-center gap-3">
                    {driver.profilePhotoUrl ? <img src={`${API_ORIGIN}${driver.profilePhotoUrl}`} alt={driver.name} className="h-16 w-16 rounded-lg border border-slate-200 object-cover"/> : <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">No photo</span>}
                    <div><p className="text-sm font-semibold text-slate-700">{driver.age ? `Age ${driver.age}` : 'Age not provided'}</p><p className="mt-1 text-xs text-slate-500">Profile photo</p></div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{driver.phone} · {driver.serviceArea}</p>
                  <p className="mt-1 text-sm text-slate-600">Driving licence: <strong>{driver.licenceNumber}</strong></p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <p>Licence expires: <strong>{driver.drivingLicenceExpiryDate ? new Date(driver.drivingLicenceExpiryDate).toLocaleDateString('en-IN') : 'Not provided'}</strong></p>
                    <p>Insurance expires: <strong>{driver.vehicleInsuranceExpiryDate ? new Date(driver.vehicleInsuranceExpiryDate).toLocaleDateString('en-IN') : 'Not provided'}</strong></p>
                    <p>FC expires: <strong>{driver.fcExpiryDate ? new Date(driver.fcExpiryDate).toLocaleDateString('en-IN') : 'Not provided'}</strong></p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Vehicle: <strong>{driver.vehicleNumber}</strong></p>
                  <p className="mt-2 text-xs text-slate-400">Registered {new Date(driver.createdAt).toLocaleString('en-IN')}</p>
                  {driver.currentLat != null && <p className="mt-1 text-xs text-slate-500">Last GPS: {driver.currentLat.toFixed(5)}, {driver.currentLng.toFixed(5)} {driver.locationUpdatedAt ? '· ' + new Date(driver.locationUpdatedAt).toLocaleString('en-IN') : ''}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button disabled={busyId === driver.id} onClick={() => editProfile(driver)} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-bold text-wayz-blue disabled:opacity-50"><FileClock size={16}/> Edit full profile</button>
                  {driver.status !== 'APPROVED' && <button disabled={busyId === driver.id} onClick={() => changeStatus(driver, 'APPROVED')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Check size={16}/> Approve</button>}
                  {driver.status !== 'REJECTED' && <button disabled={busyId === driver.id} onClick={() => changeStatus(driver, 'REJECTED')} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"><X size={16}/> Reject</button>}
                  {driver.status !== 'PENDING' && <button disabled={busyId === driver.id} onClick={() => changeStatus(driver, 'PENDING')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 disabled:opacity-50"><Clock3 size={16}/> Set pending</button>}
                </div>
              </div>
            </article>)}
          </div>}
    {editingDriver && <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/65 p-3" role="dialog" aria-modal="true" aria-labelledby="edit-driver-profile-title">
      <form onSubmit={saveProfile} className="max-h-[calc(100dvh-24px)] w-full max-w-3xl space-y-5 overflow-y-auto rounded-lg bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><h2 id="edit-driver-profile-title" className="text-2xl font-bold text-wayz-ink">Edit driver profile</h2><p className="mt-1 text-sm text-slate-500">{editingDriver.name} · {editingDriver.phone}</p></div><button type="button" onClick={() => setEditingDriver(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={20}/></button></div>
        <section className="rounded-lg border border-slate-200 p-4">
          <h3 className="mb-3 text-base font-bold text-wayz-ink">Personal details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Full name<input required minLength={2} maxLength={100} value={profileForm.name} onChange={e => setProfileForm(v => ({...v,name:e.target.value}))} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-base"/></label>
            <label className="text-sm font-semibold text-slate-700">Mobile number<input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={profileForm.phone} onChange={e => setProfileForm(v => ({...v,phone:e.target.value}))} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-base"/></label>
            <label className="text-sm font-semibold text-slate-700">Age<input required type="number" min="18" max="100" step="1" value={profileForm.age} onChange={e => setProfileForm(v => ({...v,age:e.target.value}))} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-base"/></label>
            <label className="text-sm font-semibold text-slate-700">Service area<input required maxLength={100} value={profileForm.serviceArea} onChange={e => setProfileForm(v => ({...v,serviceArea:e.target.value}))} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-base"/></label>
          </div>
          <div className="mt-4"><label className="text-sm font-semibold text-slate-700">Profile photo (JPG, PNG or WEBP · Max 5 MB)</label><div className="mt-2 flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
            {photoPreview ? <img src={photoPreview} alt="Driver profile preview" className="h-20 w-20 rounded-lg border object-cover"/> : <span className="flex h-20 w-20 items-center justify-center rounded-lg bg-slate-200 text-xs text-slate-500">No photo</span>}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const file=e.target.files?.[0] || null; setProfilePhoto(file); setPhotoPreview(file ? URL.createObjectURL(file) : (editingDriver.profilePhotoUrl ? `${API_ORIGIN}${editingDriver.profilePhotoUrl}` : '')) }} className="min-w-0 flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-wayz-blue"/>
          </div><p className="mt-1 text-xs text-slate-500">Leave this empty to keep the existing photo.</p></div>
        </section>
        <section className="rounded-lg border border-slate-200 p-4">
          <h3 className="mb-3 text-base font-bold text-wayz-ink">Vehicle details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Auto / vehicle number<input required minLength={5} maxLength={20} value={profileForm.vehicleNumber} onChange={e => setProfileForm(v => ({...v,vehicleNumber:e.target.value}))} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-base"/></label>
            <label className="text-sm font-semibold text-slate-700">Vehicle insurance expiry date<input required type="date" min={minExpiryDate} value={profileForm.vehicleInsuranceExpiryDate} onChange={e => setProfileForm(v => ({...v,vehicleInsuranceExpiryDate:e.target.value}))} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-base"/></label>
            <label className="text-sm font-semibold text-slate-700">FC expiry date (Fitness Certificate)<input required type="date" min={minExpiryDate} value={profileForm.fcExpiryDate} onChange={e => setProfileForm(v => ({...v,fcExpiryDate:e.target.value}))} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-base"/></label>
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 p-4">
          <h3 className="mb-3 text-base font-bold text-wayz-ink">Driving licence details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Driving licence number<input required minLength={5} maxLength={40} value={profileForm.licenceNumber} onChange={e => setProfileForm(v => ({...v,licenceNumber:e.target.value}))} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-base"/></label>
            <label className="text-sm font-semibold text-slate-700">Driving licence expiry date<input required type="date" min={minExpiryDate} value={profileForm.drivingLicenceExpiryDate} onChange={e => setProfileForm(v => ({...v,drivingLicenceExpiryDate:e.target.value}))} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-base"/></label>
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 p-4">
          <h3 className="mb-1 text-base font-bold text-wayz-ink">Account security</h3>
          <p className="mb-3 text-xs text-slate-500">Password cannot be viewed. Enter a new password only if you need to reset it.</p>
          <label className="block text-sm font-semibold text-slate-700">Set new password (optional)<input type="password" minLength={8} maxLength={128} autoComplete="new-password" value={profileForm.password} onChange={e => setProfileForm(v => ({...v,password:e.target.value}))} placeholder="Leave blank to keep current password" className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-base"/></label>
        </section>
        <p className="rounded-lg bg-amber-50 p-3 text-sm leading-5 text-amber-800">All document expiry dates must be valid future dates. Updating the profile does not automatically reactivate a suspended driver. Review the renewed details, then use Approve to restore ride access.</p>
        <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setEditingDriver(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={busyId === editingDriver.id} type="submit" className="rounded-lg bg-wayz-blue px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busyId === editingDriver.id ? 'Saving…' : 'Save driver profile'}</button></div>
      </form>
    </div>}
  </div>
}
