import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const sections = [
  { slug: 'hero-banner', title: 'Hero Banner', sortOrder: 1, content: { slides: [
    { eyebrow: 'LOCAL AUTO BOOKING · TIRUVANNAMALAI', title: 'Your town. Your ride.', description: 'Book a local auto in a few simple steps.' },
    { eyebrow: 'PLAN YOUR JOURNEY WITH CONFIDENCE', title: 'Know your route. Know your fare.', description: 'Check road distance, travel time and an indicative fare before you go.' },
    { eyebrow: 'A LOCAL PLATFORM FOR LOCAL DRIVERS', title: 'Local rides. Local drivers.', description: 'A simpler way for Tiruvannamalai passengers and auto drivers to connect.' }
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
  { slug: 'darshan-promo', title: 'Darshan Promo Banner', sortOrder: 4, content: { heading: 'Planning a visit to Arunachaleswarar Temple?', body: 'Get started with your Darshan ticket booking through the Tamil Nadu Hindu Religious & Charitable Endowments Department portal. Plan your visit with greater peace of mind.', buttonText: 'Book Darshan Tickets', buttonUrl: 'https://hrce.tn.gov.in/intrahrce/login', disclosure: 'You’ll be redirected to the official HR&CE website to continue.' } },
  { slug: 'nearby-places', title: 'Places to Visit', sortOrder: 5, content: { heading: 'Places to Visit in Tiruvannamalai', places: [
    'Arunachaleswarar Temple','Sri Ramana Ashram','Virupaksha Cave','Skandashramam','Yogi Ramsuratkumar Ashram','Adi Annamalai Temple','Seshadri Swamigal Ashram','Pachaiamman Temple'
  ] } },
  { slug: 'upcoming-events', title: 'Upcoming Events', sortOrder: 6, content: { heading: 'Upcoming Events', events: [
    { title: 'Karthigai Deepam', date: '2026-11-24' },
    { title: 'New Year 2027', date: '2027-01-01' }
  ] } },
  { slug: 'about', title: 'About 2WAYZ', sortOrder: 7, content: { eyebrow: 'A local mobility partner', heading: 'Getting around Tiruvannamalai, made simpler.', body: 'From temple visits and market trips to everyday errands, 2WAYZ is being built around the way people travel in our town.', points: ['Book an auto when you need one','Plan a ride for a later time','See an indicative fare before continuing'] } },
  { slug: 'drivers', title: 'Driver Section', sortOrder: 8, content: { eyebrow: 'BUILT WITH LOCAL DRIVERS IN MIND', heading: 'A better way to connect with your next passenger.', body: '2WAYZ aims to help Tiruvannamalai auto drivers connect with nearby customers through a straightforward local booking platform.', buttonText: 'Join as a driver', benefits: ['Connect with passengers in your local area','A simple app experience designed for auto drivers','Transparent trip and earning information','Build direct relationships with local customers'] } }
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
    await prisma.homePageSection.upsert({
      where: { slug: section.slug },
      update: { title: section.title, content: section.content, sortOrder: section.sortOrder },
      create: section
    })
  }
  console.log('Super admin and homepage section defaults are ready.')
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())