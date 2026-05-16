# Prompts

Where prompts are defined and how user input becomes model input.

## Summary

| Feature | Location | User/API input |
| ------- | -------- | -------------- |
| Strategy | `src/services/prompts/strategyPrompt.ts` | `goal`, `eventDate`, `audience`, `durationDays` |
| Flyer | `src/services/gemini/imageService.ts` → `buildFlyerPrompt()` | `prompt`, `headline`, `subtext` |
| Campaign flyer | `src/routes/campaign.ts` → `flyerPromptFor()` | From strategy posts |
| Campaign voice | `src/routes/campaign.ts` → `voiceoverScriptFor()` | From strategy posts |
| Voice-over | _(none)_ | `script` sent directly to ElevenLabs |

---

## Strategy

### System (`STRATEGY_SYSTEM_INSTRUCTION`)

- JSON-only output matching schema
- Post ordering, dates, hashtags without `#`
- Mix platforms; flyer/voice hints on key posts
- `event` object when user mentions an event
- Tone: confident, conversion-focused

### User (`buildStrategyUserPrompt`)

Includes goal, duration (default 14 days), optional event date/audience, today’s date as day-1 anchor, and instructions for 6–14 posts with at least one flyer prompt and one reel script.

---

## Flyer (`buildFlyerPrompt`)

Fixed art-direction + `Subject: {prompt}` + optional exact headline/subtext overlay instructions.

---

## Campaign helpers

**`flyerPromptFor`:** `suggestedFlyerPrompt` or headline/body fallback; headline from event title; subtext from CTA or body snippet.

**`voiceoverScriptFor`:** `suggestedVoiceoverScript` or `headline + body + cta`.

---

## Maintenance

When editing strategy rules, keep `strategyService.ts` `RESPONSE_SCHEMA` aligned with `src/schemas/campaign.ts`.
