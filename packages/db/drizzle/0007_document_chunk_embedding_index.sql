-- Custom SQL migration file, put your code below! --
CREATE INDEX IF NOT EXISTS document_chunk_embedding_hnsw_idx
	ON "document_chunk" USING hnsw ("embedding" vector_cosine_ops);
