/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DESIGN PREVIEW ONLY — a redesigned, phone-screenshot-friendly "card style"
 * for the meal section of the client plan PDF. Standalone so it never touches
 * the live ClientPlanDocument until Jess approves the look.
 *
 *   npx tsx scripts/preview-meal-redesign.tsx
 *
 * Renders scripts/_samples/meal-redesign-preview.pdf
 */
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer'
import { createElement } from 'react'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import type { Meal, MealItem, MacroTargets } from '../types'
import { normalizeMealItems } from '../lib/meal'
import { itemHasMacros, itemMacros, mealMacros, formatItemDisplay } from '../lib/meal-macros'

// ── Brand palette (matches ClientPlanDocument) ──
const C = {
  BLACK: '#080808', OFF_BLACK: '#141414', DARK_GREY: '#262626',
  MID_GREY: '#888888', LIGHT_GREY: '#c8c8c8', RULE_LIGHT: '#dedad4',
  WARM_WHITE: '#f0ece4', CREAM: '#e8e0d4', LINEN: '#f5f2ed',
  ROW_A: '#faf8f5', ROW_B: '#f2efe9', ACCENT: '#3a3530', TEXT_DARK: '#333333', TEXT_MID: '#444444',
  ACCENT_GOLD: '#a9793f', // warm tan used on the dashboard for meal times & alternative labels
}

const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff', color: C.OFF_BLACK, fontFamily: 'Helvetica',
    paddingTop: 170, paddingBottom: 56, paddingHorizontal: 50, fontSize: 9,
  },
  headerBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 154, backgroundColor: C.BLACK, paddingHorizontal: 50, paddingTop: 26 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoMain: { fontFamily: 'Times-Italic', fontSize: 26, color: C.WARM_WHITE },
  logoDot: { fontSize: 22, color: C.LIGHT_GREY, marginHorizontal: 4 },
  logoJess: { fontFamily: 'Times-Italic', fontSize: 28, color: C.WARM_WHITE },
  tagline: { fontSize: 7, color: '#666666', marginTop: 6, letterSpacing: 2.5 },
  taglineRule: { borderBottomWidth: 0.4, borderBottomColor: C.ACCENT, width: 220, marginTop: 3 },
  rdBadge: { position: 'absolute', right: 50, top: 24, width: 168, height: 90, borderRadius: 3, backgroundColor: C.DARK_GREY, borderWidth: 0.4, borderColor: C.ACCENT, paddingTop: 8, alignItems: 'center' },
  rdTitle: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.LIGHT_GREY, marginBottom: 6, letterSpacing: 1 },
  rdLine: { fontSize: 6.8, color: '#aaaaaa', textAlign: 'center', marginBottom: 2 },
  rdPin: { fontFamily: 'Helvetica-Oblique', fontSize: 6, color: '#666666', marginTop: 4, textAlign: 'center' },
  footerBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, backgroundColor: C.OFF_BLACK, paddingHorizontal: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerL: { fontSize: 6, color: C.MID_GREY },
  footerR: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.LIGHT_GREY },

  eyebrow: { fontSize: 7, color: C.MID_GREY, letterSpacing: 1.2, marginBottom: 2 },
  sectionTitle: { fontFamily: 'Times-Italic', fontSize: 18, color: C.BLACK, marginBottom: 6 },
  sectionRule: { borderBottomWidth: 0.5, borderBottomColor: C.RULE_LIGHT, marginBottom: 12 },
  intro: { fontFamily: 'Helvetica-Oblique', fontSize: 9, color: C.MID_GREY, lineHeight: 1.5, marginBottom: 14 },

  // ── Meal group label (Breakfast / Lunch / Dinner) ──
  groupLabel: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.MID_GREY, letterSpacing: 1.5, marginBottom: 6, marginTop: 4 },

  // ── Meal card ──
  card: { borderWidth: 0.6, borderColor: C.RULE_LIGHT, borderRadius: 6, marginBottom: 12, backgroundColor: '#ffffff', overflow: 'hidden' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.LINEN, paddingVertical: 9, paddingHorizontal: 14, borderBottomWidth: 0.6, borderBottomColor: C.RULE_LIGHT },
  cardTitle: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: C.BLACK, letterSpacing: 0.2 },
  cardTime: { fontSize: 9, color: C.MID_GREY, fontFamily: 'Helvetica-Oblique' },

  // Macro pills row
  pillRow: { flexDirection: 'row', gap: 5, paddingHorizontal: 14, paddingTop: 10, flexWrap: 'wrap' },
  pill: { backgroundColor: C.ROW_B, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'baseline' },
  pillKcal: { backgroundColor: C.BLACK, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'baseline' },
  pillVal: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.BLACK },
  pillValLight: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.WARM_WHITE },
  pillLbl: { fontSize: 7, color: C.MID_GREY, marginLeft: 3 },
  pillLblLight: { fontSize: 7, color: C.LIGHT_GREY, marginLeft: 3 },

  // Item rows
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 6, paddingHorizontal: 14, borderTopWidth: 0.4, borderTopColor: '#efece6' },
  itemRowFirst: { borderTopWidth: 0, marginTop: 4 },
  itemFood: { fontSize: 11, color: C.OFF_BLACK, flex: 1, lineHeight: 1.35, paddingRight: 8 },
  itemMeta: { fontSize: 8.5, color: C.MID_GREY, textAlign: 'right', fontFamily: 'Helvetica' },

  // Prep note
  prepWrap: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.ROW_A, borderTopWidth: 0.4, borderTopColor: '#efece6' },
  prepLbl: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.MID_GREY, letterSpacing: 1, marginBottom: 2 },
  prepBody: { fontFamily: 'Helvetica-Oblique', fontSize: 9, color: C.TEXT_MID, lineHeight: 1.5 },

  // Alternatives block (mirrors the dashboard's "Alternative options · same macros")
  altSection: { paddingHorizontal: 14, paddingTop: 9, paddingBottom: 4, borderTopWidth: 0.6, borderTopColor: C.RULE_LIGHT, backgroundColor: '#fbfaf7' },
  altSectionLbl: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.MID_GREY, letterSpacing: 1, marginBottom: 6 },
  altWrap: { borderLeftWidth: 2, borderLeftColor: C.ACCENT_GOLD, paddingLeft: 8, marginBottom: 8 },
  altHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
  altLbl: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.ACCENT_GOLD, letterSpacing: 0.3 },
  altMeta: { fontSize: 7.5, color: C.MID_GREY },
  altItem: { fontSize: 9.5, color: C.TEXT_MID, lineHeight: 1.45, marginBottom: 1 },
  altPrep: { fontFamily: 'Helvetica-Oblique', fontSize: 8.5, color: C.MID_GREY, lineHeight: 1.45, marginTop: 2 },

  // Snacks
  snackTitle: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.MID_GREY, letterSpacing: 1.5, marginTop: 6, marginBottom: 6 },
  snackRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  snackCard: { borderWidth: 0.6, borderColor: C.RULE_LIGHT, borderRadius: 5, paddingVertical: 8, paddingHorizontal: 10, width: '31%', marginBottom: 6, backgroundColor: C.ROW_A },
  snackName: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.BLACK, marginBottom: 2 },
  snackDet: { fontSize: 8, color: C.MID_GREY, lineHeight: 1.4 },
})

function HeaderBar() {
  return createElement(View, { fixed: true, style: s.headerBar },
    createElement(View, { style: s.logoRow },
      createElement(Text, { style: s.logoMain }, 'hercoach'),
      createElement(Text, { style: s.logoDot }, '·'),
      createElement(Text, { style: s.logoJess }, 'Jess'),
    ),
    createElement(Text, { style: s.tagline }, 'L E S S   R E S T R I C T I O N .   M O R E   Y O U .'),
    createElement(View, { style: s.taglineRule }),
    createElement(View, { style: s.rdBadge },
      createElement(Text, { style: s.rdTitle }, 'REGISTERED DIETITIAN'),
      createElement(Text, { style: s.rdLine }, 'HCPC Registered  ·  BDA Member'),
      createElement(Text, { style: s.rdLine }, 'England & Wales'),
      createElement(Text, { style: s.rdPin }, 'PIN available on request'),
    ),
  )
}

function FooterBar() {
  return createElement(View, { fixed: true, style: s.footerBar },
    createElement(Text, { style: s.footerL }, 'hercoach Jess  ·  Registered Dietitian  ·  Personalised & confidential, not for redistribution'),
    createElement(Text, { style: s.footerR, render: ({ pageNumber }: any) => `Page ${pageNumber}` }),
  )
}

function MacroPills({ meal }: { meal: Meal }) {
  const items = normalizeMealItems(meal.items)
  if (!items.some(itemHasMacros)) return null
  const m = mealMacros({ ...meal, items })
  return (
    <View style={s.pillRow}>
      <View style={s.pillKcal}><Text style={s.pillValLight}>{Math.round(m.kcal)}</Text><Text style={s.pillLblLight}>kcal</Text></View>
      <View style={s.pill}><Text style={s.pillVal}>{Math.round(m.protein_g)}g</Text><Text style={s.pillLbl}>protein</Text></View>
      <View style={s.pill}><Text style={s.pillVal}>{Math.round(m.fat_g)}g</Text><Text style={s.pillLbl}>fat</Text></View>
      <View style={s.pill}><Text style={s.pillVal}>{Math.round(m.carbs_g)}g</Text><Text style={s.pillLbl}>carbs</Text></View>
    </View>
  )
}

function MealCard({ meal, showMacros }: { meal: Meal; showMacros: boolean }) {
  const items = normalizeMealItems(meal.items)
  return (
    <View style={s.card} wrap={false}>
      <View style={s.cardHead}>
        <Text style={s.cardTitle}>{meal.name}</Text>
        {meal.time ? <Text style={s.cardTime}>{meal.time}</Text> : null}
      </View>
      {showMacros && <MacroPills meal={meal} />}
      <View style={{ paddingBottom: 4 }}>
        {items.map((item, i) => {
          const meta = showMacros && itemHasMacros(item)
            ? `${Math.round(itemMacros(item).kcal)} kcal`
            : (item.brand || '')
          return (
            <View key={i} style={[s.itemRow, i === 0 ? s.itemRowFirst : {}]}>
              <Text style={s.itemFood}>{formatItemDisplay(item)}</Text>
              {meta ? <Text style={s.itemMeta}>{meta}</Text> : null}
            </View>
          )
        })}
      </View>
      {meal.prep_notes && meal.prep_notes.trim() && (
        <View style={s.prepWrap}>
          <Text style={s.prepLbl}>PREP</Text>
          <Text style={s.prepBody}>{meal.prep_notes.trim()}</Text>
        </View>
      )}
      {(meal.alternatives ?? []).length > 0 && (
        <View style={s.altSection}>
          <Text style={s.altSectionLbl}>ALTERNATIVE OPTIONS · SAME MACROS</Text>
          {(meal.alternatives ?? []).map((alt, i) => {
            const altItems = normalizeMealItems(alt.items)
            const altHasMacros = altItems.some(itemHasMacros)
            return (
              <View key={i} style={s.altWrap}>
                <View style={s.altHeadRow}>
                  <Text style={s.altLbl}>{alt.label || 'Alternative'}</Text>
                  {showMacros && altHasMacros ? (
                    <Text style={s.altMeta}>{`${Math.round(mealMacros({ name: '', time: '', items: altItems }).kcal)} kcal`}</Text>
                  ) : null}
                </View>
                {altItems.map((it, j) => (
                  <Text key={j} style={s.altItem}>{formatItemDisplay(it)}{it.brand ? `  ·  ${it.brand}` : ''}</Text>
                ))}
                {alt.prep_notes && alt.prep_notes.trim() ? <Text style={s.altPrep}>{alt.prep_notes.trim()}</Text> : null}
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

// ── Sample data ──
const targets: MacroTargets = { kcal: 1800, protein_g: 130, fat_g: 60, carbs_g: 190 }
const mk = (food: string, quantity: number, unit: MealItem['unit'], kcal: number, p: number, f: number, c: number, brand?: string): MealItem =>
  ({ food, quantity, unit, kcal, protein_g: p, fat_g: f, carbs_g: c, brand })

const meals: Meal[] = [
  {
    name: 'Breakfast', time: '8am',
    items: [mk('Porridge oats', 50, 'g', 190, 7, 4, 32, 'Quaker'), mk('Semi-skimmed milk', 200, 'ml', 100, 7, 3, 10), mk('Blueberries', 80, 'g', 45, 1, 0, 10), mk('Whey protein', 1, 'scoop', 105, 21, 2, 2, 'MyProtein')],
    prep_notes: 'Make it as overnight oats the night before so it is grab-and-go straight after the gym.',
    alternatives: [
      { label: 'Greek yoghurt bowl', items: [mk('Fage 0% yoghurt', 200, 'g', 110, 20, 0, 8), mk('Granola', 30, 'g', 130, 3, 5, 18), mk('Blueberries', 80, 'g', 45, 1, 0, 10)], prep_notes: 'No cooking — layer and go.' },
    ],
  },
  {
    name: 'Lunch', time: '1pm',
    items: [mk('Chicken breast', 150, 'g', 245, 46, 5, 0), mk('Cooked basmati rice', 180, 'g', 235, 5, 1, 52), mk('Mixed salad + olive oil', 1, 'item', 120, 2, 11, 4)],
    alternatives: [
      { label: 'Veggie swap', items: [mk('Firm tofu', 150, 'g', 180, 20, 10, 3), mk('Cooked basmati rice', 180, 'g', 235, 5, 1, 52), mk('Mixed salad + olive oil', 1, 'item', 120, 2, 11, 4)] },
      { label: 'Higher-carb training day', items: [mk('Chicken breast', 150, 'g', 245, 46, 5, 0), mk('Cooked basmati rice', 250, 'g', 325, 7, 1, 72), mk('Sweetcorn', 80, 'g', 65, 2, 1, 13)] },
    ],
  },
  {
    name: 'Dinner', time: '7pm',
    items: [mk('Lean beef mince, 5%', 150, 'g', 220, 32, 8, 0), mk('Wholewheat pasta', 70, 'g', 245, 10, 2, 50), mk('Tomato & veg sauce', 1, 'item', 90, 3, 3, 12)],
    alternatives: [
      { label: 'Salmon swap', items: [mk('Salmon fillet', 130, 'g', 270, 25, 18, 0), mk('New potatoes', 200, 'g', 150, 4, 0, 33), mk('Green veg', 1, 'item', 45, 3, 1, 6)] },
    ],
  },
]

const snacks: [string, string][] = [
  ['Fruit', '1 piece · ~70 kcal'],
  ['Protein yoghurt', '150g Fage · ~130 kcal'],
  ['Rice cakes', '2 Kallo · ~70 kcal'],
  ['Popcorn', '20g bag · ~90 kcal'],
  ['Dark chocolate', '10g (85%+) · ~60 kcal'],
]

function Doc() {
  const showMacros = true
  return createElement(Document, { title: 'Meal PDF redesign preview' },
    createElement(Page, { size: 'A4', style: s.page },
      createElement(HeaderBar, null),
      createElement(FooterBar, null),
      createElement(View, null,
        createElement(Text, { style: s.eyebrow }, 'SECTION 01'),
        createElement(Text, { style: s.sectionTitle }, 'Your Nutrition Plan'),
        createElement(View, { style: s.sectionRule }),
      ),
      createElement(View, { style: { flexDirection: 'row', gap: 6, marginBottom: 14 } },
        createElement(View, { style: [s.pillKcal, { paddingVertical: 6, paddingHorizontal: 12 }] }, createElement(Text, { style: s.pillValLight }, `~${targets.kcal}`), createElement(Text, { style: s.pillLblLight }, 'kcal/day')),
        createElement(View, { style: [s.pill, { paddingVertical: 6, paddingHorizontal: 12 }] }, createElement(Text, { style: s.pillVal }, `${targets.protein_g}g`), createElement(Text, { style: s.pillLbl }, 'protein/day')),
        createElement(View, { style: [s.pill, { paddingVertical: 6, paddingHorizontal: 12 }] }, createElement(Text, { style: s.pillVal }, '10,000'), createElement(Text, { style: s.pillLbl }, 'steps/day')),
      ),
      createElement(Text, { style: s.intro }, 'Choose one option per meal each day and rotate through the week. All foods are UK supermarket staples. Portions are a guide — follow them and the balance is taken care of for you.'),

      createElement(Text, { style: s.groupLabel }, 'BREAKFAST'),
      createElement(MealCard as any, { meal: meals[0], showMacros }),
      createElement(Text, { style: s.groupLabel }, 'LUNCH'),
      createElement(MealCard as any, { meal: meals[1], showMacros }),

      createElement(Text, { style: s.snackTitle }, 'SNACKS — CHOOSE ONE PER DAY'),
      createElement(View, { style: s.snackRow },
        ...snacks.map(([n, d], i) => createElement(View, { key: i, style: s.snackCard },
          createElement(Text, { style: s.snackName }, n),
          createElement(Text, { style: s.snackDet }, d),
        )),
      ),

      createElement(Text, { style: [s.groupLabel, { marginTop: 8 }] }, 'DINNER'),
      createElement(MealCard as any, { meal: meals[2], showMacros }),
    ),
  )
}

const outDir = `${__dirname}/_samples`
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
renderToBuffer(Doc()).then((buf) => {
  const path = `${outDir}/meal-redesign-preview.pdf`
  writeFileSync(path, buf)
  console.log(`✅ ${path} (${(buf.length / 1024).toFixed(0)} KB)`)
}).catch((e) => { console.error(e); process.exit(1) })
