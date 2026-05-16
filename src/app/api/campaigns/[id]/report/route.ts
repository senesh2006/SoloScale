import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import {
  firebaseNotConfigured,
  resolveUserId,
  unauthorized,
} from "@/lib/firebase/auth-helpers";
import { assembleReportPacket } from "@/lib/campaign-report/assembleReportPacket";
import { renderReportHtml } from "@/lib/campaign-report/renderHtml";
import { renderReportMarkdown } from "@/lib/campaign-report/renderMarkdown";
import { getOwnedCampaign } from "@/lib/firestore/queries";
import {
  generateCampaignReport,
  isCampaignReportAvailable,
} from "@/services/ai/campaignReport";
import type { ReportFormat } from "@/types/campaignReport";

type Params = { params: Promise<{ id: string }> };

const REPORT_TIMEOUT_MS = 120_000;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "campaign";
}

function parseFormat(url: URL, body: unknown): ReportFormat {
  const fromQuery = url.searchParams.get("format");
  if (fromQuery === "html" || fromQuery === "md") return fromQuery;

  if (body && typeof body === "object" && "format" in body) {
    const f = (body as { format?: string }).format;
    if (f === "html" || f === "md") return f;
  }

  return "md";
}

/**
 * POST /api/campaigns/[id]/report?format=md|html
 * Builds a hybrid campaign report (deterministic metrics + Gemini narrative)
 * and returns a downloadable file.
 */
export async function POST(request: Request, { params }: Params) {
  if (!isFirebaseConfigured()) return firebaseNotConfigured();

  if (!isCampaignReportAvailable()) {
    return NextResponse.json(
      {
        error:
          "Report generation requires GEMINI_API_KEY (and optional GEMINI_IMAGE_API_KEYS) in the SoloScale environment.",
      },
      { status: 503 },
    );
  }

  const { id } = await params;
  const userId = await resolveUserId(request);
  if (!userId) return unauthorized();

  const db = getAdminDb();
  const owned = await getOwnedCampaign(db, id, userId);
  if (!owned.ok) {
    return NextResponse.json({ error: owned.error }, { status: owned.status });
  }

  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const format = parseFormat(url, body);

  try {
    const packet = await assembleReportPacket(db, id, owned.data);

    const narrative = await Promise.race([
      generateCampaignReport(packet),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Report generation timed out")),
          REPORT_TIMEOUT_MS,
        ),
      ),
    ]);

    const dateSlug = packet.generated_at.slice(0, 10);
    const fileSlug = slugify(packet.campaign.title);

    if (format === "html") {
      const html = renderReportHtml(packet, narrative);
      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="soloscale-${fileSlug}-${dateSlug}.html"`,
        },
      });
    }

    const markdown = renderReportMarkdown(packet, narrative);
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="soloscale-${fileSlug}-${dateSlug}.md"`,
      },
    });
  } catch (err) {
    console.error("Campaign report generation failed:", err);
    const message =
      err instanceof Error ? err.message : "Failed to generate report";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
