import { useMutation } from "@tanstack/react-query";
import { getSessionReport } from "@/features/session/services/api.report";
import { generatePdfFromReport } from "@/features/session/lib/session-report-pdf.client";
import type { ConversationReport } from "shared";

type GenerateReportInput = { sessionId: string; messageLimit?: number };

export function useGenerateSessionReportPdf() {
	return useMutation({
		mutationFn: async (body: GenerateReportInput) => {
			const res = await getSessionReport(body);
			const pdfBytes = await generatePdfFromReport(res.report, res.meta);
			return { pdf: pdfBytes, report: res.report };
		},
		onSuccess: (
			data: { pdf: ArrayBuffer | Uint8Array; report: ConversationReport },
			variables: GenerateReportInput
		) => {
			try {
				const bytes = new Uint8Array(
					data.pdf instanceof Uint8Array ? data.pdf : data.pdf
				);
				const blob = new Blob([bytes], { type: "application/pdf" });

				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `session-report-${variables.sessionId}.pdf`;
				document.body.appendChild(a);
				a.click();
				a.remove();
				URL.revokeObjectURL(url);
			} catch (err) {
				console.warn("Failed to download session report PDF", err);
			}
		},
	});
}
