import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null)
  const [show, setShow] = useState(false)
  const [iosHelpOpen, setIosHelpOpen] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const ua = window.navigator.userAgent || ''
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    setIsIos(ios)
    if (standalone || sessionStorage.getItem('2wayz-install-dismissed') === '1') return

    if (ios) {
      setShow(true)
      return
    }

    const handlePrompt = (event) => {
      event.preventDefault()
      setInstallEvent(event)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  const dismiss = () => {
    setShow(false)
    setIosHelpOpen(false)
    sessionStorage.setItem('2wayz-install-dismissed', '1')
  }

  const install = async () => {
    if (!installEvent) return
    setBusy(true)
    try {
      await installEvent.prompt()
      await installEvent.userChoice
      setInstallEvent(null)
      setShow(false)
    } finally {
      setBusy(false)
    }
  }

  if (!show) return null

  return (
    <>
      <aside className="fixed bottom-24 left-3 right-3 z-[120] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl sm:bottom-5 sm:left-auto sm:right-5">
        <img src="/icons/2wayz-icon.svg" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Install 2WAYZ</p>
          <p className="text-xs leading-5 text-slate-500">{isIos ? 'Add 2WAYZ to your iPhone home screen.' : 'Use 2WAYZ like an app on your phone.'}</p>
        </div>
        {isIos ? (
          <button type="button" onClick={() => setIosHelpOpen(true)} className="shrink-0 rounded-lg bg-[#073b83] px-3 py-2 text-xs font-semibold text-white">How</button>
        ) : (
          <button type="button" onClick={install} disabled={busy} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#073b83] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"><Download size={14}/>{busy ? 'Opening…' : 'Install'}</button>
        )}
        <button type="button" onClick={dismiss} aria-label="Dismiss install prompt" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={17}/></button>
      </aside>

      {iosHelpOpen && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/50 p-3 sm:items-center" onClick={() => setIosHelpOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="ios-install-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 id="ios-install-title" className="text-lg font-bold text-slate-900">Add 2WAYZ to Home Screen</h2>
              <button type="button" onClick={() => setIosHelpOpen(false)} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button>
            </div>
            <ol className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
              <li className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#073b83]"><Share size={17}/></span><span>In Safari, tap the <strong>Share</strong> button at the bottom of the screen.</span></li>
              <li className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 font-bold text-[#073b83]">＋</span><span>Scroll down and choose <strong>Add to Home Screen</strong>.</span></li>
              <li className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#073b83]"><Download size={17}/></span><span>Tap <strong>Add</strong>. Open 2WAYZ from the new home-screen icon.</span></li>
            </ol>
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Use Safari for installation on iPhone. The Add to Home Screen option may not appear in other browsers.</p>
            <button type="button" onClick={dismiss} className="mt-4 w-full rounded-lg bg-[#073b83] px-4 py-3 text-sm font-semibold text-white">Got it</button>
          </section>
        </div>
      )}
    </>
  )
}