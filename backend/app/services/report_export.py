"""Report generation: PDF (reportlab), CSV, and JSON exports of a project's
ranked candidates."""
import csv
import io
import json
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .prediction import PROPERTY_LABELS, PROPERTY_NAMES

DISCLAIMER = (
    "Property values are AI screening estimates from descriptor-based surrogate "
    "models — directional guidance for shortlisting, not lab-grade measurements."
)


def _candidate_rows(candidates: list[dict]) -> list[list]:
    header = ["Rank", "SMILES", "Score", "Novelty"] + [
        PROPERTY_LABELS[p] for p in PROPERTY_NAMES
    ]
    rows = [header]
    for c in candidates:
        preds = {p["property_name"]: p["predicted_value"] for p in c["predictions"]}
        rows.append(
            [
                c["rank"],
                c["smiles"],
                c["composite_score"],
                c["novelty_score"],
            ]
            + [preds.get(p, "") for p in PROPERTY_NAMES]
        )
    return rows


def build_csv(project: dict, candidates: list[dict]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([f"EcoMatter AI-QLab report — {project['name']} ({project['domain']})"])
    writer.writerow([DISCLAIMER])
    writer.writerow([])
    for row in _candidate_rows(candidates):
        writer.writerow(row)
    return buffer.getvalue().encode("utf-8")


def build_json(project: dict, candidates: list[dict]) -> bytes:
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "tool": "EcoMatter AI-QLab",
        "disclaimer": DISCLAIMER,
        "project": project,
        "candidates": candidates,
    }
    return json.dumps(payload, indent=2, default=str).encode("utf-8")


def build_pdf(project: dict, candidates: list[dict]) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, topMargin=18 * mm, bottomMargin=18 * mm
    )
    styles = getSampleStyleSheet()
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=8, textColor=colors.grey)
    mono_small = ParagraphStyle("mono", parent=styles["Normal"], fontSize=7, fontName="Courier")

    story = [
        Paragraph("EcoMatter AI-QLab — Candidate Report", styles["Title"]),
        Paragraph(
            f"Project: <b>{project['name']}</b> &nbsp;|&nbsp; Domain: {project['domain']} "
            f"&nbsp;|&nbsp; Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            styles["Normal"],
        ),
        Spacer(1, 4 * mm),
        Paragraph(DISCLAIMER, small),
        Spacer(1, 6 * mm),
    ]

    if project.get("property_targets"):
        story.append(Paragraph("Target profile", styles["Heading2"]))
        target_rows = [["Property", "Target (0-100)", "Weight"]] + [
            [
                PROPERTY_LABELS.get(t["property_name"], t["property_name"]),
                t["target_value"],
                t["weight"],
            ]
            for t in project["property_targets"]
        ]
        table = Table(target_rows, hAlign="LEFT")
        table.setStyle(_table_style())
        story += [table, Spacer(1, 6 * mm)]

    story.append(Paragraph(f"Ranked candidates ({len(candidates)})", styles["Heading2"]))
    rows = _candidate_rows(candidates)
    display_rows = [rows[0]] + [
        [row[0], Paragraph(str(row[1]), mono_small)] + row[2:] for row in rows[1:]
    ]
    table = Table(display_rows, hAlign="LEFT", colWidths=[12 * mm, 55 * mm] + [None] * 7)
    table.setStyle(_table_style())
    story.append(table)

    routed = [c for c in candidates if c.get("synthesis_route")]
    if routed:
        story += [Spacer(1, 6 * mm), Paragraph("Synthesis outlook (top candidates)", styles["Heading2"])]
        for c in routed[:5]:
            route = c["synthesis_route"]
            coverage = route.get("largest_block_pct")
            coverage_txt = f", largest block {coverage:.0f}% of skeleton" if coverage else ""
            story.append(
                Paragraph(
                    f"<b>Rank {c['rank']}</b> — engine: {route['source_engine']}, "
                    f"{route.get('building_blocks', 0)} building blocks{coverage_txt}",
                    styles["Normal"],
                )
            )
    doc.build(story)
    return buffer.getvalue()


def _table_style() -> TableStyle:
    return TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#14532d")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5cf")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f7f3")]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]
    )
