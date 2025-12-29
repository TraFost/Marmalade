export function downloadPdfFromBytes(
	pdfBytes: ArrayBuffer | Uint8Array,
	sessionId: string,
	cb?: () => void
) {
	try {
		const bytes = new Uint8Array(pdfBytes);
		const blob = new Blob([bytes], { type: "application/pdf" });

		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `session-report-${sessionId}.pdf`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	} catch (err) {
		console.warn("Failed to download session report PDF", err);
		cb?.();
	}
}
