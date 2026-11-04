import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

// Create the two legal CMS records when missing. Existing admin-edited content is never overwritten.
const requiredLegalPages = [
  {
    slug: 'terms-and-conditions',
    title: 'Terms and Conditions',
    navLabel: 'Terms and Conditions',
    footerLabel: 'Terms and Conditions',
    sortOrder: 5,
    content: {
      eyebrow: 'Legal information',
      intro: 'Please read these terms before using the 2WAYZ website or local auto-booking service.',
      sections: [
        { heading: '1. About 2WAYZ', text: '2WAYZ provides a platform to help passengers connect with independent auto-rickshaw drivers for local journeys. The platform facilitates booking requests and related trip information.' },
        { heading: '2. Accounts and eligibility', text: 'You must provide accurate information when creating an account and keep your login details secure. You are responsible for activity carried out through your account. 2WAYZ may restrict accounts involved in misuse, fraud or violations of these terms.' },
        { heading: '3. Booking requests', text: 'A booking request is subject to driver availability and acceptance. A request is not confirmed until a driver accepts it. Pickup, destination and contact details should be accurate.' },
        { heading: '4. Fares and payment', text: 'Fare estimates shown before booking are indicative and may be subject to route or trip changes. Unless the platform explicitly states otherwise, passengers pay the driver directly. 2WAYZ does not currently process passenger trip payments through an online payment gateway.' },
        { heading: '5. Cancellations', text: 'Bookings may be cancelled only where the booking status and platform controls permit. Repeated misuse or cancellations may result in account restrictions. Any applicable adjustment will be handled according to the information shown in the platform.' },
        { heading: '6. Driver responsibilities', text: 'Drivers are independent service providers and are responsible for valid licences, vehicle documents, safe operation, lawful conduct and compliance with applicable transport rules.' },
        { heading: '7. Acceptable use', text: 'You must not misuse the platform, submit false information, interfere with its operation, harass other users or use it for unlawful purposes.' },
        { heading: '8. Availability and third-party services', text: 'The platform may depend on third-party services such as maps and location providers. Continuous availability, accuracy of third-party data and uninterrupted access cannot be guaranteed.' },
        { heading: '9. Changes and contact', text: 'These terms may be updated from time to time. Continued use after an update means you acknowledge the revised terms. Add the operator’s legal name and contact details here before public launch.' }
      ],
      notice: 'This is a starter policy draft, not legal advice. Have it reviewed by a qualified legal professional and complete the operator identity, contact details and operational terms before launch.'
    }
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    navLabel: 'Privacy Policy',
    footerLabel: 'Privacy Policy',
    sortOrder: 6,
    content: {
      eyebrow: 'Your information',
      intro: 'This policy explains how 2WAYZ may collect and use information when you visit the website or use its local auto-booking features.',
      sections: [
        { heading: '1. Information we collect', text: 'Depending on how you use the service, we may collect your name, mobile number, account details, booking information, pickup and destination details, trip status and communications with support.' },
        { heading: '2. Location information', text: 'When you allow location access, the platform may use your device location to identify a pickup point and support driver matching and trip tracking. You can manage location permission through your device or browser settings.' },
        { heading: '3. How information is used', text: 'Information may be used to create and manage accounts, process booking requests, connect passengers and drivers, provide trip updates, support customer service, prevent misuse and improve platform reliability.' },
        { heading: '4. Sharing information', text: 'Relevant booking and contact details may be shared with the passenger or driver involved in a trip. Information may also be shared with service providers supporting hosting, maps, security and platform operations, or where required by law.' },
        { heading: '5. Maps and third-party services', text: 'Map, geocoding and route features may be provided by Google Maps Platform or other third parties. Their services may process information under their own privacy terms.' },
        { heading: '6. Security and retention', text: 'We use reasonable technical and organisational measures to protect information. Information is retained for as long as needed for service, legal, security and dispute-resolution purposes, subject to applicable law.' },
        { heading: '7. Your choices and requests', text: 'You may manage device location permissions and contact the platform operator to request access, correction or deletion where applicable. Add a monitored privacy contact address before public launch.' },
        { heading: '8. Children and policy updates', text: 'The service is not intended for children to create accounts independently. We may update this policy and publish the revised version on this page.' }
      ],
      notice: 'This is a starter policy draft, not legal advice. Review it against actual data practices and applicable Indian privacy requirements, and add the operator’s identity and privacy contact details before launch.'
    }
  }
]

async function ensureLegalPages() {
  for (const page of requiredLegalPages) {
    await prisma.cmsPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: { ...page, isPublished: true }
    })
  }
}

router.get('/public', async (req, res, next) => {
  try {
    await ensureLegalPages()
    const pages = await prisma.cmsPage.findMany({ where: { isPublished: true }, orderBy: { sortOrder: 'asc' }, select: { slug: true, title: true, navLabel: true, footerLabel: true, content: true, sortOrder: true } })
    res.json({ pages })
  } catch (error) { next(error) }
})

router.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    await ensureLegalPages()
    res.json({ pages: await prisma.cmsPage.findMany({ orderBy: { sortOrder: 'asc' } }) })
  } catch (error) { next(error) }
})

router.put('/admin/:slug', requireAdmin, async (req, res, next) => {
  try {
    const { title, navLabel, footerLabel, content, isPublished, sortOrder } = req.body || {}
    if (![title, navLabel, footerLabel].every(value => typeof value === 'string' && value.trim()) || !content || typeof content !== 'object' || Array.isArray(content)) {
      return res.status(400).json({ message: 'Page title, menu labels and valid page content are required.' })
    }
    const page = await prisma.cmsPage.update({
      where: { slug: req.params.slug },
      data: { title: title.trim(), navLabel: navLabel.trim(), footerLabel: footerLabel.trim(), content, ...(typeof isPublished === 'boolean' ? { isPublished } : {}), ...(Number.isInteger(sortOrder) ? { sortOrder } : {}) }
    })
    res.json({ page, message: 'CMS page saved successfully.' })
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'CMS page not found.' })
    next(error)
  }
})

export default router
