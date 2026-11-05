import { MapPin, MessageCircle, Mail, Phone } from 'lucide-react'
import InfoPageLayout from '../components/InfoPageLayout'

export default function ContactPage() {
  return <InfoPageLayout eyebrow="Contact 2WAYZ" title="We are building local mobility for Tiruvannamalai." intro="Have a question about the 2WAYZ passenger experience or driver registration? Use the information below as our current contact location.">
    <div className="grid gap-5 md:grid-cols-2">
      <article className="rounded-3xl border border-slate-100 p-7 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-wayz-blue"><MapPin size={23}/></div><h2 className="mt-5 text-xl font-bold text-wayz-ink">Our service area</h2><p className="mt-2 text-sm leading-6 text-slate-600">Tiruvannamalai, Tamil Nadu, India.</p><p className="mt-4 text-xs text-slate-400">2WAYZ is currently focused on local auto travel in and around Tiruvannamalai.</p></article>
      <article className="rounded-3xl border border-slate-100 p-7 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-wayz-blue"><MessageCircle size={23}/></div><h2 className="mt-5 text-xl font-bold text-wayz-ink">Send us an enquiry</h2><p className="mt-2 text-sm leading-6 text-slate-600">For now, use the driver registration page if you are an auto driver interested in joining the network.</p><p className="mt-4 text-xs text-slate-400">A general enquiry form and verified contact channels will be added when the support workflow is ready.</p></article>
    </div>
    <div className="mt-8 rounded-2xl bg-wayz-mist p-6"><h2 className="font-bold text-wayz-ink">Contact details</h2><p className="mt-2 text-sm leading-6 text-slate-600">A public phone number, email address and customer-support hours have not yet been configured for this prototype. We will publish verified details here when they are available.</p></div>
  </InfoPageLayout>
}
