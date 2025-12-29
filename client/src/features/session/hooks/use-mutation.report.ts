import { useMutation } from "@tanstack/react-query";
import { getSessionReport } from "@/features/session/services/api.report";
import { generatePdfFromReport } from "@/features/session/lib/session-report-pdf.client";

type GenerateReportInput = { sessionId: string; messageLimit?: number };

export function useGenerateSessionReportPdf() {
	return useMutation({
		mutationFn: async (body: GenerateReportInput) => {
			const res = await getSessionReport(body);
			const pdfBytes = await generatePdfFromReport(res.report);
			return { pdf: pdfBytes, report: res.report };
		},
	});
}
