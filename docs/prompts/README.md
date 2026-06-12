# prompts/

Reusable AI prompts Jess has refined externally (Claude chat / ChatGPT)
that she wants to keep alongside the codebase.

Drop them here as plain markdown files — one prompt per file is easiest.
Filename should describe what it's for, e.g. `meal-plan-voice.md`,
`client-onboarding-welcome.md`.

If a prompt belongs in the app (e.g. a refined version of the
check-in reply prompt), tell Claude and it'll wire it into the
relevant `/api/ai/*` route in `app/api/ai/` so it actually runs.
