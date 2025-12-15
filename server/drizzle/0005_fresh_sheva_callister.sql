ALTER TABLE "kb_docs"
ALTER COLUMN "embedding"
SET DATA TYPE vector(768)
USING embedding::vector(768);--> statement-breakpoint
ALTER TABLE "kb_docs" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "kb_docs" ADD COLUMN "min_severity" integer DEFAULT 0;