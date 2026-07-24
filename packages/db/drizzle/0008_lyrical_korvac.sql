CREATE TABLE "reading_quarantine" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sensor_external_id" text NOT NULL,
	"payload_crudo" text NOT NULL,
	"motivo" text NOT NULL,
	"ts" timestamp with time zone,
	"recibido_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingest_status" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"lag_ms" integer NOT NULL,
	"buffer_size" integer NOT NULL,
	"actualizado_en" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sensor" ADD COLUMN "mudo_tras_minutos" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "reading" ADD COLUMN "fuera_de_rango" boolean DEFAULT false NOT NULL;