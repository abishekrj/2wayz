import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Save, Info } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const STARTER = { baseFare: 30, includedDistanceKm: 1, perKmRate: 18, minimumFare: 50, roundingIncrement: 5, isActive: true }
const money = value => '₹' + Number(value || 0).toLocaleString('en-IN')

export default function AdminFareSettingsPage() {
  const [settings, setSettings] = useState(STARTER)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await adminApi.adminFareSettings()
      if (result.settings) setSettings({
        baseFare: result.settings.baseFare,
        includedDistanceKm: result.settings.includedDistanceKm,
        perKmRate: result.settings.perKmRate,
        minimumFare: result.settings.minimumFare,
        roundingIncrement: result.settings.roundingIncrement,
        isActive: result.settings.isActive
      })
    } catch (err) {
      setError(err.message || 'Unable to load fare settings.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function update(field, value) {
    setSettings(current => ({ ...current, [field]: value }))
    setNotice('')
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        baseFare: Number(settings.baseFare),
        includedDistanceKm: Number(settings.includedDistanceKm),
        perKmRate: Number(settings.perKmRate),
        minimumFare: Number(settings.minimumFare),
        roundingIncrement: Number(settings.roundingIncrement),
        isActive: Boolean(settings.isActive)
      }
      const result = await adminApi.saveFareSettings(payload)
      setSettings(result.settings)
      setNotice(result.message || 'Fare settings saved.')
    } catch (err) {
      setError(err.message || 'Unable to save fare settings.')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading fare settings…</div>

  return <div className="mx-auto max-w-5xl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-wayz-blue">Pricing management</p>
        <h1 className="mt-2 text-3xl font-bold text-wayz-ink">Fare Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">Manage the tariff used for passenger fare estimates and server-verified ride bookings.</p>
      </div>
      <button type="button" onClick={load} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={16}/>Refresh</button>
    </div>

    {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

    <form onSubmit={save} className="mt-7 space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold text-wayz-ink">Local auto tariff</h2><p className="mt-1 text-sm text-slate-500">All fare amounts are in Indian Rupees (₹).</p></div>
          <span className={settings.isActive ? 'rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700' : 'rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700'}>{settings.isActive ? 'Custom tariff active' : 'Starter tariff in use'}</span>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input type="checkbox" checked={settings.isActive} onChange={event => update('isActive', event.target.checked)} className="mt-1 h-4 w-4 accent-[#2563a6]"/>
          <span><span className="block text-sm font-bold text-wayz-ink">Enable custom fare settings</span><span className="mt-1 block text-xs leading-5 text-slate-500">When disabled, 2WAYZ uses the starter tariff: ₹30 base, first 1 km included, ₹18/km after that, ₹50 minimum, rounded up to ₹5.</span></span>
        </label>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">Base fare (₹)<input required type="number" min="0" max="5000" step="1" value={settings.baseFare} onChange={event => update('baseFare', event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 text-base font-normal outline-none focus:border-wayz-blue focus:ring-2 focus:ring-blue-100"/></label>
          <label className="text-sm font-semibold text-slate-700">Included distance (km)<input required type="number" min="0" max="50" step="0.1" value={settings.includedDistanceKm} onChange={event => update('includedDistanceKm', event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 text-base font-normal outline-none focus:border-wayz-blue focus:ring-2 focus:ring-blue-100"/></label>
          <label className="text-sm font-semibold text-slate-700">Per-kilometre rate (₹)<input required type="number" min="0" max="500" step="0.5" value={settings.perKmRate} onChange={event => update('perKmRate', event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 text-base font-normal outline-none focus:border-wayz-blue focus:ring-2 focus:ring-blue-100"/></label>
          <label className="text-sm font-semibold text-slate-700">Minimum fare (₹)<input required type="number" min="1" max="10000" step="1" value={settings.minimumFare} onChange={event => update('minimumFare', event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 text-base font-normal outline-none focus:border-wayz-blue focus:ring-2 focus:ring-blue-100"/></label>
          <label className="text-sm font-semibold text-slate-700">Rounding increment (₹)<input required type="number" min="1" max="1000" step="1" value={settings.roundingIncrement} onChange={event => update('roundingIncrement', event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 text-base font-normal outline-none focus:border-wayz-blue focus:ring-2 focus:ring-blue-100"/></label>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:p-6">
        <div className="flex items-start gap-3"><Info className="mt-0.5 shrink-0 text-wayz-blue" size={19}/><div><h2 className="text-sm font-bold text-wayz-ink">How the fare is calculated</h2><p className="mt-1 text-sm leading-6 text-slate-600">The system adds the base fare and the per-kilometre charge after the included distance, applies the minimum fare, then rounds the result up to the selected increment.</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Base fare</p><p className="mt-1 text-xl font-bold text-wayz-ink">{money(settings.baseFare)}</p></div>
          <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">After included distance</p><p className="mt-1 text-xl font-bold text-wayz-ink">{money(settings.perKmRate)} / km</p></div>
          <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">Minimum fare</p><p className="mt-1 text-xl font-bold text-wayz-ink">{money(settings.minimumFare)}</p></div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-wayz-blue px-6 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"><Save size={17}/>{saving ? 'Saving…' : 'Save fare settings'}</button><p className="text-xs text-slate-500">New settings apply to new bookings only. Existing bookings keep their saved fare.</p></div>
    </form>
  </div>
}
