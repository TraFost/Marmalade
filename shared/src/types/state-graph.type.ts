export type ActivationLevel = number; // 0..1

export type AffectiveLoad = {
	sadness: ActivationLevel;
	agitation: ActivationLevel;
	numbness: ActivationLevel;
	volatility: ActivationLevel;
};

export type AgencySignal = {
	perceivedControl: ActivationLevel;
	decisionFatigue: ActivationLevel;
	futureOwnership: ActivationLevel;
};

export type TemporalOrientation = {
	pastFixation: ActivationLevel;
	presentOverwhelm: ActivationLevel;
	futureOpacity: ActivationLevel;
};

export type MeaningAnchors = {
	goals: string[];
	lifeAnchors: string[];
	values: string[];
	rememberedDreams: string[];
};

export type DysregulationPatterns = {
	recurringTimeWindows: string[];
	triggers: string[];
	collapseModes: string[];
};

export type LanguageSignature = {
	intensity: ActivationLevel;
	profanity: ActivationLevel;
	abstraction: ActivationLevel;
	metaphorDensity: ActivationLevel;
	sentenceLength: "short" | "mixed" | "long";
	rawness: "low" | "medium" | "high";
};

export type TrustBandwidth = {
	openness: ActivationLevel;
	resistance: ActivationLevel;
	complianceFatigue: ActivationLevel;
};

export type StateReadFlags = {
	cognitiveFragmentation: boolean;
	meaningMakingOnline: boolean;
	agitationRising: boolean;
	futureContinuityThreatened: boolean;
};

export type UserStateRead = {
	affectiveLoad: AffectiveLoad;
	agencySignal: AgencySignal;
	temporalOrientation: TemporalOrientation;
	meaningAnchors: MeaningAnchors;
	dysregulationPatterns: DysregulationPatterns;
	languageSignature: LanguageSignature;
	trustBandwidth: TrustBandwidth;
	flags: StateReadFlags;
	confidence: ActivationLevel;
};

export type StateDelta = {
	changedNodes: Array<
		| "affectiveLoad"
		| "agencySignal"
		| "temporalOrientation"
		| "meaningAnchors"
		| "dysregulationPatterns"
		| "languageSignature"
		| "trustBandwidth"
		| "narrativeCoherence"
	>;
	narrativeCoherenceDelta: "improving" | "worsening" | "stagnant" | "unclear";
	notes?: string | null;
};

export type UserStateGraph = {
	version: 1;
	updatedAt: string; // ISO
	baseline?: {
		read: UserStateRead;
		setAt: string; // ISO
	} | null;
	lastRead?: UserStateRead | null;
	history?: Array<{
		at: string;
		read: UserStateRead;
		delta?: StateDelta | null;
	}>;
	anchors?: MeaningAnchors;
	patterns?: DysregulationPatterns;
};

export type StateMappingSignals = {
	dass?: {
		depressionScore: number | null;
		anxietyScore: number | null;
		stressScore: number | null;
	} | null;
	sleepQuality?: string | null;
	medicationStatus?: string | null;
	medicationNotes?: string | null;
	happinessScore?: number | null;
	willStatus?: WillStatus | null;
	unfinishedLoops?: string | null;
	painQualia?: string | null;
	interactionPreference?: InteractionPreference | null;
	profile?: {
		gender?: string | null;
		ageRange?: string | null;
	} | null;
};

export type StateMappingUpsertRequest = {
	signals?: StateMappingSignals | null;
	anchors?: Partial<MeaningAnchors> | null;
	patterns?: Partial<DysregulationPatterns> | null;
};

export type StateMappingGraphResponse = {
	graph: UserStateGraph;
	signals?: StateMappingSignals | null;
};

export type InteractionPreference = "direct" | "soft" | "analytical";

export type WillStatus = "stable" | "strained" | "collapsed" | "unclear";
