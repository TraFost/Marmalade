ALTER TABLE "user_memory_docs" ALTER COLUMN "embedding" TYPE vector(768) USING embedding::vector;

CREATE INDEX IF NOT EXISTS "user_memory_docs_embedding_cosine_idx"
ON "user_memory_docs"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);