import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Save, X, HelpCircle, RefreshCw } from 'lucide-react'
import { adminApi } from '../lib/adminApi'

const emptyFaq = () => ({ id: 'faq-' + Date.now(), question: '', answer: '', isPublished: true })

export default function AdminFaqsPage() {
  const [heading, setHeading] = useState('Frequently Asked Questions')
  const [description, setDescription] = useState('Quick answers to common questions about booking and travelling with 2WAYZ.')
  const [faqs, setFaqs] = useState([])
  const [form, setForm] = useState(emptyFaq())
  const [editing, setEditing] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await adminApi.adminFaqs()
      setHeading(data.heading || 'Frequently Asked Questions')
      setDescription(data.description || '')
      setFaqs((data.faqs || []).map((faq, index) => ({ ...faq, id: faq.id || 'faq-' + index, isPublished: faq.isPublished !== false, sortOrder: index })))
    } catch (err) { setError(err.message || 'Unable to load FAQs.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  function openAdd() { setEditing(null); setForm(emptyFaq()); setEditorOpen(true); setError(''); setNotice('') }
  function openEdit(faq, index) { setEditing(index); setForm({ ...faq }); setEditorOpen(true); setError(''); setNotice('') }
  function closeEditor() { setEditorOpen(false); setEditing(null); setForm(emptyFaq()) }

  function submitFaq(event) {
    event.preventDefault()
    if (!form.question.trim() || !form.answer.trim()) { setError('Enter both a question and its answer.'); return }
    const next = [...faqs]
    const item = { ...form, question: form.question.trim(), answer: form.answer.trim() }
    if (editing === null) next.push(item)
    else next[editing] = item
    setFaqs(next.map((faq, index) => ({ ...faq, sortOrder: index })))
    closeEditor()
    setNotice('FAQ updated in the editor. Save configuration to publish the changes.')
    setError('')
  }
  function removeFaq(index) {
    if (!window.confirm('Delete this FAQ?')) return
    setFaqs(current => current.filter((_, i) => i !== index).map((faq, i) => ({ ...faq, sortOrder: i })))
    setNotice('FAQ removed. Save configuration to apply the change.')
  }
  function moveFaq(index, direction) {
    const target = index + direction
    if (target < 0 || target >= faqs.length) return
    const next = [...faqs]; [next[index], next[target]] = [next[target], next[index]]
    setFaqs(next.map((faq, i) => ({ ...faq, sortOrder: i })))
  }
  function togglePublished(index) {
    setFaqs(current => current.map((faq, i) => i === index ? { ...faq, isPublished: !faq.isPublished } : faq))
  }
  async function saveConfiguration() {
    setSaving(true); setError(''); setNotice('')
    try {
      const result = await adminApi.saveFaqs({ heading, description, faqs: faqs.map((faq, index) => ({ ...faq, sortOrder: index })) })
      setFaqs((result.faqs || []).map(faq => ({ ...faq })))
      setNotice('FAQs saved successfully. Published questions are now available on the homepage.')
    } catch (err) { setError(err.message || 'Unable to save FAQs.') }
    finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-wayz-blue">Website configuration</p><h1 className="mt-2 text-2xl font-bold text-wayz-ink sm:text-3xl">Frequently Asked Questions</h1><p className="mt-2 text-sm text-slate-500">Add and manage the questions and answers displayed on the public homepage.</p></div>
      <button type="button" onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-wayz-blue px-5 py-3 text-sm font-bold text-white"><Plus size={17}/> Add a question</button>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Section heading<input value={heading} onChange={event => setHeading(event.target.value)} maxLength={140} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-wayz-blue focus:ring-2 focus:ring-blue-100"/></label>
      <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">Section description<textarea rows={2} value={description} onChange={event => setDescription(event.target.value)} maxLength={300} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-wayz-blue focus:ring-2 focus:ring-blue-100"/></label>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{faqs.length} questions configured · {faqs.filter(faq => faq.isPublished).length} published</p><button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RefreshCw size={14}/> Reload</button></div>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
    {editorOpen && <form onSubmit={submitFaq} className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between"><h2 className="font-bold text-wayz-ink">{editing === null ? 'Add FAQ' : 'Edit FAQ'}</h2><button type="button" onClick={closeEditor} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close editor"><X size={18}/></button></div>
      <label className="block text-xs font-semibold text-slate-600">Question<input required maxLength={240} value={form.question} onChange={event => setForm(current => ({ ...current, question: event.target.value }))} placeholder="e.g. How do I book an auto?" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-wayz-blue focus:ring-2 focus:ring-blue-100"/></label>
      <label className="mt-4 block text-xs font-semibold text-slate-600">Answer<textarea required rows={4} maxLength={2000} value={form.answer} onChange={event => setForm(current => ({ ...current, answer: event.target.value }))} placeholder="Write a clear answer for passengers…" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none focus:border-wayz-blue focus:ring-2 focus:ring-blue-100"/></label>
      <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.isPublished !== false} onChange={event => setForm(current => ({ ...current, isPublished: event.target.checked }))}/> Publish this question on the homepage</label>
      <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={closeEditor} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" className="rounded-xl bg-wayz-blue px-5 py-2.5 text-sm font-bold text-white">{editing === null ? 'Add question' : 'Update question'}</button></div>
    </form>}
    <div className="space-y-3">
      {loading ? <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Loading FAQs…</div> : faqs.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><HelpCircle size={30} className="mx-auto text-slate-300"/><p className="mt-3 font-semibold text-slate-700">No questions added yet</p><p className="mt-1 text-xs text-slate-500">Add your first FAQ to get started.</p></div> : faqs.map((faq, index) => <article key={faq.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-wayz-ink">{faq.question}</h3><span className={faq.isPublished ? 'rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700' : 'rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500'}>{faq.isPublished ? 'Published' : 'Hidden'}</span></div><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-500">{faq.answer}</p></div>
        <div className="flex items-center gap-1 self-end sm:self-start"><button type="button" disabled={index===0} onClick={()=>moveFaq(index,-1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Move up"><ArrowUp size={16}/></button><button type="button" disabled={index===faqs.length-1} onClick={()=>moveFaq(index,1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Move down"><ArrowDown size={16}/></button><button type="button" onClick={()=>togglePublished(index)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={faq.isPublished ? 'Hide FAQ' : 'Publish FAQ'}>{faq.isPublished ? <EyeOff size={16}/> : <Eye size={16}/>}</button><button type="button" onClick={()=>openEdit(faq,index)} className="rounded-lg p-2 text-wayz-blue hover:bg-blue-50" aria-label="Edit FAQ"><Pencil size={16}/></button><button type="button" onClick={()=>removeFaq(index)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Delete FAQ"><Trash2 size={16}/></button></div>
      </article>)}
    </div>
    <div className="sticky bottom-3 flex justify-end"><button type="button" onClick={saveConfiguration} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-xl bg-wayz-yellow px-6 py-3.5 text-sm font-bold text-wayz-ink shadow-lg disabled:opacity-50"><Save size={17}/>{saving ? 'Saving…' : 'Save configuration'}</button></div>
  </div>
}
