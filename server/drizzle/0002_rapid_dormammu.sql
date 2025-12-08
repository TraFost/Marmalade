CREATE TYPE "conversation_mood" AS ENUM ('unknown', 'calm', 'sad', 'anxious', 'angry', 'numb', 'mixed');
--> statement-breakpoint
CREATE TYPE "message_role" AS ENUM ('user', 'assistant');
--> statement-breakpoint
CREATE TYPE "voice_mode" AS ENUM ('comfort', 'coach', 'educational', 'crisis');
--> statement-breakpoint
CREATE TYPE "memory_doc_type" AS ENUM ('session_summary', 'long_summary', 'coping_insight');
--> statement-breakpoint
CREATE TYPE "screening_status" AS ENUM ('in_progress', 'completed');
--> statement-breakpoint
CREATE TYPE "screening_gender" AS ENUM ('male', 'female', 'other');
--> statement-breakpoint
CREATE TYPE "screening_age_range" AS ENUM ('16-20', '20-30', '30-40', '40-50', '50-60', '60+');
--> statement-breakpoint
CREATE TYPE "screening_sleep_quality" AS ENUM ('ideal', 'good', 'acceptable', 'not_enough', 'critically_low', 'no_sleep_mode');
--> statement-breakpoint
CREATE TYPE "screening_medication_status" AS ENUM ('regular', 'sometimes', 'none');
--> statement-breakpoint
CREATE TYPE "screening_severity" AS ENUM ('normal', 'mild', 'moderate', 'severe', 'extremely_severe');
--> statement-breakpoint
CREATE TYPE "screening_risk_level" AS ENUM ('low', 'medium', 'high');
--> statement-breakpoint

CREATE TABLE "conversation_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"summary" text,
	"mood" "conversation_mood" DEFAULT 'unknown' NOT NULL,
	"risk_level" integer DEFAULT 0 NOT NULL,
	"last_themes" text[],
	"baseline_depression" integer,
	"baseline_anxiety" integer,
	"baseline_stress" integer,
	"preferences" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"topic" text,
	"embedding" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"raw_audio_ref" text,
	"metadata" jsonb,
	"voice_mode" "voice_mode",
	"risk_at_turn" smallint DEFAULT 0 NOT NULL,
	"themes" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"risk_level" smallint NOT NULL,
	"mood" "conversation_mood",
	"themes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_memory_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"type" "memory_doc_type" NOT NULL,
	"embedding" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"max_risk_level" integer DEFAULT 0 NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"duration_seconds" integer,
	"audio_url" text,
	"summary_doc_id" uuid
);
--> statement-breakpoint
ALTER TABLE "screenings" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "screenings" ALTER COLUMN "status" SET DATA TYPE "public"."screening_status" USING "status"::"public"."screening_status";--> statement-breakpoint
ALTER TABLE "screenings" ALTER COLUMN "status" SET DEFAULT 'in_progress';--> statement-breakpoint
ALTER TABLE "screenings" ALTER COLUMN "gender" SET DATA TYPE "public"."screening_gender" USING "gender"::"public"."screening_gender";--> statement-breakpoint
ALTER TABLE "screenings" ALTER COLUMN "age_range" SET DATA TYPE "public"."screening_age_range" USING "age_range"::"public"."screening_age_range";--> statement-breakpoint
ALTER TABLE "screenings" ALTER COLUMN "sleep_quality" SET DATA TYPE "public"."screening_sleep_quality" USING "sleep_quality"::"public"."screening_sleep_quality";--> statement-breakpoint
ALTER TABLE "screenings" ALTER COLUMN "medication_status" SET DATA TYPE "public"."screening_medication_status" USING "medication_status"::"public"."screening_medication_status";--> statement-breakpoint
ALTER TABLE "screenings" ALTER COLUMN "dass_depression_level" SET DATA TYPE "public"."screening_severity" USING "dass_depression_level"::"public"."screening_severity";--> statement-breakpoint
ALTER TABLE "screenings" ALTER COLUMN "dass_anxiety_level" SET DATA TYPE "public"."screening_severity" USING "dass_anxiety_level"::"public"."screening_severity";--> statement-breakpoint
ALTER TABLE "screenings" ALTER COLUMN "dass_stress_level" SET DATA TYPE "public"."screening_severity" USING "dass_stress_level"::"public"."screening_severity";--> statement-breakpoint
ALTER TABLE "screenings" ALTER COLUMN "risk_level" SET DATA TYPE "public"."screening_risk_level" USING "risk_level"::"public"."screening_risk_level";--> statement-breakpoint
ALTER TABLE "conversation_state" ADD CONSTRAINT "conversation_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_voice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."voice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_logs" ADD CONSTRAINT "risk_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_logs" ADD CONSTRAINT "risk_logs_session_id_voice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."voice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_memory_docs" ADD CONSTRAINT "user_memory_docs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_summary_doc_id_user_memory_docs_id_fk" FOREIGN KEY ("summary_doc_id") REFERENCES "public"."user_memory_docs"("id") ON DELETE set null ON UPDATE no action;