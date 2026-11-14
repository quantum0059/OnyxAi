import pptxgen from "pptxgenjs";

/**
 * Generates a styled PowerPoint presentation buffer from structured data.
 * Uses LAYOUT_WIDE (13.33" × 7.5") consistently so elements and page numbers fit properly.
 * 
 * Supported layouts:
 * - "bullets" (default)
 * - "two_column"
 * - "quote"
 * - "stats"
 * - "closing"
 */
export const generatePpt = async (data) => {
    const ppt = new pptxgen();

    // 16:9 widescreen presentation (13.33" × 7.5")
    ppt.layout = "LAYOUT_WIDE";
    ppt.author = "OnyxAI Presentation Agent";
    ppt.company = "OnyxAI Platform";
    ppt.title = data?.title || "Presentation";

    // ─── 1. Title Slide (Dark modern theme) ──────────────────────
    const titleSlide = ppt.addSlide();
    titleSlide.background = { color: "0F172A" }; // Slate 900

    titleSlide.addText(data?.title || "Presentation Deck", {
        x: 1.0,
        y: 2.2,
        w: 11.33,
        h: 1.5,
        fontSize: 40,
        fontFace: "Arial",
        bold: true,
        color: "FFFFFF",
        align: "left",
        valign: "middle"
    });

    if (data?.subtitle) {
        titleSlide.addText(data.subtitle, {
            x: 1.0,
            y: 3.8,
            w: 11.33,
            h: 0.8,
            fontSize: 20,
            fontFace: "Calibri",
            color: "94A3B8", // Slate 400
            align: "left"
        });
    }

    // Accent bar
    titleSlide.addShape(ppt.ShapeType.rect, {
        x: 1.0,
        y: 4.8,
        w: 2.0,
        h: 0.08,
        fill: { color: "6366F1" }, // Indigo accent
        line: { color: "6366F1" }
    });

    // ─── 2. Content Slides ───────────────────────────────────────
    const slides = Array.isArray(data?.slides) ? data.slides : [];

    slides.forEach((slideData, index) => {
        const slide = ppt.addSlide();
        slide.background = { color: "FAFAFA" }; // Clean off-white

        // Top Breadcrumb / Category
        slide.addText(data.title ? data.title.toUpperCase() : "PRESENTATION", {
            x: 1.0,
            y: 0.5,
            w: 10.0,
            h: 0.3,
            fontSize: 11,
            fontFace: "Arial",
            bold: true,
            color: "6366F1"
        });

        // Slide Title
        slide.addText(slideData?.title || `Slide ${index + 2}`, {
            x: 1.0,
            y: 0.85,
            w: 11.33,
            h: 0.8,
            fontSize: 26,
            fontFace: "Arial",
            bold: true,
            color: "0F172A"
        });

        // Divider Line
        slide.addShape(ppt.ShapeType.line, {
            x: 1.0,
            y: 1.75,
            w: 11.33,
            h: 0,
            line: { color: "E2E8F0", width: 1 }
        });

        const bullets = Array.isArray(slideData?.bullets) ? slideData.bullets : [];
        const layout = slideData?.layout || "bullets";

        // Layout Variants
        if (layout === "two_column" && bullets.length >= 2) {
            const mid = Math.ceil(bullets.length / 2);
            const col1 = bullets.slice(0, mid);
            const col2 = bullets.slice(mid);

            const col1Items = col1.map((b) => ({
                text: b,
                options: { bullet: true, breakLine: true, fontSize: 15, color: "334155", fontFace: "Calibri", lineSpacing: 28 }
            }));
            const col2Items = col2.map((b) => ({
                text: b,
                options: { bullet: true, breakLine: true, fontSize: 15, color: "334155", fontFace: "Calibri", lineSpacing: 28 }
            }));

            slide.addText(col1Items, { x: 1.0, y: 2.2, w: 5.4, h: 4.3, valign: "top" });
            slide.addText(col2Items, { x: 6.9, y: 2.2, w: 5.4, h: 4.3, valign: "top" });

        } else if (layout === "quote") {
            // Elegant Quote Layout
            const mainQuote = bullets[0] || slideData.title;
            const attribution = bullets[1] || slideData?.notes || "";

            slide.addShape(ppt.ShapeType.rect, {
                x: 1.0,
                y: 2.3,
                w: 0.15,
                h: 2.5,
                fill: { color: "6366F1" },
                line: { color: "6366F1" }
            });

            slide.addText(`“${mainQuote}”`, {
                x: 1.4,
                y: 2.2,
                w: 10.5,
                h: 2.5,
                fontSize: 22,
                fontFace: "Georgia",
                italic: true,
                color: "1E293B",
                valign: "middle"
            });

            if (attribution) {
                slide.addText(`— ${attribution}`, {
                    x: 1.4,
                    y: 4.8,
                    w: 10.5,
                    h: 0.6,
                    fontSize: 14,
                    fontFace: "Calibri",
                    color: "64748B"
                });
            }

        } else if (layout === "stats" && bullets.length >= 2) {
            // Stats / Metrics Highlight Layout
            const cardWidth = Math.min(3.5, 11.33 / Math.min(bullets.length, 3));
            bullets.slice(0, 3).forEach((item, i) => {
                const parts = item.split(/[:\-–—]/);
                const statVal = parts[0]?.trim();
                const statDesc = parts.slice(1).join(" ")?.trim() || "";

                const cardX = 1.0 + i * (cardWidth + 0.4);

                slide.addShape(ppt.ShapeType.roundRect, {
                    x: cardX,
                    y: 2.3,
                    w: cardWidth,
                    h: 3.8,
                    fill: { color: "FFFFFF" },
                    line: { color: "E2E8F0", width: 1 }
                });

                slide.addText(statVal, {
                    x: cardX + 0.2,
                    y: 2.6,
                    w: cardWidth - 0.4,
                    h: 1.2,
                    fontSize: 32,
                    fontFace: "Arial",
                    bold: true,
                    color: "6366F1",
                    align: "center"
                });

                slide.addText(statDesc || item, {
                    x: cardX + 0.3,
                    y: 3.8,
                    w: cardWidth - 0.6,
                    h: 2.0,
                    fontSize: 14,
                    fontFace: "Calibri",
                    color: "475569",
                    align: "center",
                    valign: "top"
                });
            });

        } else {
            // Standard bullets or closing layout
            const bulletItems = bullets.map((b) => ({
                text: b,
                options: {
                    bullet: { type: "bullet", code: "2022" },
                    breakLine: true,
                    fontSize: 16,
                    color: "334155",
                    fontFace: "Calibri",
                    lineSpacing: 30
                }
            }));

            slide.addText(bulletItems, {
                x: 1.0,
                y: 2.2,
                w: 11.33,
                h: 4.4,
                valign: "top"
            });
        }

        // Presenter Notes
        if (slideData?.notes) {
            slide.addNotes(slideData.notes);
        }

        // Slide numbering footer (properly positioned within 13.33" WIDE layout)
        slide.addText(`${index + 2} / ${slides.length + 1}`, {
            x: 11.0,
            y: 6.8,
            w: 1.5,
            h: 0.3,
            fontSize: 11,
            fontFace: "Calibri",
            color: "94A3B8",
            align: "right"
        });
    });

    const buffer = await ppt.write({ outputType: "nodebuffer" });
    return buffer;
};
