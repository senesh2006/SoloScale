/**
 * Pixazo flyer model — FREE tier only ($0 per image on Pixazo pricing).
 *
 * Do NOT add env overrides or alternate endpoints here. Paid Pixazo models
 * (Flux Pro, Ideogram, Nano Banana, SDXL paid tier, etc.) must not be used
 * for flyers in this service.
 *
 * @see https://www.pixazo.ai/api/free
 * @see https://www.pixazo.ai/models/flux — Flux 1 Schnell pricing: $0
 */
export const PIXAZO_FLYER_MODEL = "flux-1-schnell" as const;

/** Only endpoint used for flyer generation (Flux 1 Schnell /getData). */
export const PIXAZO_FLYER_ENDPOINT =
  "https://gateway.pixazo.ai/flux-1-schnell/v1/getData" as const;

/** Free-tier max width/height per Pixazo docs (Flux Schnell / SDXL free). */
export const PIXAZO_FREE_MAX_PIXELS = 1024;

/** 9:16 portrait within free-tier limits (576 × 1024). */
export const PIXAZO_FLYER_WIDTH = 576;
export const PIXAZO_FLYER_HEIGHT = 1024;

/** Default diffusion steps for Schnell (free tier allows up to 8). */
export const PIXAZO_FLYER_NUM_STEPS = 4;
export const PIXAZO_FREE_MAX_NUM_STEPS = 8;
