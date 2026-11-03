import { SiteHeader, SiteFooter } from './SiteChrome'

export default function PageLayout({ children }) {
  return <div className="min-h-screen bg-white"><SiteHeader/><main className="page-enter">{children}</main><SiteFooter/></div>
}
