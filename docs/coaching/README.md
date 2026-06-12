# coaching/

Clinical reference + coaching IP Jess wants the AI to draw on.

Already in code:
- Macro split logic in `lib/utils.ts` (`macrosForKcal`, `macroGuidance`)
- BMR + TDEE calc in `lib/utils.ts` (`estimateTargets`)
- Coach style settings (voice / always-do / never-do) on the AI Style
  page — these feed into every AI prompt via `getCoachStyleBlock()`

Drop here:
- Citations / source documents (BDA, NICE, ISSN, EFSA references)
- Protocols Jess uses (e.g. training periodisation principles, food
  swap matrices, deficit cap rules)
- Scope-of-practice boundaries to remind future AI work
