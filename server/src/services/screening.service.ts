import type { NewScreening } from "../libs/db/schemas/screenings.schema";
import { AppError } from "../libs/helper/error.helper";
import { ScreeningRepository } from "../repositories/screening.repository";

export type QuickDassInput = {
	flatJoy: number;
	motivation: number;
	physicalAnxiety: number;
	worry: number;
	restDifficulty: number;
	irritability: number;
};

export type QuickDassOutput = {
	depressionScore: number;
	anxietyScore: number;
	stressScore: number;
	depressionLevel: SeverityLevel;
	anxietyLevel: SeverityLevel;
	stressLevel: SeverityLevel;
};

export type SeverityLevel =
	| "normal"
	| "mild"
	| "moderate"
	| "severe"
	| "extremely_severe";

export const computeQuickDass = (input: QuickDassInput): QuickDassOutput => {
	const dRaw = input.flatJoy + input.motivation;
	const aRaw = input.physicalAnxiety + input.worry;
	const sRaw = input.restDifficulty + input.irritability;

	const scale = (raw: number) => Math.round((raw / 6) * 14) * 2;

	const depressionScore = scale(dRaw);
	const anxietyScore = scale(aRaw);
	const stressScore = scale(sRaw);

	const levelDep = (score: number): SeverityLevel =>
		score <= 9
			? "normal"
			: score <= 13
			? "mild"
			: score <= 20
			? "moderate"
			: score <= 27
			? "severe"
			: "extremely_severe";

	const levelAnx = (score: number): SeverityLevel =>
		score <= 7
			? "normal"
			: score <= 9
			? "mild"
			: score <= 14
			? "moderate"
			: score <= 19
			? "severe"
			: "extremely_severe";

	const levelStress = (score: number): SeverityLevel =>
		score <= 14
			? "normal"
			: score <= 18
			? "mild"
			: score <= 25
			? "moderate"
			: score <= 33
			? "severe"
			: "extremely_severe";

	return {
		depressionScore,
		anxietyScore,
		stressScore,
		depressionLevel: levelDep(depressionScore),
		anxietyLevel: levelAnx(anxietyScore),
		stressLevel: levelStress(stressScore),
	};
};

export const computeRiskLevel = (
	dep: SeverityLevel,
	anx: SeverityLevel,
	str: SeverityLevel
): { risk: "low" | "medium" | "high"; reason: string } => {
	const levels = [dep, anx, str];

	if (levels.includes("extremely_severe") || levels.includes("severe")) {
		return {
			risk: "high",
			reason: "At least one severe or extremely severe domain",
		};
	}

	if (levels.includes("moderate")) {
		return {
			risk: "medium",
			reason: "At least one moderate domain",
		};
	}

	return { risk: "low", reason: "All domains normal or mild" };
};

export class ScreeningService {
	private repository: ScreeningRepository;

	constructor() {
		this.repository = new ScreeningRepository();
	}

	async startScreening(userId: string) {
		const payload: NewScreening = {
			userId: userId,
			status: "in_progress",
			currentStep: 1,
			startedAt: new Date(),
		};
		return this.repository.createScreening(payload);
	}

	async getScreening(id: string) {
		return this.repository.findById(id);
	}

	async listByUser(userId: string) {
		return this.repository.listByUser(userId);
	}

	async updateStepOne(
		id: string,
		payload: { gender: string; ageRange: string }
	) {
		const screening = await this.requireMutableScreening(id, 1);

		return this.repository.updateById(id, {
			gender: payload.gender,
			ageRange: payload.ageRange,
			currentStep: Math.max(screening.currentStep ?? 1, 2),
		});
	}

	async updateStepTwo(
		id: string,
		payload: {
			sleepQuality: string;
			medicationStatus: string;
			medicationNotes?: string | null;
		}
	) {
		const screening = await this.requireMutableScreening(id, 2);

		return this.repository.updateById(id, {
			sleepQuality: payload.sleepQuality,
			medicationStatus: payload.medicationStatus,
			medicationNotes: payload.medicationNotes ?? null,
			currentStep: Math.max(screening.currentStep ?? 2, 3),
		});
	}

	async updateStepThree(
		id: string,
		payload: { happinessScore: number; positiveSources: string[] }
	) {
		const screening = await this.requireMutableScreening(id, 3);

		return this.repository.updateById(id, {
			happinessScore: payload.happinessScore,
			positiveSources: payload.positiveSources,
			currentStep: Math.max(screening.currentStep ?? 3, 4),
		});
	}

	async updateStepFour(id: string, payload: QuickDassInput) {
		const screening = await this.requireMutableScreening(id, 4);

		const dass = computeQuickDass(payload);
		const risk = computeRiskLevel(
			dass.depressionLevel,
			dass.anxietyLevel,
			dass.stressLevel
		);

		const updated = await this.repository.updateById(id, {
			qdFlatJoy: payload.flatJoy,
			qdMotivation: payload.motivation,
			qdPhysicalAnxiety: payload.physicalAnxiety,
			qdWorry: payload.worry,
			qdRest: payload.restDifficulty,
			qdIrritability: payload.irritability,
			dassDepression: dass.depressionScore,
			dassAnxiety: dass.anxietyScore,
			dassStress: dass.stressScore,
			dassDepressionLevel: dass.depressionLevel,
			dassAnxietyLevel: dass.anxietyLevel,
			dassStressLevel: dass.stressLevel,
			riskLevel: risk.risk,
			riskReason: risk.reason,
			currentStep: Math.max(screening.currentStep ?? 4, 5),
		});

		return { updated, dassSummary: { ...dass, riskLevel: risk.risk } };
	}

	async completeStepFive(
		id: string,
		payload: { hasSeenPsychologist: boolean; goals: string[] }
	) {
		const screening = await this.requireMutableScreening(id, 5);

		if (screening.status === "completed") {
			return screening;
		}

		return this.repository.updateById(id, {
			hasSeenPsychologist: payload.hasSeenPsychologist,
			goals: payload.goals,
			status: "completed",
			completedAt: new Date(),
			currentStep: 5,
		});
	}

	private async requireMutableScreening(id: string, step: number) {
		const screening = await this.repository.findById(id);
		if (!screening) {
			throw new AppError("Screening not found", 404, "SCREENING_NOT_FOUND");
		}

		if (screening.status === "completed" && step < 5) {
			throw new AppError(
				"Screening already completed",
				400,
				"SCREENING_COMPLETED"
			);
		}

		if ((screening.currentStep ?? 1) < step) {
			throw new AppError(
				"Cannot jump ahead of current step",
				400,
				"SCREENING_STEP_ORDER"
			);
		}

		return screening;
	}
}
