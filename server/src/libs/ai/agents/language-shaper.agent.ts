import type { InteractionPreference, WillStatus } from "shared";

export type LanguageMirrorPlan = {
	sentenceLength: "short" | "mixed" | "long";
	rawness: "low" | "medium" | "high";
	metaphorDensityHint: "low" | "medium" | "high";
	abstractionHint: "concrete" | "mixed" | "abstract";
	profanityTolerance: "none" | "light" | "match";
};

const minSentenceLength = (
	a: LanguageMirrorPlan["sentenceLength"],
	b: LanguageMirrorPlan["sentenceLength"]
): LanguageMirrorPlan["sentenceLength"] => {
	const order = { short: 0, mixed: 1, long: 2 } as const;
	return order[a] <= order[b] ? a : b;
};

const maxSentenceLength = (
	a: LanguageMirrorPlan["sentenceLength"],
	b: LanguageMirrorPlan["sentenceLength"]
): LanguageMirrorPlan["sentenceLength"] => {
	const order = { short: 0, mixed: 1, long: 2 } as const;
	return order[a] >= order[b] ? a : b;
};

const capRawness = (
	value: LanguageMirrorPlan["rawness"],
	cap: LanguageMirrorPlan["rawness"]
): LanguageMirrorPlan["rawness"] => {
	const order = { low: 0, medium: 1, high: 2 } as const;
	return order[value] <= order[cap] ? value : cap;
};

const capProfanity = (
	value: LanguageMirrorPlan["profanityTolerance"],
	cap: LanguageMirrorPlan["profanityTolerance"]
): LanguageMirrorPlan["profanityTolerance"] => {
	const order = { none: 0, light: 1, match: 2 } as const;
	return order[value] <= order[cap] ? value : cap;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export const buildLanguageMirrorPlan = (
	userText: string,
	prefs?: {
		interactionPreference?: InteractionPreference | null;
		willStatus?: WillStatus | null;
	}
): LanguageMirrorPlan => {
	const text = userText ?? "";
	const words = text.trim().split(/\s+/).filter(Boolean);
	const sentences = text
		.split(/[.!?\n]+/)
		.map((s) => s.trim())
		.filter(Boolean);
	const avgSentenceWords = sentences.length
		? words.length / Math.max(1, sentences.length)
		: words.length;

	const sentenceLength: LanguageMirrorPlan["sentenceLength"] =
		avgSentenceWords <= 8 ? "short" : avgSentenceWords <= 16 ? "mixed" : "long";

	const profanityScore = clamp01(
		(text.match(
			/\b(fuck|shit|damn|bitch|asshole|kontol|anjing|bangsat|tai)\b/gi
		)?.length ?? 0) / 3
	);
	const intensityScore = clamp01(
		(text.match(/!|\b(always|never|nothing|everything|can't|cannot|won't)\b/gi)
			?.length ?? 0) / 6
	);

	const rawness: LanguageMirrorPlan["rawness"] =
		intensityScore + profanityScore >= 0.9
			? "high"
			: intensityScore + profanityScore >= 0.4
			? "medium"
			: "low";

	const metaphorDensityHint: LanguageMirrorPlan["metaphorDensityHint"] =
		/\blike\b|\bas if\b|\bfeels like\b|\bit's as though\b|\bseperti\b|\bkayak\b|\bseolah\b/i.test(
			text
		)
			? "medium"
			: "low";

	const abstractionHint: LanguageMirrorPlan["abstractionHint"] =
		/\bmeaning\b|\bidentity\b|\bexist\b|\bpurpose\b|\bcoherence\b|\bnihil\b|\bmakna\b|\barti\b|\btujuan\b/i.test(
			text
		)
			? "abstract"
			: /\bbody\b|\bchest\b|\bstomach\b|\bhead\b|\bbreath\b|\btight\b|\bpressure\b|\bberat\b|\bsesak\b|\bnapas\b/i.test(
					text
			  )
			? "concrete"
			: "mixed";

	const profanityTolerance: LanguageMirrorPlan["profanityTolerance"] =
		profanityScore >= 0.6 ? "match" : profanityScore >= 0.2 ? "light" : "none";

	let plan: LanguageMirrorPlan = {
		sentenceLength,
		rawness,
		metaphorDensityHint,
		abstractionHint,
		profanityTolerance,
	};

	const interactionPreference = prefs?.interactionPreference ?? null;
	const willStatus = prefs?.willStatus ?? null;

	if (interactionPreference === "direct") {
		plan = {
			...plan,
			sentenceLength: minSentenceLength(plan.sentenceLength, "short"),
			abstractionHint: "concrete",
			metaphorDensityHint: "low",
			profanityTolerance: capProfanity(plan.profanityTolerance, "light"),
		};
	}

	if (interactionPreference === "soft") {
		plan = {
			...plan,
			sentenceLength: minSentenceLength(plan.sentenceLength, "mixed"),
			abstractionHint: "concrete",
			metaphorDensityHint: "low",
			rawness: capRawness(plan.rawness, "medium"),
			profanityTolerance: capProfanity(plan.profanityTolerance, "none"),
		};
	}

	if (interactionPreference === "analytical") {
		plan = {
			...plan,
			sentenceLength: maxSentenceLength(plan.sentenceLength, "mixed"),
			abstractionHint:
				plan.abstractionHint === "concrete" ? "mixed" : plan.abstractionHint,
			metaphorDensityHint: "low",
			profanityTolerance: capProfanity(plan.profanityTolerance, "light"),
		};
	}

	if (willStatus === "collapsed") {
		plan = {
			...plan,
			sentenceLength: "short",
			abstractionHint: "concrete",
			metaphorDensityHint: "low",
			rawness: capRawness(plan.rawness, "medium"),
			profanityTolerance: capProfanity(plan.profanityTolerance, "none"),
		};
	}

	if (willStatus === "strained") {
		plan = {
			...plan,
			sentenceLength: minSentenceLength(plan.sentenceLength, "mixed"),
			abstractionHint:
				plan.abstractionHint === "abstract" ? "mixed" : plan.abstractionHint,
			metaphorDensityHint: "low",
			rawness: capRawness(plan.rawness, "medium"),
			profanityTolerance: capProfanity(plan.profanityTolerance, "light"),
		};
	}

	return plan;
};
