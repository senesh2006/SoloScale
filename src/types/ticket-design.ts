/**
 * Visual settings for downloadable / on-screen tickets (per event).
 * Stored on `events/{id}.ticket_design`.
 */
export type TicketDesign = {
  header_style: "gradient" | "solid";
  /** Used when `header_style === "gradient"`. */
  header_gradient_angle: number;
  header_color_start: string;
  /** Middle stop; omit solid headers or two-stop gradients. */
  header_color_mid: string | null;
  header_color_end: string;
  /**
   * Full-bleed header background image (https URL). When set, replaces
   * gradient/solid colors for the header band only.
   */
  header_background_image_url: string | null;
  /**
   * 0–0.85 dark overlay on top of the header image (improves text contrast).
   */
  header_image_overlay_opacity: number;
  header_text_color: string;
  header_text_align: "left" | "center" | "right";
  header_padding_px: number;
  body_background: string;
  body_text_color: string;
  muted_text_color: string;
  label_text_color: string;
  qr_position: "left" | "right";
  /** Accent for links / focus; QR frame can use border_color */
  accent_color: string;
  border_color: string;
  show_perforation: boolean;
};

export const DEFAULT_TICKET_DESIGN: TicketDesign = {
  header_style: "gradient",
  header_gradient_angle: 135,
  header_color_start: "#7c3aed",
  header_color_mid: "#c026d3",
  header_color_end: "#f43f5e",
  header_background_image_url: null,
  header_image_overlay_opacity: 0.4,
  header_text_color: "#ffffff",
  header_text_align: "left",
  header_padding_px: 20,
  body_background: "#ffffff",
  body_text_color: "#18181b",
  muted_text_color: "#71717a",
  label_text_color: "#a1a1aa",
  qr_position: "right",
  accent_color: "#7c3aed",
  border_color: "#e4e4e7",
  show_perforation: true,
};

export const TICKET_DESIGN_PRESETS: {
  id: string;
  label: string;
  patch: Partial<TicketDesign>;
}[] = [
  { id: "violet", label: "Violet", patch: {} },
  {
    id: "ocean",
    label: "Ocean",
    patch: {
      header_color_start: "#0284c7",
      header_color_mid: "#0e7490",
      header_color_end: "#0f172a",
      accent_color: "#0284c7",
    },
  },
  {
    id: "forest",
    label: "Forest",
    patch: {
      header_color_start: "#15803d",
      header_color_mid: "#166534",
      header_color_end: "#14532d",
      accent_color: "#15803d",
    },
  },
  {
    id: "sunset",
    label: "Sunset",
    patch: {
      header_color_start: "#ea580c",
      header_color_mid: "#dc2626",
      header_color_end: "#7f1d1d",
      header_text_color: "#fff7ed",
      accent_color: "#ea580c",
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    patch: {
      header_style: "solid",
      header_color_start: "#18181b",
      header_color_mid: null,
      header_color_end: "#18181b",
      header_text_color: "#fafafa",
      body_background: "#fafafa",
      body_text_color: "#18181b",
      muted_text_color: "#52525b",
      label_text_color: "#71717a",
      accent_color: "#6366f1",
      border_color: "#d4d4d8",
    },
  },
];

export function resolveTicketDesign(
  raw: Partial<TicketDesign> | null | undefined,
): TicketDesign {
  return { ...DEFAULT_TICKET_DESIGN, ...(raw ?? {}) };
}

export function buildHeaderBackground(d: TicketDesign): string {
  if (d.header_style === "solid") {
    return d.header_color_start;
  }
  if (d.header_color_mid) {
    return `linear-gradient(${d.header_gradient_angle}deg, ${d.header_color_start} 0%, ${d.header_color_mid} 50%, ${d.header_color_end} 100%)`;
  }
  return `linear-gradient(${d.header_gradient_angle}deg, ${d.header_color_start} 0%, ${d.header_color_end} 100%)`;
}
