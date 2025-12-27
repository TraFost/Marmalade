import type { ConversationReport } from "shared";
import { pdf } from "tinypdf";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const LINE_HEIGHT = 14;
const FOOTER_GAP = 28;

type PdfMeta = { messageCountUsed: number; truncated: boolean };

type Command =
	| {
			type: "text";
			x: number;
			y: number;
			size: number;
			text: string;
			options?: Record<string, unknown>;
	  }
	| { type: "bullet"; x: number; y: number; size: number; text: string }
	| {
			type: "line";
			x1: number;
			y1: number;
			x2: number;
			y2: number;
			color: string;
			width?: number;
	  }
	| { type: "rect"; x: number; y: number; w: number; h: number; fill?: string }
	| { type: "footer" };

export async function generatePdfFromReport(
	report: ConversationReport,
	meta: PdfMeta
): Promise<Uint8Array> {
	const doc = pdf();

	let commands: Command[] = [];
	let cursorY = MARGIN;

	function startPage() {
		commands = [];
		cursorY = MARGIN;
		commands.push({
			type: "text",
			x: MARGIN,
			y: cursorY,
			size: 18,
			text: report.reportTitle,
			options: { color: "#000" },
		});
		cursorY += 22;
		commands.push({
			type: "text",
			x: MARGIN,
			y: cursorY,
			size: 10,
			text: `Generated: ${report.generatedAt}`,
			options: { color: "#000" },
		});
		cursorY += 16;
		commands.push({
			type: "text",
			x: MARGIN,
			y: cursorY,
			size: 10,
			text: `Turns included: ${report.dataCoverage.turnsIncluded} · Truncated: ${meta.truncated}`,
			options: { color: "#000" },
		});
		cursorY += 18;
	}

	function startSubsequentPageHeader() {
		commands.push({
			type: "text",
			x: MARGIN,
			y: cursorY,
			size: 12,
			text: report.reportTitle,
			options: { color: "#000" },
		});
		cursorY += 18;
	}

	function flushPage() {
		commands.push({ type: "footer" });
		const pageCommands = [...commands];
		doc.page((p) => {
			for (const cmd of pageCommands) {
				switch (cmd.type) {
					case "text": {
						const y = PAGE_HEIGHT - cmd.y;
						p.text(cmd.text, cmd.x, y, cmd.size, cmd.options || {});
						break;
					}
					case "bullet": {
						const y = PAGE_HEIGHT - cmd.y;
						p.text("•", cmd.x - 8, y, cmd.size);
						p.text(cmd.text, cmd.x, y, cmd.size, {
							width: PAGE_WIDTH - MARGIN * 2 - 24,
						});
						break;
					}
					case "line": {
						const y1 = PAGE_HEIGHT - cmd.y1;
						const y2 = PAGE_HEIGHT - cmd.y2;
						p.line(cmd.x1, y1, cmd.x2, y2, cmd.color, cmd.width);
						break;
					}
					case "rect": {
						const yTop = cmd.y;
						const y = PAGE_HEIGHT - yTop - cmd.h;
						p.rect(cmd.x, y, cmd.w, cmd.h, cmd.fill ?? "");
						break;
					}
					case "footer": {
						const disclaimerY = PAGE_HEIGHT - MARGIN - 24;
						p.text(String(report.disclaimer), MARGIN, disclaimerY, 9);
						p.text("Marmalade", MARGIN, disclaimerY - 12, 9, {
							color: "#000",
							align: "left",
						});
						break;
					}
				}
			}
		});
		commands = [];
		cursorY = MARGIN;
	}

	function ensureSpace(needed = 0) {
		if (cursorY + needed + FOOTER_GAP >= PAGE_HEIGHT - MARGIN) {
			flushPage();
			startSubsequentPageHeader();
		}
	}

	function addParagraph(text: string, size = 11) {
		const lines = layoutText(text, PAGE_WIDTH - MARGIN * 2, size);
		for (const line of lines) {
			ensureSpace(LINE_HEIGHT);
			commands.push({ type: "text", x: MARGIN, y: cursorY, size, text: line });
			cursorY += LINE_HEIGHT;
		}
		cursorY += 6;
	}

	function addBulletedList(items: string[]) {
		for (const item of items) {
			ensureSpace(LINE_HEIGHT);
			const lines = layoutText(item, PAGE_WIDTH - MARGIN * 2 - 24, 11);
			for (const [i, line] of lines.entries()) {
				if (i === 0) {
					commands.push({
						type: "bullet",
						x: MARGIN + 8,
						y: cursorY,
						size: 11,
						text: line,
					});
				} else {
					commands.push({
						type: "text",
						x: MARGIN + 24,
						y: cursorY,
						size: 11,
						text: line,
					});
				}
				cursorY += LINE_HEIGHT;
			}
			cursorY += 4;
		}
	}

	function addQuote(quote: string) {
		ensureSpace(LINE_HEIGHT);
		const lines = layoutText(quote, PAGE_WIDTH - MARGIN * 2 - 24, 11);
		commands.push({
			type: "text",
			x: MARGIN + 12,
			y: cursorY,
			size: 16,
			text: "\u201C",
		});
		cursorY += LINE_HEIGHT;
		for (const line of lines) {
			commands.push({
				type: "text",
				x: MARGIN + 20,
				y: cursorY,
				size: 11,
				text: line,
			});
			cursorY += LINE_HEIGHT;
		}
		cursorY += 6;
	}

	function addSectionHeading(heading: string) {
		ensureSpace(18 + 6);
		commands.push({
			type: "text",
			x: MARGIN,
			y: cursorY,
			size: 12,
			text: heading,
			options: { color: "#000" },
		});
		cursorY += 18;
	}

	startPage();

	function writeSection(title: string, writer: () => void) {
		addSectionHeading(title);
		writer();
	}

	writeSection("Subjective", () => {
		if (report.soapNote?.subjective?.summary)
			addParagraph(report.soapNote.subjective.summary);
		if (report.soapNote?.subjective?.reportedFeelings?.length)
			addBulletedList(report.soapNote.subjective.reportedFeelings);
		if (report.soapNote?.subjective?.reportedStressors?.length)
			addBulletedList(report.soapNote.subjective.reportedStressors);
		if (report.soapNote?.subjective?.userQuotes?.length)
			for (const q of report.soapNote.subjective.userQuotes) addQuote(q);
	});

	writeSection("Objective", () => {
		if (report.soapNote?.objective?.interactionSummary)
			addParagraph(report.soapNote.objective.interactionSummary);
		addParagraph(
			`Message count: ${
				report.soapNote?.objective?.messageCount ?? meta.messageCountUsed
			}`
		);
		if (report.soapNote?.objective?.dateRange)
			addParagraph(
				`Date range: ${report.soapNote.objective.dateRange.start} — ${report.soapNote.objective.dateRange.end}`
			);
		if (report.soapNote?.objective?.observations?.length)
			addBulletedList(report.soapNote.objective.observations);
	});

	writeSection("Assessment", () => {
		if (report.soapNote?.assessment?.summaryOfThemesNoDiagnosis)
			addParagraph(report.soapNote.assessment.summaryOfThemesNoDiagnosis);
		if (report.soapNote?.assessment?.narrativeThemes?.length) {
			for (const t of report.soapNote.assessment.narrativeThemes) {
				addParagraph(`Theme: ${t.theme}`);
				if (t.evidence?.length) addBulletedList(t.evidence);
			}
		}
		if (report.soapNote?.assessment?.affectiveObservations) {
			addParagraph(
				`Overall tone: ${report.soapNote.assessment.affectiveObservations.overallTone}`
			);
			if (
				report.soapNote.assessment.affectiveObservations.notableAffects?.length
			) {
				for (const a of report.soapNote.assessment.affectiveObservations
					.notableAffects) {
					addParagraph(`${a.affect} (${a.approximateShare})`);
					if (a.evidence?.length) addBulletedList(a.evidence);
				}
			}
		}
	});

	writeSection("Plan", () => {
		if (report.soapNote?.plan?.userStatedNextSteps?.length)
			addBulletedList(report.soapNote.plan.userStatedNextSteps);
		if (report.soapNote?.plan?.suggestedTherapyQuestions?.length)
			addBulletedList(report.soapNote.plan.suggestedTherapyQuestions);
		if (report.soapNote?.plan?.safetyNote)
			addParagraph(report.soapNote.plan.safetyNote);
	});

	writeSection("Personal Reflection", () => {
		if (report.personalReflection?.summary)
			addParagraph(report.personalReflection.summary);
		if (report.personalReflection?.whatFeltHard?.length)
			addBulletedList(report.personalReflection.whatFeltHard);
		if (report.personalReflection?.whatHelped?.length)
			addBulletedList(report.personalReflection.whatHelped);
		if (report.personalReflection?.whatINeedFromTherapy?.length)
			addBulletedList(report.personalReflection.whatINeedFromTherapy);
	});

	writeSection("Clinical Memo", () => {
		if (report.clinicalMemo?.narrativeThemes?.length) {
			for (const t of report.clinicalMemo.narrativeThemes) {
				addParagraph(`Theme: ${t.theme}`);
				if (t.evidence?.length) addBulletedList(t.evidence);
			}
		}
		if (report.clinicalMemo?.affectiveObservations) {
			addParagraph(
				`Overall tone: ${report.clinicalMemo.affectiveObservations.overallTone}`
			);
			if (report.clinicalMemo.affectiveObservations.notableAffects?.length) {
				for (const a of report.clinicalMemo.affectiveObservations
					.notableAffects) {
					addParagraph(`${a.affect} (${a.approximateShare})`);
					if (a.evidence?.length) addBulletedList(a.evidence);
				}
			}
		}
		if (report.clinicalMemo?.continuitySignals?.length) {
			for (const s of report.clinicalMemo.continuitySignals) {
				addParagraph(`${s.label}: ${s.description}`);
				if (s.evidence?.length) addBulletedList(s.evidence);
			}
		}
		if (report.clinicalMemo?.riskSummary)
			addParagraph(
				`Risk: ${report.clinicalMemo.riskSummary.maxRiskLevelObserved} — ${report.clinicalMemo.riskSummary.notes}`
			);
		if (report.clinicalMemo?.suggestedTherapyQuestions?.length)
			addBulletedList(report.clinicalMemo.suggestedTherapyQuestions);
	});

	flushPage();

	return doc.build();
}

function layoutText(text: string, maxWidthPx: number, fontSize: number) {
	const approxCharsPerLine = Math.max(
		40,
		Math.floor((maxWidthPx / fontSize) * 1.6)
	);
	const words = text.split(/(\s+)/);
	const lines: string[] = [];
	let current = "";
	for (const w of words) {
		if ((current + w).length > approxCharsPerLine) {
			lines.push(current.trim());
			current = w;
		} else {
			current += w;
		}
	}
	if (current.trim()) lines.push(current.trim());
	return lines;
}
