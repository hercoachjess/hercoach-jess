import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

/*
 * hercoach · Jess — public one-page marketing / booking site.
 *
 * Editorial, fashion-forward, lots of whitespace. Brand spec:
 *   Bone #F6F1EA · Ink #211C1A · Rosewood #B67F70 · Blush #E7D3CB
 *   Line #D8CCC0 · Muted #8A7E74 · Amber dot #C08A4A
 *   Cormorant Garamond headings (italic accent words) · Jost body
 *   Montserrat uppercase labels
 *
 * The enquiry form itself lives at /enquire (its own polished route). Every
 * "book a free discovery call" CTA points there. The coach dashboard is
 * unaffected and stays behind auth at /dashboard.
 */

// ── Brand + contact, one place to edit ───────────────────────────────────
const BRAND = {
  email: 'hercoachjess@gmail.com',
  instagram: '@hercoach.jess',
  instagramUrl: 'https://instagram.com/hercoach.jess',
  tiktok: '@hercoach.jess',
  tiktokUrl: 'https://tiktok.com/@hercoach.jess',
  based: 'East Yorkshire, UK · Online across the UK',
} as const

const C = {
  bone: '#F6F1EA',
  ink: '#211C1A',
  rosewood: '#B67F70',
  blush: '#E7D3CB',
  line: '#D8CCC0',
  muted: '#8A7E74',
  amber: '#C08A4A',
} as const

// ── Pricing — the single source of truth. Change numbers here only. ───────
// (Raising later? Media-kit note: Nutrition £120 / Training £170 / Premium
//  £250, one-off consult £150 once there's a testimonial. Two-minute edit.)
const COACHING = {
  discovery: {
    name: 'Discovery call',
    price: 'Free',
    detail: '20 minutes · no obligation',
  },
  monthly: {
    label: 'Monthly coaching',
    note: '3-month minimum',
    tiers: [
      {
        name: 'Nutrition Coaching',
        price: '£125',
        cadence: '/mo',
        blurb: 'Custom nutrition plan, regular check-ins & message support.',
        popular: false,
      },
      {
        name: 'Nutrition + Training',
        price: '£150',
        cadence: '/mo',
        blurb: 'Nutrition & training plans together, weekly check-ins & WhatsApp support.',
        popular: true,
      },
    ],
  },
} as const

// Digital guides / PDFs sold separately from coaching. To sell another one,
// add an object here. Set `buyUrl` to a Stripe Payment Link / Gumroad / PayPal
// link to make it a direct "Buy" button; leave it '' and it becomes an
// "Enquire to buy" link to the enquiry form.
const GUIDES = [
  {
    name: 'Supermarket & label-reading guide',
    price: '£20',
    blurb: 'Shop smarter — exactly what to look for on labels, aisle by aisle.',
    buyUrl: '',
  },
] as const

export const metadata: Metadata = {
  title: 'hercoach · Jess — Registered Dietitian & Online Coach for Women',
  description:
    'Evidence-based nutrition & training for women, coached online by Jess — an MSc-qualified, HCPC-registered dietitian. Less restriction, more you. Book a free discovery call.',
}

export default function HomePage() {
  return (
    <div
      style={{ backgroundColor: C.bone, color: C.ink, fontFamily: 'var(--font-jost), sans-serif' }}
      className="min-h-screen w-full overflow-x-hidden"
    >
      <Nav />
      <Hero />
      <CredStrip />
      <About />
      <Pillars />
      <Lifestyle />
      <Coaching />
      <BookCta />
      <Footer />
    </div>
  )
}

// ── Shared bits ───────────────────────────────────────────────────────────
function Eyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="block text-[10px] font-medium uppercase"
      style={{
        fontFamily: 'var(--font-montserrat), sans-serif',
        letterSpacing: '0.24em',
        color: color ?? C.muted,
      }}
    >
      {children}
    </span>
  )
}

function Wordmark({ onDark = false, className = '' }: { onDark?: boolean; className?: string }) {
  const text = onDark ? C.bone : C.ink
  return (
    <span
      className={`font-serif ${className}`}
      style={{ fontFamily: 'var(--font-cormorant), serif', color: text, letterSpacing: '0.01em' }}
    >
      hercoach{' '}
      <span style={{ color: C.amber }}>·</span> Jess
    </span>
  )
}

function Cta({
  href,
  children,
  variant = 'solid',
}: {
  href: string
  children: React.ReactNode
  variant?: 'solid' | 'outline'
}) {
  const base =
    'inline-block text-[11px] font-medium uppercase px-9 py-4 rounded-[2px] transition-all'
  const style =
    variant === 'solid'
      ? { backgroundColor: C.rosewood, color: C.bone, boxShadow: '0 2px 14px rgba(182,127,112,0.28)' }
      : { backgroundColor: 'transparent', color: C.ink, border: `1px solid ${C.line}` }
  return (
    <Link
      href={href}
      className={`${base} hover:opacity-90 hover:-translate-y-px`}
      style={{
        ...style,
        fontFamily: 'var(--font-montserrat), sans-serif',
        letterSpacing: '0.18em',
      }}
    >
      {children}
    </Link>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(246,241,234,0.82)', borderBottom: `1px solid ${C.line}` }}
    >
      <div className="max-w-[1180px] mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
        <Link href="/" aria-label="hercoach · Jess home">
          <Wordmark className="text-[22px]" />
        </Link>
        <nav className="hidden md:flex items-center gap-9">
          {[
            ['About', '#about'],
            ['Coaching', '#coaching'],
            ['Contact', '#contact'],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-[11px] uppercase transition-colors hover:opacity-70"
              style={{
                fontFamily: 'var(--font-montserrat), sans-serif',
                letterSpacing: '0.2em',
                color: C.muted,
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        <Link
          href="/enquire"
          className="text-[10px] font-medium uppercase px-5 py-2.5 rounded-[2px] transition-all hover:opacity-90"
          style={{
            backgroundColor: C.ink,
            color: C.bone,
            fontFamily: 'var(--font-montserrat), sans-serif',
            letterSpacing: '0.16em',
          }}
        >
          Book a call
        </Link>
      </div>
    </header>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="max-w-[1180px] mx-auto px-6 sm:px-10 pt-16 pb-20 md:pt-24 md:pb-28">
      <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <div>
          <Eyebrow color={C.rosewood}>MSc · Registered Dietitian · Online Coach</Eyebrow>
          <h1
            className="font-serif font-light mt-6 leading-[1.04] tracking-[-0.5px] text-[clamp(44px,7vw,76px)]"
            style={{ fontFamily: 'var(--font-cormorant), serif' }}
          >
            Less restriction,
            <br />
            <em className="italic" style={{ color: C.rosewood }}>
              more you.
            </em>
          </h1>
          <p
            className="mt-7 text-[15px] md:text-base leading-[1.9] font-light max-w-[440px]"
            style={{ color: '#4A4038' }}
          >
            Evidence-based nutrition &amp; training for women who want balance — coached
            one-to-one by a dietitian you can actually trust. Personalised to real life, so
            the results last.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Cta href="/enquire">Book a free discovery call</Cta>
            <a
              href="#coaching"
              className="text-[11px] uppercase transition-opacity hover:opacity-60"
              style={{
                fontFamily: 'var(--font-montserrat), sans-serif',
                letterSpacing: '0.2em',
                color: C.muted,
              }}
            >
              View coaching →
            </a>
          </div>
        </div>

        <div className="relative">
          <div
            className="relative aspect-[4/5] md:aspect-[5/6] w-full overflow-hidden rounded-[3px]"
            style={{ boxShadow: '0 30px 60px -30px rgba(33,28,26,0.4)' }}
          >
            <Image
              src="/hero.jpg"
              alt="Jess, registered dietitian and online coach"
              fill
              preload
              sizes="(max-width: 768px) 100vw, 45vw"
              className="object-cover object-top"
            />
          </div>
          <div
            className="absolute -bottom-5 -left-5 hidden sm:block px-6 py-4 rounded-[2px]"
            style={{ backgroundColor: C.ink }}
          >
            <Eyebrow color="rgba(246,241,234,0.55)">Regulated · Insured</Eyebrow>
            <span
              className="block font-serif italic text-[19px] mt-1"
              style={{ fontFamily: 'var(--font-cormorant), serif', color: C.blush }}
            >
              HCPC registered
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Credential strip ──────────────────────────────────────────────────────
function CredStrip() {
  const items = ['MSc Qualified', 'HCPC Registered', 'BDA Member', 'NHS Clinical Background']
  return (
    <section style={{ borderBlock: `1px solid ${C.line}` }}>
      <div className="max-w-[1180px] mx-auto px-6 sm:px-10 py-6 flex flex-wrap justify-center gap-x-10 gap-y-3">
        {items.map((t) => (
          <span
            key={t}
            className="text-[10px] uppercase"
            style={{
              fontFamily: 'var(--font-montserrat), sans-serif',
              letterSpacing: '0.22em',
              color: C.muted,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </section>
  )
}

// ── About ─────────────────────────────────────────────────────────────────
function About() {
  return (
    <section id="about" className="scroll-mt-20 max-w-[1180px] mx-auto px-6 sm:px-10 py-20 md:py-28">
      <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
        <div className="relative order-2 md:order-1">
          <div
            className="relative aspect-[3/4] w-full max-w-[420px] mx-auto overflow-hidden rounded-[3px]"
            style={{ boxShadow: '0 30px 60px -30px rgba(33,28,26,0.4)' }}
          >
            <Image
              src="/portrait.jpg"
              alt="Jess"
              fill
              sizes="(max-width: 768px) 100vw, 42vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="order-1 md:order-2">
          <Eyebrow color={C.rosewood}>About</Eyebrow>
          <h2
            className="font-serif font-light mt-5 leading-[1.1] tracking-[-0.5px] text-[clamp(32px,4.5vw,50px)]"
            style={{ fontFamily: 'var(--font-cormorant), serif' }}
          >
            Hi, I&apos;m Jess — a registered dietitian you can{' '}
            <em className="italic" style={{ color: C.rosewood }}>
              actually trust.
            </em>
          </h2>
          <div className="mt-7 space-y-5 text-[15px] leading-[1.9] font-light" style={{ color: '#4A4038' }}>
            <p>
              Anyone can call themselves a nutritionist. <strong className="font-medium">Dietitian</strong>{' '}
              is a legally protected, HCPC-registered title — so when I make a claim, it&apos;s backed by an
              MSc and clinical training, not a trend.
            </p>
            <p>
              I&apos;m a registered dietitian and online coach helping women eat well and train smart. My whole
              philosophy is <em className="italic">less restriction, more you</em> — personalised nutrition and
              training that fits real life. My background spans NHS clinical dietetics and one-to-one online
              coaching.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Pillars ───────────────────────────────────────────────────────────────
function Pillars() {
  const pillars = [
    {
      title: 'Qualified',
      body: 'MSc-qualified, HCPC-registered dietitian & BDA member. Regulated, insured, accountable.',
    },
    {
      title: 'Credible',
      body: 'Evidence-first coaching that stands up to scrutiny — no fads, no guesswork.',
    },
    {
      title: 'Relatable',
      body: 'Clinical knowledge translated into warm, real-world plans that fit your life.',
    },
  ]
  return (
    <section style={{ backgroundColor: '#EFE7DC' }}>
      <div className="max-w-[1180px] mx-auto px-6 sm:px-10 py-16 md:py-20 grid md:grid-cols-3 gap-10 md:gap-14">
        {pillars.map((p, i) => (
          <div key={p.title}>
            <span
              className="font-serif italic text-[22px]"
              style={{ fontFamily: 'var(--font-cormorant), serif', color: C.amber }}
            >
              0{i + 1}
            </span>
            <h3
              className="font-serif text-[26px] font-light mt-2 mb-3"
              style={{ fontFamily: 'var(--font-cormorant), serif' }}
            >
              {p.title}
            </h3>
            <p className="text-[14px] leading-[1.8] font-light" style={{ color: '#4A4038' }}>
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Full-bleed lifestyle ──────────────────────────────────────────────────
function Lifestyle() {
  return (
    <section className="relative w-full h-[70vh] min-h-[440px] overflow-hidden flex items-center justify-center">
      <Image
        src="/lifestyle.jpg"
        alt="Balance and lifestyle"
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(33,28,26,0.42)' }} />
      <div className="relative z-10 text-center px-6">
        <Wordmark onDark className="text-[26px]" />
        <p
          className="font-serif italic font-light mt-6 leading-[1.2] text-[clamp(28px,5vw,46px)] max-w-[720px] mx-auto"
          style={{ fontFamily: 'var(--font-cormorant), serif', color: C.bone }}
        >
          Coaching that fits your life — not the other way around.
        </p>
      </div>
    </section>
  )
}

// ── Coaching / pricing ────────────────────────────────────────────────────
function Coaching() {
  return (
    <section id="coaching" className="scroll-mt-20 max-w-[1180px] mx-auto px-6 sm:px-10 py-20 md:py-28">
      <div className="text-center max-w-[560px] mx-auto">
        <Eyebrow color={C.rosewood}>Coaching</Eyebrow>
        <h2
          className="font-serif font-light mt-5 leading-[1.1] tracking-[-0.5px] text-[clamp(32px,4.5vw,52px)]"
          style={{ fontFamily: 'var(--font-cormorant), serif' }}
        >
          Online coaching with a{' '}
          <em className="italic" style={{ color: C.rosewood }}>
            dietitian.
          </em>
        </h2>
        <p className="mt-5 text-[15px] leading-[1.9] font-light" style={{ color: '#4A4038' }}>
          Every client starts with a free discovery call to make sure it&apos;s the right fit.
        </p>
      </div>

      {/* Monthly tiers */}
      <div className="mt-14 flex items-baseline justify-between border-b pb-4" style={{ borderColor: C.line }}>
        <span className="font-serif text-[22px] font-light" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
          {COACHING.monthly.label}
        </span>
        <Eyebrow>{COACHING.monthly.note}</Eyebrow>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-6 max-w-[820px] mx-auto">
        {COACHING.monthly.tiers.map((tier) => (
          <div
            key={tier.name}
            className="relative flex flex-col p-8 rounded-[3px]"
            style={{
              backgroundColor: tier.popular ? C.ink : 'transparent',
              border: `1px solid ${tier.popular ? C.ink : C.line}`,
              color: tier.popular ? C.bone : C.ink,
            }}
          >
            {tier.popular && (
              <span
                className="absolute -top-3 left-8 text-[9px] font-medium uppercase px-3 py-1 rounded-[2px]"
                style={{
                  backgroundColor: C.amber,
                  color: C.ink,
                  fontFamily: 'var(--font-montserrat), sans-serif',
                  letterSpacing: '0.18em',
                }}
              >
                Most popular
              </span>
            )}
            <h3
              className="font-serif text-[25px] font-light"
              style={{ fontFamily: 'var(--font-cormorant), serif' }}
            >
              {tier.name}
            </h3>
            <div className="mt-3 mb-5 flex items-baseline gap-1">
              <span
                className="font-serif text-[42px] font-light"
                style={{ fontFamily: 'var(--font-cormorant), serif' }}
              >
                {tier.price}
              </span>
              <span
                className="text-[12px] uppercase"
                style={{
                  fontFamily: 'var(--font-montserrat), sans-serif',
                  letterSpacing: '0.14em',
                  color: tier.popular ? C.blush : C.muted,
                }}
              >
                {tier.cadence}
              </span>
            </div>
            <p
              className="text-[13.5px] leading-[1.75] font-light flex-1"
              style={{ color: tier.popular ? 'rgba(246,241,234,0.78)' : '#4A4038' }}
            >
              {tier.blurb}
            </p>
            <Link
              href="/enquire"
              className="mt-7 text-center text-[10px] font-medium uppercase py-3 rounded-[2px] transition-all hover:opacity-90"
              style={{
                backgroundColor: tier.popular ? C.bone : 'transparent',
                color: tier.popular ? C.ink : C.ink,
                border: tier.popular ? 'none' : `1px solid ${C.line}`,
                fontFamily: 'var(--font-montserrat), sans-serif',
                letterSpacing: '0.18em',
              }}
            >
              Enquire
            </Link>
          </div>
        ))}
      </div>

      {/* Free discovery call */}
      <div className="mt-8 max-w-[820px] mx-auto">
        <ConsultRow
          name={COACHING.discovery.name}
          detail={COACHING.discovery.detail}
          price={COACHING.discovery.price}
        />
      </div>

      {/* Guides & extras — digital PDFs sold separately */}
      <div className="mt-16 max-w-[820px] mx-auto">
        <div className="text-center mb-8">
          <Eyebrow color={C.rosewood}>Guides &amp; extras</Eyebrow>
          <h3
            className="font-serif font-light mt-3 text-[clamp(26px,3.5vw,38px)]"
            style={{ fontFamily: 'var(--font-cormorant), serif' }}
          >
            Not ready for coaching?{' '}
            <em className="italic" style={{ color: C.rosewood }}>
              Start here.
            </em>
          </h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {GUIDES.map((g) => (
            <div
              key={g.name}
              className="flex flex-col p-7 rounded-[3px]"
              style={{ backgroundColor: '#EFE7DC' }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="font-serif text-[21px] font-light" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
                  {g.name}
                </h4>
                <span
                  className="font-serif text-[26px] font-light shrink-0"
                  style={{ fontFamily: 'var(--font-cormorant), serif', color: C.rosewood }}
                >
                  {g.price}
                </span>
              </div>
              <p className="text-[13.5px] font-light leading-[1.7] mt-2 flex-1" style={{ color: '#4A4038' }}>
                {g.blurb}
              </p>
              <Link
                href={g.buyUrl || '/enquire'}
                target={g.buyUrl ? '_blank' : undefined}
                rel={g.buyUrl ? 'noopener noreferrer' : undefined}
                className="mt-6 text-center text-[10px] font-medium uppercase py-3 rounded-[2px] transition-all hover:opacity-90"
                style={{
                  backgroundColor: C.ink,
                  color: C.bone,
                  fontFamily: 'var(--font-montserrat), sans-serif',
                  letterSpacing: '0.18em',
                }}
              >
                {g.buyUrl ? `Buy · ${g.price}` : 'Enquire to buy'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ConsultRow({ name, detail, price }: { name: string; detail: string; price: string }) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-7 py-6 rounded-[3px]"
      style={{ backgroundColor: '#EFE7DC' }}
    >
      <div>
        <h4 className="font-serif text-[22px] font-light" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
          {name}
        </h4>
        <p className="text-[13px] font-light mt-1" style={{ color: C.muted }}>
          {detail}
        </p>
      </div>
      <span
        className="font-serif text-[30px] font-light shrink-0"
        style={{ fontFamily: 'var(--font-cormorant), serif', color: C.rosewood }}
      >
        {price}
      </span>
    </div>
  )
}

// ── Book CTA ──────────────────────────────────────────────────────────────
function BookCta() {
  return (
    <section id="contact" className="scroll-mt-20" style={{ backgroundColor: C.ink }}>
      <div className="max-w-[760px] mx-auto px-6 sm:px-10 py-20 md:py-24 text-center">
        <Eyebrow color="rgba(246,241,234,0.5)">Free · 20 minutes · No obligation</Eyebrow>
        <h2
          className="font-serif font-light mt-6 leading-[1.1] text-[clamp(34px,5vw,56px)]"
          style={{ fontFamily: 'var(--font-cormorant), serif', color: C.bone }}
        >
          Thinking about{' '}
          <em className="italic" style={{ color: C.blush }}>
            working together?
          </em>
        </h2>
        <p
          className="mt-6 text-[15px] leading-[1.9] font-light max-w-[460px] mx-auto"
          style={{ color: 'rgba(246,241,234,0.72)' }}
        >
          Tell me a little about you and where you&apos;d like to get to. I read every enquiry
          personally and reply as soon as I can.
        </p>
        <div className="mt-9">
          <Link
            href="/enquire"
            className="inline-block text-[11px] font-medium uppercase px-10 py-4 rounded-[2px] transition-all hover:opacity-90 hover:-translate-y-px"
            style={{
              backgroundColor: C.rosewood,
              color: C.bone,
              fontFamily: 'var(--font-montserrat), sans-serif',
              letterSpacing: '0.18em',
              boxShadow: '0 2px 16px rgba(182,127,112,0.35)',
            }}
          >
            Book a free discovery call
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ backgroundColor: '#1A1613' }}>
      <div className="max-w-[1180px] mx-auto px-6 sm:px-10 py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10">
          <div>
            <div className="relative w-[230px] h-[64px]">
              <Image src="/logo-cream.png" alt="hercoach · Jess" fill sizes="230px" className="object-contain object-left" />
            </div>
            <p
              className="mt-4 text-[11px] uppercase"
              style={{
                fontFamily: 'var(--font-montserrat), sans-serif',
                letterSpacing: '0.22em',
                color: 'rgba(246,241,234,0.4)',
              }}
            >
              {BRAND.based}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <FooterLink href={BRAND.instagramUrl} label="Instagram" value={BRAND.instagram} />
            <FooterLink href={BRAND.tiktokUrl} label="TikTok" value={BRAND.tiktok} />
            <FooterLink href={`mailto:${BRAND.email}`} label="Email" value={BRAND.email} />
          </div>
        </div>

        <div
          className="mt-12 pt-6 flex flex-col sm:flex-row justify-between gap-3"
          style={{ borderTop: '1px solid rgba(246,241,234,0.12)' }}
        >
          <span className="text-[11px] font-light" style={{ color: 'rgba(246,241,234,0.4)' }}>
            © {new Date().getFullYear()} hercoach · Jess · MSc, HCPC-registered dietitian
          </span>
          <span
            className="text-[11px] italic font-serif"
            style={{ fontFamily: 'var(--font-cormorant), serif', color: 'rgba(246,241,234,0.5)' }}
          >
            Less restriction, more you.
          </span>
        </div>
      </div>
    </footer>
  )
}

function FooterLink({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <a
      href={href}
      target={href.startsWith('mailto:') ? undefined : '_blank'}
      rel="noopener noreferrer"
      className="group flex items-center gap-3 md:justify-end transition-opacity hover:opacity-70"
    >
      <span
        className="text-[9px] uppercase"
        style={{
          fontFamily: 'var(--font-montserrat), sans-serif',
          letterSpacing: '0.2em',
          color: 'rgba(246,241,234,0.4)',
        }}
      >
        {label}
      </span>
      <span className="text-[15px] font-light" style={{ color: C.blush }}>
        {value}
      </span>
    </a>
  )
}
