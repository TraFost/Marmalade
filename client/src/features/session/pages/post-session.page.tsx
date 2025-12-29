import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router";
import { FileDocIcon } from "@phosphor-icons/react";

import { Button } from "@/shared/components/atoms/button";
import { MessageLoading } from "@/shared/components/atoms/message-loading";
import { SummarySkeleton } from "@/shared/components/molecules/summary-skeleton";

import { useGenerateSessionReportPdf } from "@/features/session/hooks/use-mutation.report";
import { downloadPdfFromBytes } from "../utils/download-pdf";

type LocationState = {
	sessionId?: string;
	endedAt?: string;
	summary?: string;
};

function formatEndedAt(endedAtIso: string) {
	try {
		const date = new Date(endedAtIso);
		const formatter = new Intl.DateTimeFormat("en-US", {
			hour: "numeric",
			minute: "numeric",
			timeZoneName: "short",
			month: "short",
			day: "numeric",
		});
		return formatter.format(date);
	} catch {
		return endedAtIso;
	}
}

export function PostSessionPage() {
	const params = useParams();
	const location = useLocation();
	const state = (location.state ?? {}) as LocationState;

	const sessionId = String(state.sessionId ?? params.id ?? "");
	const endedAt = state.endedAt;

	const [showError, setShowError] = useState(false);
	const generate = useGenerateSessionReportPdf();

	const canGenerate = Boolean(sessionId);
	const endedAtDisplay = useMemo(
		() => (endedAt ? formatEndedAt(endedAt) : "..."),
		[endedAt]
	);

	useEffect(() => {
		if (canGenerate) {
			generate.mutate({ sessionId });
		}
	}, [canGenerate]);

	const downloadPdf = () => {
		downloadPdfFromBytes(
			generate.data?.pdf ?? new ArrayBuffer(0),
			sessionId,
			() => {
				setShowError(true);
			}
		);
	};

	return (
		<section className="min-h-dvh flex flex-col items-center justify-center p-4 bg-background text-foreground">
			<main className="w-full max-w-md">
				<div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
					<div className="p-8 pb-4 border-b border-border/30">
						<div className="flex items-center gap-3 mb-4">
							<span className="flex items-center justify-center size-9 rounded-full bg-secondary text-muted-foreground">
								<FileDocIcon size={16} />
							</span>
							<span className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
								{generate.data?.report ? "Report Ready" : "Generating Report"}
							</span>
						</div>

						<h1 className="text-2xl font-serif font-medium tracking-tight text-card-foreground mb-2">
							Session Concluded
						</h1>

						<p className="text-sm text-muted-foreground leading-relaxed">
							The interactive session has been terminated. All input data has
							been processed and is available for export.
						</p>
					</div>

					<div className="p-8 py-6 space-y-6">
						<div className="space-y-3">
							<div className="flex justify-between items-center text-xs">
								<span className="text-muted-foreground">Session ID</span>
								<span className="font-mono text-foreground/80">
									{sessionId || "..."}
								</span>
							</div>
							<div className="flex justify-between items-center text-xs">
								<span className="text-muted-foreground">Ended At</span>
								<span className="font-mono text-foreground/80">
									{endedAtDisplay}
								</span>
							</div>
						</div>

						{generate.data?.report?.generalSummary && (
							<div className="bg-secondary rounded p-4 border border-border/60">
								<h3 className="text-xs font-semibold text-foreground mb-1">
									Summary
								</h3>
								<p className="text-xs text-muted-foreground leading-relaxed">
									{generate.data?.report?.generalSummary}
								</p>
							</div>
						)}

						{generate.isPending ? <SummarySkeleton /> : null}

						{(showError || generate.isError) && (
							<div className="bg-destructive/5 border border-destructive/20 rounded p-3 flex items-start gap-3">
								<div className="text-destructive text-xs font-mono mt-0.5">
									!
								</div>
								<div className="flex-1">
									<p className="text-xs font-medium text-destructive">
										Generation Failed
									</p>
									<p className="text-xs text-destructive/80 mt-1">
										Unable to stream the PDF report. Please verify your
										connection and try again.
									</p>
								</div>
							</div>
						)}
					</div>

					<div className="p-8 pt-0">
						<Button
							className="w-full h-10 rounded-md"
							disabled={!canGenerate || generate.isPending}
							onClick={downloadPdf}
						>
							<span>
								{generate.isPending ? "Generating" : "Download Report"}
							</span>
							{generate.isPending ? <MessageLoading /> : null}
						</Button>

						<p className="text-[10px] text-center text-muted-foreground mt-4">
							Document is generated on-demand. No local storage used. No
							personal data saved.
						</p>
					</div>
				</div>
			</main>
		</section>
	);
}
