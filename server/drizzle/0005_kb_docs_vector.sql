-- Migrate kb_docs.embedding to vector(768) and add index
ALTER TABLE "kb_docs"
    ALTER COLUMN "embedding" TYPE vector(768)
    USING CASE
        WHEN "embedding" IS NULL THEN NULL
        WHEN trim("embedding") = '' THEN NULL
        ELSE "embedding"::vector(768)
    END;

CREATE INDEX IF NOT EXISTS "kb_docs_embedding_cosine_idx"
    ON "kb_docs"
    USING ivfflat ("embedding" vector_cosine_ops)
    WITH (lists = 100);
