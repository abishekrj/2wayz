import { Link } from 'react-router-dom'

export default function Brand({ light = false }) {
  return <Link to="/" className={`flex items-center gap-1 text-3xl font-bold italic tracking-[-.08em] sm:text-[34px] ${light ? 'text-white' : 'text-wayz-navy'}`}>2WAYZ<span className="ml-0.5 inline-block h-3 w-5 -skew-x-12 rounded-sm bg-wayz-yellow"/></Link>
}