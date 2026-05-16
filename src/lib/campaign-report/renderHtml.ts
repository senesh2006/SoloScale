import { renderReportMarkdown } from "@/lib/campaign-report/renderMarkdown";
import type {
  CampaignReportNarrative,
  CampaignReportPacket,
} from "@/types/campaignReport";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Simple markdown-ish to HTML for our controlled report output. */
function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inTable = false;
  let inList = false;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    } else if (line.startsWith("#### ")) {
      out.push(`<h4>${escapeHtml(line.slice(5))}</h4>`);
    } else if (line.startsWith("|")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      if (!inTable) {
        out.push("<table>");
        inTable = true;
      }
      if (line.includes("---")) continue;
      const cells = line
        .split("|")
        .filter((c) => c.trim())
        .map((c) => `<td>${escapeHtml(c.trim())}</td>`);
      out.push(`<tr>${cells.join("")}</tr>`);
    } else if (line.startsWith("- ")) {
      if (inTable) {
        out.push("</table>");
        inTable = false;
      }
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${escapeHtml(line.slice(2))}</li>`);
    } else if (line.trim() === "") {
      if (inTable) {
        out.push("</table>");
        inTable = false;
      }
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
    } else if (line.startsWith("**") && line.endsWith("**")) {
      out.push(`<p><strong>${escapeHtml(line.replace(/\*\*/g, ""))}</strong></p>`);
    } else if (line.startsWith("_") && line.endsWith("_")) {
      out.push(`<p class="muted"><em>${escapeHtml(line.replace(/_/g, ""))}</em></p>`);
    } else if (line === "---") {
      out.push("<hr />");
    } else {
      if (inTable) {
        out.push("</table>");
        inTable = false;
      }
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<p>${escapeHtml(line)}</p>`);
    }
  }

  if (inTable) out.push("</table>");
  if (inList) out.push("</ul>");

  return out.join("\n");
}

export function renderReportHtml(
  packet: CampaignReportPacket,
  narrative: CampaignReportNarrative,
): string {
  const md = renderReportMarkdown(packet, narrative);
  const body = markdownToHtml(md);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Campaign Report — ${escapeHtml(packet.campaign.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Georgia, "Times New Roman", serif;
      line-height: 1.6;
      color: #18181b;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }
    h1 { font-size: 1.75rem; border-bottom: 2px solid #7c3aed; padding-bottom: 0.5rem; }
    h2 { font-size: 1.25rem; margin-top: 2rem; color: #3f3f46; }
    h3, h4 { font-size: 1rem; margin-top: 1.25rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
    td, th { border: 1px solid #e4e4e7; padding: 0.5rem 0.75rem; text-align: left; }
    tr:nth-child(even) { background: #fafafa; }
    ul { padding-left: 1.25rem; }
    li { margin: 0.35rem 0; }
    hr { border: none; border-top: 1px solid #e4e4e7; margin: 2rem 0; }
    .muted { color: #71717a; font-size: 0.85rem; }
    @media print {
      body { padding: 0; max-width: none; }
      h2 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}
