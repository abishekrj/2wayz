import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const sections = [
  { slug: 'hero-banner', title: 'Hero Banner', sortOrder: 1, content: { slides: [
    { eyebrow: 'LOCAL AUTO BOOKING · TIRUVANNAMALAI', title: 'Your town. Your ride.', imageUrl: '', description: 'Book a local auto in a few simple steps.' },
    { eyebrow: 'PLAN YOUR JOURNEY WITH CONFIDENCE', title: 'Know your route. Know your fare.', imageUrl: '', description: 'Check road distance, travel time and an indicative fare before you go.' },
    { eyebrow: 'A LOCAL PLATFORM FOR LOCAL DRIVERS', title: 'Local rides. Local drivers.', imageUrl: '', description: 'A simpler way for Tiruvannamalai passengers and auto drivers to connect.' }
  ] } },
  { slug: 'benefits', title: 'Benefits', sortOrder: 2, content: { items: [
    { title: 'Quick local rides', body: 'Find an auto for everyday trips around Tiruvannamalai.', icon: 'clock' },
    { title: 'Ride on your time', body: 'Book now or plan your journey ahead of time.', icon: 'calendar' },
    { title: 'Clear fare estimate', body: 'See an indicative fare before you proceed.', icon: 'wallet' },
    { title: 'Local and reliable', body: 'A service focused on the needs of our town.', icon: 'shield' }
  ] } },
  { slug: 'how-it-works', title: 'How It Works', sortOrder: 3, content: { eyebrow: 'Simple by design', heading: 'Your ride in three easy steps', description: 'A straightforward way to plan your local journey.', steps: [
    { title: 'Choose your locations', text: 'Enter your pickup point and destination using Google location suggestions.' },
    { title: 'Check your route & fare', text: 'See the estimated road distance, travel time and indicative auto fare.' },
    { title: 'Request your auto', text: 'Request an auto; live driver matching is coming soon.' }
  ] } },
  { slug: 'darshan-promo', title: 'Darshan Promo Banner', sortOrder: 4, content: { heading: 'Planning a visit to Arunachaleswarar Temple?', body: 'Get started with your Darshan ticket booking through the Tamil Nadu Hindu Religious & Charitable Endowments Department portal. Plan your visit with greater peace of mind.', imageUrl: '', buttonText: 'Book Darshan Tickets', buttonUrl: 'https://hrce.tn.gov.in/intrahrce/login', disclosure: 'You’ll be redirected to the official HR&CE website to continue.' } },
  { slug: 'nearby-places', title: 'Places to Visit', sortOrder: 5, content: { heading: 'Places to Visit in Tiruvannamalai', places: [
    'Arunachaleswarar Temple','Sri Ramana Ashram','Virupaksha Cave','Skandashramam','Yogi Ramsuratkumar Ashram','Adi Annamalai Temple','Seshadri Swamigal Ashram','Pachaiamman Temple'
  ].map(name => ({ name, subtitle: '', detail: '', imageUrl: '' })) } },
  { slug: 'upcoming-events', title: 'Upcoming Events', sortOrder: 6, content: { heading: 'Upcoming Events', events: [
    { title: 'Karthigai Deepam', date: '2026-11-24' },
    { title: 'New Year 2027', date: '2027-01-01' }
  ] } },
  { slug: 'about', title: 'About 2WAYZ', sortOrder: 7, content: { eyebrow: 'A local mobility partner', heading: 'Getting around Tiruvannamalai, made simpler.', body: 'From temple visits and market trips to everyday errands, 2WAYZ is being built around the way people travel in our town.', imageUrl: '', points: ['Book an auto when you need one','Plan a ride for a later time','See an indicative fare before continuing'] } },
  { slug: 'drivers', title: 'Driver Section', sortOrder: 8, content: { eyebrow: 'BUILT WITH LOCAL DRIVERS IN MIND', heading: 'A better way to connect with your next passenger.', body: '2WAYZ aims to help Tiruvannamalai auto drivers connect with nearby customers through a straightforward local booking platform.', buttonText: 'Join as a driver', benefits: ['Connect with passengers in your local area','A simple app experience designed for auto drivers','Transparent trip and earning information','Build direct relationships with local customers'] } }
]


const cmsPages = [
  { slug: 'about', title: 'Local mobility, built around Tiruvannamalai.', navLabel: 'About', footerLabel: 'About 2WAYZ', sortOrder: 1, content: { eyebrow: 'About 2WAYZ', intro: '2WAYZ is a local auto-booking platform concept designed to connect passengers with auto drivers in Tiruvannamalai. Our focus is a simple booking experience and a platform that understands local travel.', sections: [{ heading: 'Focused on our town', text: '2WAYZ is being built around everyday travel needs in Tiruvannamalai, from local errands to visits around town.' }, { heading: 'Passengers and drivers together', text: 'The platform is intended to make it easier for passengers to request local auto rides and for local drivers to connect with customers.' }, { heading: 'Clear journey information', text: 'Passengers can enter pickup and destination points and review an estimated road distance, travel time and indicative fare.' }, { heading: 'A local-first approach', text: 'We aim to keep the experience straightforward and relevant to the people who use local autos every day.' }], notice: '2WAYZ is currently under development. Fare values shown in the prototype are indicative, and live driver matching, trip payments and real-time tracking are not yet available.' } },
  { slug: 'how-it-works', title: 'Plan your local auto ride in a few simple steps.', navLabel: 'How it works', footerLabel: 'How it works', sortOrder: 2, content: { eyebrow: 'How it works', intro: 'The 2WAYZ booking flow is designed to help you enter a route, understand the journey and review an indicative fare before continuing.', sections: [{ heading: 'Enter pickup and destination', text: 'Choose where your trip starts and where you want to go. Location suggestions help you select the right places.' }, { heading: 'Choose when to travel', text: 'Select an instant ride or enter a preferred time for a scheduled journey.' }, { heading: 'Review your route', text: 'The prototype uses Google Routes to show road distance and estimated travel time.' }, { heading: 'Check the indicative fare', text: 'Review the fare estimate before proceeding. The current tariff is a starter estimate and is not a final driver-approved price.' }, { heading: 'Continue with your ride request', text: 'Proceed to the trip details and tracking preview. Automatic driver dispatch and live trip updates are planned for a later phase.' }], notice: 'Please note: the current app is a working frontend prototype. Booking confirmation, driver assignment, OTP, payments, push notifications and live GPS tracking require backend integration.' } },
  { slug: 'drivers', title: 'Your local rides. Your local customers.', navLabel: 'For drivers', footerLabel: 'For drivers', sortOrder: 3, content: { eyebrow: 'For auto drivers', intro: '2WAYZ aims to give auto drivers in Tiruvannamalai a simple way to connect with passengers and participate in local digital mobility.', sections: [{ heading: 'Connect with nearby passengers', text: 'Be part of a local platform intended to connect Tiruvannamalai auto drivers with people looking for rides.' }, { heading: 'Understand trip earnings', text: 'The planned driver experience will show trip and earning information clearly. Wallet and commission workflows are not active in this frontend prototype.' }, { heading: 'A straightforward driver journey', text: 'The driver registration flow collects basic contact, vehicle and licence details for initial interest.' }, { heading: 'Designed for local autos', text: '2WAYZ is focused on local auto-rickshaw journeys and the needs of drivers serving the town.' }], ctaTitle: 'Interested in joining 2WAYZ?', ctaText: 'Submit your name, mobile number, service area, vehicle number and driving licence number. The current form is a frontend preview; secure submission, OTP verification and document checks will be added with the backend.', ctaButton: 'Register as a driver', ctaUrl: '/driver/register' } },
  { slug: 'contact', title: 'We are building local mobility for Tiruvannamalai.', navLabel: 'Contact', footerLabel: 'Contact', sortOrder: 4, content: { eyebrow: 'Contact 2WAYZ', intro: 'Have a question about the 2WAYZ passenger experience or driver registration? Use the information below as our current contact location.', sections: [{ heading: 'Our service area', text: 'Tiruvannamalai, Tamil Nadu, India. 2WAYZ is currently focused on local auto travel in and around Tiruvannamalai.' }, { heading: 'Send us an enquiry', text: 'For now, use the driver registration page if you are an auto driver interested in joining the network.' }, { heading: 'Contact details', text: 'A public phone number, email address and customer-support hours have not yet been configured for this prototype. We will publish verified details here when they are available.' }] } }
]

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password || password === 'CHANGE_THIS_BEFORE_SEEDING') {
    throw new Error('Set ADMIN_EMAIL and a strong ADMIN_PASSWORD in backend/.env before running the seed.')
  }
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.adminUser.upsert({
    where: { email },
    update: { name: process.env.ADMIN_NAME || '2WAYZ Super Admin', passwordHash, isActive: true },
    create: { name: process.env.ADMIN_NAME || '2WAYZ Super Admin', email, passwordHash }
  })
  for (const section of sections) {
    const existing = await prisma.homePageSection.findUnique({ where: { slug: section.slug } })
    if (!existing) {
      await prisma.homePageSection.create({ data: section })
      continue
    }
    const mergeDefaults = (current, defaults) => {
      if (Array.isArray(defaults)) {
        if (!Array.isArray(current)) return defaults
        return defaults.map((item, index) => {
          const old = current[index]
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            const previous = old && typeof old === 'object' && !Array.isArray(old) ? old : (typeof old === 'string' ? { name: old } : {})
            return mergeDefaults(previous, item)
          }
          return old === undefined ? item : old
        }).concat(current.slice(defaults.length))
      }
      if (defaults && typeof defaults === 'object') {
        const previous = current && typeof current === 'object' && !Array.isArray(current) ? current : {}
        return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, previous[key] === undefined ? value : mergeDefaults(previous[key], value)]).concat(Object.entries(previous).filter(([key]) => !(key in defaults))))
      }
      return current === undefined ? defaults : current
    }
    await prisma.homePageSection.update({
      where: { slug: section.slug },
      data: { title: section.title, sortOrder: section.sortOrder, content: mergeDefaults(existing.content, section.content) }
    })
  }
  for (const page of cmsPages) {
    await prisma.cmsPage.upsert({
      where: { slug: page.slug },
      update: { title: page.title, navLabel: page.navLabel, footerLabel: page.footerLabel, sortOrder: page.sortOrder },
      create: page
    })
  }
  console.log('Super admin, homepage sections and CMS pages are ready.')
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())