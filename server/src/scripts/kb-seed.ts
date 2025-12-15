import { db } from "../libs/db/db.lib";
import { kbDocs } from "../libs/db/schemas";
import { EmbeddingClient } from "../libs/ai/embedding.client";

const embeddingClient = new EmbeddingClient();

// Severity Levels:
// 0: General Info / Education
// 1: Mild Distress / Prevention
// 2: Moderate Distress / Coping
// 3: Severe Distress / Intervention
// 4: Crisis / Emergency

const KNOWLEDGE_BASE = [
	// --- ANXIETY & GROUNDING ---
	{
		topic: "Anxiety",
		title: "The 5-4-3-2-1 Grounding Technique",
		content:
			"A powerful grounding technique to regain control during high anxiety or dissociation. 1. Acknowledge 5 things you see. 2. Acknowledge 4 things you can touch. 3. Acknowledge 3 things you hear. 4. Acknowledge 2 things you can smell. 5. Acknowledge 1 thing you can taste. This engages the cortex and dampens the amygdala response.",
		tags: ["grounding", "panic-attack", "dissociation", "somatic"],
		minSeverity: 2,
	},
	{
		topic: "Anxiety",
		title: "Box Breathing",
		content:
			"A physiological reset for the nervous system using a 4-4-4-4 pattern. Inhale for 4 seconds, Hold for 4 seconds, Exhale for 4 seconds, Hold for 4 seconds. Repeat for at least 4 cycles. This stimulates the vagus nerve to reduce heart rate.",
		tags: ["breathwork", "calming", "nervous-system", "physical"],
		minSeverity: 1,
	},
	{
		topic: "Anxiety",
		title: "The TIPP Skill (DBT)",
		content:
			"For extreme distress (10/10 emotion): T - Temperature (Splash ice-cold water on your face to trigger the mammalian dive reflex). I - Intense Exercise (Sprint or jump for 60 seconds). P - Paced Breathing. P - Paired Muscle Relaxation. Use this when you cannot think clearly.",
		tags: ["dbt", "crisis", "high-distress", "emergency"],
		minSeverity: 3,
	},
	{
		topic: "Anxiety",
		title: "Catastrophizing",
		content:
			"A cognitive distortion where you predict the worst possible outcome. Counter it with two questions: 'What is the evidence for this thought?' and 'If the worst happened, how would I cope?' Usually, the outcome is less severe than imagined.",
		tags: ["cbt", "thinking-traps", "worry", "logic"],
		minSeverity: 1,
	},

	// --- DEPRESSION & ACTIVATION ---
	{
		topic: "Depression",
		title: "Behavioral Activation",
		content:
			"The 'Outside-In' approach to motivation. Do not wait to feel like doing it; do it to feel like it. Action precedes motivation. Start with 'Micro-Steps'—tasks so small you cannot fail (e.g., put on one shoe).",
		tags: ["motivation", "lethargy", "routine", "action"],
		minSeverity: 2,
	},
	{
		topic: "Depression",
		title: "The 'Should' Trap",
		content:
			"Depression uses 'should' statements ('I should be working'). This creates guilt. Replace 'should' with 'could' or 'choose'. 'Should' is a shackle; 'choose' is agency. Acknowledge that your capacity today is valid.",
		tags: ["guilt", "self-talk", "reframing", "cbt"],
		minSeverity: 1,
	},
	{
		topic: "Depression",
		title: "Opposite Action",
		content:
			"When an emotion (like sadness or fear) urges you to do something ineffective (like isolate or avoid), do the exact opposite. If you want to stay in bed, stand up. If you want to hide, send one text message.",
		tags: ["dbt", "action", "behavior-change"],
		minSeverity: 2,
	},

	// --- CBT CONCEPTS ---
	{
		topic: "CBT",
		title: "All-or-Nothing Thinking",
		content:
			"Seeing things in binary: perfect or failure, loved or hated. Reality is usually in the gray area. Practice 'Dialectical Thinking': 'I can be struggling right now AND still be making progress.'",
		tags: ["binary-thinking", "perfectionism", "nuance"],
		minSeverity: 1,
	},
	{
		topic: "CBT",
		title: "Emotional Reasoning",
		content:
			"Believing that because you feel something, it must be a fact ('I feel stupid, so I am stupid'). Feelings are real experiences, but they are not always facts about reality. Validate the feeling, then check the facts.",
		tags: ["feelings-vs-facts", "reality-check", "distortion"],
		minSeverity: 1,
	},

	// --- SLEEP ---
	{
		topic: "Sleep",
		title: "The 20-Minute Rule",
		content:
			"If you cannot sleep after 20 minutes, get out of bed. Do a boring, low-light activity (reading a manual, folding clothes) until sleepy. Bed must be associated with sleep, not tossing and turning.",
		tags: ["insomnia", "sleep-hygiene", "rest"],
		minSeverity: 1,
	},
	{
		topic: "Sleep",
		title: "Worry Time",
		content:
			"Schedule 15 minutes in the afternoon to worry. If a worry strikes at night, write it down and say 'I will worry about this tomorrow at 4 PM'. Keep the bedroom for rest.",
		tags: ["worry", "planning", "insomnia"],
		minSeverity: 1,
	},

	// --- SELF-WORTH ---
	{
		topic: "Self-Worth",
		title: "Self-Compassion Break",
		content:
			"In a moment of failure, treat yourself like a friend. 1. Mindfulness: 'This is a moment of suffering.' 2. Common Humanity: 'Suffering is part of life; I am not alone.' 3. Self-Kindness: 'May I be kind to myself.'",
		tags: ["compassion", "failure", "kindness"],
		minSeverity: 1,
	},
	{
		topic: "Self-Worth",
		title: "Imposter Syndrome",
		content:
			"Feeling like a fraud despite success. Reframe: 'I am not an imposter; I am a learner in a new environment.' High achievers feel this because they push boundaries. It is a sign of growth.",
		tags: ["work", "confidence", "growth"],
		minSeverity: 1,
	},

	// --- CRISIS & SAFETY ---
	{
		topic: "Crisis",
		title: "Urge Surfing",
		content:
			"Urges to self-harm or use substances are like waves. They rise, peak, and crash. You do not have to give in; you just have to ride it out. The peak intensity usually lasts only 20-30 minutes.",
		tags: ["addiction", "self-harm", "impulse-control", "safety"],
		minSeverity: 3,
	},
	{
		topic: "Crisis",
		title: "Validating Pain",
		content:
			"Pain is valid. You do not need to fix it immediately. Acknowledge how hard it is right now. Connection precedes correction. You are allowed to not be okay.",
		tags: ["validation", "empathy", "grief"],
		minSeverity: 2,
	},
];

async function seed() {
	console.log(`Seeding ${KNOWLEDGE_BASE.length} KB articles`);

	let count = 0;

	for (const item of KNOWLEDGE_BASE) {
		console.log(`Processing: ${item.title} (Topic: ${item.topic})`);

		try {
			const embeddingVector = await embeddingClient.embed(item.content);

			await db.insert(kbDocs).values({
				title: item.title,
				content: item.content,
				topic: item.topic,
				tags: item.tags,
				minSeverity: item.minSeverity,
				embedding: embeddingVector,
			});

			count++;
		} catch (e) {
			console.error(`❌ Failed to insert ${item.title}:`, e);
		}
	}

	console.log(`✅ Successfully seeded ${count} documents!`);
	process.exit(0);
}

seed().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
