import { useEffect, useState } from 'react'
import { Save, Facebook, Instagram, Youtube, MessageCircle, Linkedin, Twitter, Share2 } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const platforms = [
  { key: 'facebook', label: 'Facebook', hint: 'https://www.facebook.com/your-page', Icon: Facebook },
  { key: 'instagram', label: 'Instagram', hint: 'https://www.instagram.com/your-profile', Icon: Instagram },
  { key: 'youtube', label: 'YouTube', hint: 'https://www.youtube.com/@your-channel', Icon: Youtube },
  { key: 'whatsapp', label: 'WhatsApp', hint: 'https://wa.me/91XXXXXXXXXX', Icon: MessageCircle },
  { key: 'linkedin', label: 'LinkedIn', hint: 'https://www.linkedin.com/company/your-page', Icon: Linkedin },
  { key: 'x', label: 'X (Twitter)', hint: 'https://x.com/your-profile', Icon: Twitter }
]
const emptyLinks = Object.fromEntries(platforms.map(platform => [platform.key, '']))

export default function AdminSocialLinksPage() {
  const [links, setLinks] = useState(emptyLinks)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    adminApi.adminSocialLinks()
      .then(data => { if (active) setLinks({ ...emptyLinks, ...(data.links || {}) }) })
      .catch(err => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function save(event) {
    event.preventDefault()
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await adminApi.saveSocialLinks(links)
      setLinks({ ...emptyLinks, ...(result.links || {}) })
      setMessage('Social media links saved successfully. They will appear in the website footer.')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-4xl">
    <div className="flex items-start gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-wayz-blue"><Share2 size={23}/></span>
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Website settings</p><h1 className="mt-1 text-2xl font-bold text-wayz-ink sm:text-3xl">Social Links</h1><p className="mt-2 text-sm leading-6 text-slate-500">Add the official 2WAYZ social media profile URLs. Only platforms with a saved URL will appear in the public website footer.</p></div>
    </div>
    {loading ? <p className="mt-7 text-sm text-slate-500">Loading social links…</p> : <form onSubmit={save} className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        {platforms.map(({ key, label, hint, Icon }) => <label key={key} className="block">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Icon size={17} className="text-wayz-blue"/>{label}</span>
          <input type="url" inputMode="url" autoComplete="url" value={links[key] || ''} onChange={event => setLinks(current => ({ ...current, [key]: event.target.value }))} placeholder={hint} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-wayz-blue focus:ring-2 focus:ring-blue-100"/>
        </label>)}
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-500">Use the full HTTPS URL for each profile. Leave a field empty to hide that platform’s icon. For WhatsApp, you can use a click-to-chat link such as https://wa.me/91XXXXXXXXXX.</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      <div className="mt-6 border-t border-slate-100 pt-5"><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-wayz-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-wayz-navy disabled:opacity-60"><Save size={17}/>{saving ? 'Saving…' : 'Save social links'}</button></div>
    </form>}
  </div>
}
