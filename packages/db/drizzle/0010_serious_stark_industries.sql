CREATE TABLE "routine_execution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rutina_nombre" text NOT NULL,
	"plant_id" uuid NOT NULL,
	"iniciada_en" timestamp with time zone NOT NULL,
	"finalizada_en" timestamp with time zone,
	"estado" text NOT NULL,
	"tokens_usados" integer DEFAULT 0 NOT NULL,
	"costo_usd" double precision DEFAULT 0 NOT NULL,
	"salida" text,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "routine_execution" ADD CONSTRAINT "routine_execution_plant_id_plant_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plant"("id") ON DELETE no action ON UPDATE no action;