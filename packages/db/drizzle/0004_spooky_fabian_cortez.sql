CREATE TABLE "memory_suggestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contenido" text NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"propuesta_en" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "detalle" jsonb;