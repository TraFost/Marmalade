import { db } from "../libs/db/db.lib";
import { kbDocs } from "../libs/db/schemas";
import { EmbeddingClient } from "../libs/ai/embedding.client";
import { and, eq } from "drizzle-orm";

const embeddingClient = new EmbeddingClient();

// Severity Mapping for V2:
// 0: Insight / Philosophy (The "Why")
// 1: Coherence (The "What" - naming the pain)
// 2: Agency (The "How" - small moves)
// 3: Stabilization (The "Now" - surviving the spike)
// 4: Preservation (The "Always" - keeping them alive)

const KNOWLEDGE_BASE = [
	// --- STABILIZATION (Surviving the Spike) ---
	{
		topic: "Stabilization",
		title: "Sensory Anchoring",
		content:
			"When the world dissolves, find one solid thing. Do not count to 5. Just find *one* object—a table edge, a cold glass, the floor. Press your hand into it. Feel that it is solid. If that object is real, then you are real. Use the physical world to hold you when your mind cannot.",
		tags: ["grounding", "dissociation", "reality-check", "panic"],
		minSeverity: 3,
	},
	{
		topic: "Stabilization",
		title: "Temperature Reset (The Dive)",
		content:
			"The brain cannot panic if the body thinks it is underwater. If the noise is too loud, splash ice-cold water on your face or hold an ice cube. It is not a trick; it is biology. It forces your heart rate down immediately. Reset the hardware so the software can reboot.",
		tags: ["panic", "physiology", "emergency", "tip-skill"],
		minSeverity: 3,
	},
	{
		topic: "Stabilization",
		title: "The 20-Minute Wave",
		content:
			"Suicidal urges feel permanent, but they are biological waves. Data shows the peak intensity rarely lasts longer than 20 minutes. Your only job right now is to wait 20 minutes. You do not have to solve your life today. You just have to endure this wave. It *will* break.",
		tags: ["urge-surfing", "crisis", "endurance", "time"],
		minSeverity: 4,
	},

	// --- COHERENCE (Validating the Logic of Pain) ---
	{
		topic: "Coherence",
		title: "The Logic of Exhaustion",
		content:
			"You are not 'lazy' or 'broken.' You are functionally exhausted. Your brain is running a high-intensity survival simulation 24/7. Of course you are tired. The numbness you feel is not an absence of life; it is your system engaging an emergency brake to protect you from the fire. Respect the fatigue.",
		tags: ["validation", "fatigue", "numbness", "depression"],
		minSeverity: 1,
	},
	{
		topic: "Coherence",
		title: "The Night Spiral",
		content:
			"At 2 AM, the prefrontal cortex (logic) goes offline, but the amygdala (fear) stays awake. You are literally thinking with a different brain at night. The despair you feel right now is real, but the *conclusion* that 'it will never get better' is a chemical error caused by sleep pressure. Do not trust late-night philosophy.",
		tags: ["sleep", "circadian-rhythm", "night-time", "insomnia"],
		minSeverity: 2,
	},
	{
		topic: "Coherence",
		title: "Grief for the Living",
		content:
			"Sometimes we want to die not because we hate life, but because we are grieving the life we thought we would have. That gap—between expectation and reality—is painful. It is okay to mourn that gap. You are grieving a loss, even if no one died.",
		tags: ["grief", "expectations", "sadness", "reframing"],
		minSeverity: 1,
	},

	// --- AGENCY (Restoring Choice) ---
	{
		topic: "Agency",
		title: "The Micro-Choice",
		content:
			"When you cannot control your future, control one inch of your present. You cannot fix your career today, but you can choose which mug to use. You can choose to sit or stand. Reclaiming agency starts with tiny, almost invisible choices. Prove to yourself that you are still the pilot.",
		tags: ["control", "action", "helplessness", "small-steps"],
		minSeverity: 2,
	},
	{
		topic: "Agency",
		title: "Opposite Action (The Override)",
		content:
			"Depression urges you to hide. Anxiety urges you to run. These are instincts, not commands. You have a manual override switch. If the urge says 'stay in bed,' the override says 'stand up for 10 seconds.' You don't have to enjoy it; you just have to prove you can defy the instinct.",
		tags: ["behavioral-activation", "dbt", "willpower"],
		minSeverity: 2,
	},

	// --- CONTINUITY (The Open Loop) ---
	{
		topic: "Continuity",
		title: "The Unfinished Loop",
		content:
			"The brain hates open loops. You have books you haven't finished reading. Code you haven't deployed. Places you haven't seen. These are not trivial; they are threads tying you to the timeline. Death closes all loops. Staying alive keeps the possibility of the ending open.",
		tags: ["meaning", "curiosity", "future", "purpose"],
		minSeverity: 1,
	},
	{
		topic: "Continuity",
		title: "The Anchor Point",
		content:
			"An anchor is not a dream; it is a duty or a love that holds you here. A pet that needs feeding. A friend who needs a text. A garden that needs water. When you cannot live for yourself, it is valid to live for your anchors. Let them carry the weight for a while.",
		tags: ["responsibility", "connection", "love", "anchors"],
		minSeverity: 3,
	},

	// --- PURPOSE (Existential Meaning) ---
	{
		topic: "Purpose",
		title: "Values vs. Goals",
		content:
			"A goal is 'getting the job.' A value is 'being a creator.' You can fail a goal, but you cannot lose a value. If you lost the job, you are still a creator. Shift your eyes from the lost goal to the enduring value. No circumstance can take your character away from you.",
		tags: ["act", "identity", "failure", "resilience"],
		minSeverity: 0,
	},
	{
		topic: "Purpose",
		title: "Meaning in Suffering",
		content:
			"Suffering is not a sign of failure. It is the price of deep feeling. If you feel pain, it means you are still connected to something you care about. Apathy is the enemy, not pain. Your pain is proof that you still value something.",
		tags: ["logotherapy", "frankl", "meaning", "suffering"],
		minSeverity: 0,
	},
];

async function seed() {
	let count = 0;

	for (const item of KNOWLEDGE_BASE) {
		console.log(`Processing: ${item.title} (Topic: ${item.topic})`);
		try {
			const existing = await db
				.select({ id: kbDocs.id })
				.from(kbDocs)
				.where(and(eq(kbDocs.title, item.title), eq(kbDocs.topic, item.topic)))
				.limit(1);

			if (existing.length > 0) {
				console.log(`⏭️  Skipping existing: ${item.title}`);
				continue;
			}

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
			console.error(`failed to insert ${item.title}:`, e);
		}
	}
	console.log(`Successfully seeded ${count} documents!`);
	process.exit(0);
}

seed().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
