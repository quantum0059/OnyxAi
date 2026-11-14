import PDFDocument from "pdfkit";

/**
 * Generates a PDF buffer from structured document data.
 * 
 * Expected data shape:
 * {
 *   title: string,
 *   subtitle?: string,
 *   sections: [
 *     {
 *       heading: string,
 *       points: string[]
 *     }
 *   ]
 * }
 * 
 * @param {Object} data 
 * @returns {Promise<Buffer>}
 */
export const generatedPdf = async (data) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 50,
                size: "A4",
                bufferPages: true
            });

            const buffers = [];
            doc.on("data", (chunk) => buffers.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(buffers)));
            doc.on("error", (err) => reject(err));

            // Document Title
            if (data?.title) {
                doc
                    .fillColor("#111827")
                    .font("Helvetica-Bold")
                    .fontSize(22)
                    .text(data.title, { align: "left" });
                doc.moveDown(0.3);
            }

            // Subtitle
            if (data?.subtitle) {
                doc
                    .fillColor("#6B7280")
                    .font("Helvetica")
                    .fontSize(12)
                    .text(data.subtitle, { align: "left" });
                doc.moveDown(1);
            }

            // Decorative separator line
            doc
                .strokeColor("#E5E7EB")
                .lineWidth(1)
                .moveTo(50, doc.y)
                .lineTo(545, doc.y)
                .stroke();
            doc.moveDown(1.2);

            // Sections
            if (Array.isArray(data?.sections)) {
                data.sections.forEach((section) => {
                    // Check remaining page space before heading to avoid orphan titles
                    if (doc.y > 700) {
                        doc.addPage();
                    }

                    if (section?.heading) {
                        doc
                            .fillColor("#1E3A8A")
                            .font("Helvetica-Bold")
                            .fontSize(14)
                            .text(section.heading);
                        doc.moveDown(0.4);
                    }

                    if (Array.isArray(section?.points)) {
                        section.points.forEach((point) => {
                            if (doc.y > 740) {
                                doc.addPage();
                            }

                            doc
                                .fillColor("#374151")
                                .font("Helvetica")
                                .fontSize(10.5)
                                .text(`•  ${point}`, {
                                    indent: 10,
                                    lineGap: 3,
                                    align: "justify"
                                });
                            doc.moveDown(0.3);
                        });
                    }

                    doc.moveDown(0.8);
                });
            }

            // Page Numbers Footer
            const range = doc.bufferedPageRange();
            for (let i = range.start; i < range.start + range.count; i++) {
                doc.switchToPage(i);
                doc
                    .fillColor("#9CA3AF")
                    .font("Helvetica")
                    .fontSize(9)
                    .text(
                        `Page ${i + 1} of ${range.count}`,
                        50,
                        doc.page.height - 40,
                        { align: "center", width: doc.page.width - 100 }
                    );
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
this 