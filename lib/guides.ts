// Digital guides / PDFs Jess sells separately from coaching.
//
// This is the single source of truth for BOTH the public homepage pricing
// section AND the "buy a guide" enquiry form dropdown. To sell another PDF,
// add an object here — it shows up in both places automatically.
//
// `buyUrl`: leave '' and the homepage button becomes "Enquire to buy" (routes
// to the guide enquiry form). Set it to a Stripe Payment Link / Gumroad / etc.
// and the homepage button becomes a direct "Buy" checkout instead.
export interface Guide {
  name: string
  price: string
  blurb: string
  buyUrl: string
}

export const GUIDES: Guide[] = [
  {
    name: 'Supermarket & label-reading guide',
    price: '£20',
    blurb: 'Shop smarter — exactly what to look for on labels, aisle by aisle.',
    buyUrl: '',
  },
]

export const GUIDE_NAMES = GUIDES.map((g) => g.name)
