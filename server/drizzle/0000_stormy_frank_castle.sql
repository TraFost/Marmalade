CREATE TYPE "public"."memory_doc_type" AS ENUM('session_summary', 'long_summary', 'coping_insight', 'life_anchor', 'unfinished_loop', 'phenomenology_probe', 'goal', 'pain_qualia');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."conversation_mood" AS ENUM('unknown', 'calm', 'sad', 'anxious', 'angry', 'numb', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."screening_age_range" AS ENUM('16-20', '20-30', '30-40', '40-50', '50-60', '60+');--> statement-breakpoint
CREATE TYPE "public"."screening_gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."screening_medication_status" AS ENUM('regular', 'sometimes', 'none');--> statement-breakpoint
CREATE TYPE "public"."screening_risk_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."screening_severity" AS ENUM('normal', 'mild', 'moderate', 'severe', 'extremely_severe');--> statement-breakpoint
CREATE TYPE "public"."screening_sleep_quality" AS ENUM('ideal', 'good', 'acceptable', 'not_enough', 'critically_low', 'no_sleep_mode');--> statement-breakpoint
CREATE TYPE "public"."screening_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."voice_mode" AS ENUM('comfort', 'coach', 'educational', 'crisis');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
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
	"tags" text[],
	"min_severity" integer DEFAULT 0,
	"embedding" vector(768),
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
CREATE TABLE "screenings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" "screening_status" DEFAULT 'in_progress' NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"gender" "screening_gender",
	"age_range" "screening_age_range",
	"sleep_quality" "screening_sleep_quality",
	"medication_status" "screening_medication_status",
	"medication_notes" text,
	"happiness_score" integer,
	"positive_sources" text[],
	"qd_flat_joy" integer,
	"qd_motivation" integer,
	"qd_physical_anxiety" integer,
	"qd_worry" integer,
	"qd_rest" integer,
	"qd_irritability" integer,
	"dass_depression" integer,
	"dass_anxiety" integer,
	"dass_stress" integer,
	"dass_depression_level" "screening_severity",
	"dass_anxiety_level" "screening_severity",
	"dass_stress_level" "screening_severity",
	"has_seen_psychologist" boolean,
	"goals" text[],
	"risk_level" "screening_risk_level",
	"risk_reason" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_memory_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"type" "memory_doc_type" NOT NULL,
	"embedding" vector(768),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_state" ADD CONSTRAINT "conversation_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_voice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."voice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_logs" ADD CONSTRAINT "risk_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_logs" ADD CONSTRAINT "risk_logs_session_id_voice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."voice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_memory_docs" ADD CONSTRAINT "user_memory_docs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_memory_docs" ADD CONSTRAINT "user_memory_docs_session_id_voice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."voice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_summary_doc_id_user_memory_docs_id_fk" FOREIGN KEY ("summary_doc_id") REFERENCES "public"."user_memory_docs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");