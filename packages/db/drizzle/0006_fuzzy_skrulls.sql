CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"tipo_archivo" text NOT NULL,
	"ruta_almacenada" text NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"documento_anterior_id" uuid,
	"vigente" boolean DEFAULT true NOT NULL,
	"estado_indexacion" text DEFAULT 'pendiente' NOT NULL,
	"subido_por" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_machine" (
	"document_id" uuid NOT NULL,
	"machine_id" uuid NOT NULL,
	CONSTRAINT "document_machine_document_id_machine_id_pk" PRIMARY KEY("document_id","machine_id")
);
--> statement-breakpoint
CREATE TABLE "document_area" (
	"document_id" uuid NOT NULL,
	"area_id" uuid NOT NULL,
	CONSTRAINT "document_area_document_id_area_id_pk" PRIMARY KEY("document_id","area_id")
);
--> statement-breakpoint
CREATE TABLE "document_machine_family" (
	"document_id" uuid NOT NULL,
	"machine_family_id" uuid NOT NULL,
	CONSTRAINT "document_machine_family_document_id_machine_family_id_pk" PRIMARY KEY("document_id","machine_family_id")
);
--> statement-breakpoint
CREATE TABLE "document_chunk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"indice" integer NOT NULL,
	"contenido" text NOT NULL,
	"seccion" text,
	"pagina" integer,
	"embedding" vector(1536) NOT NULL,
	"vigente" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "response_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trace_id" uuid NOT NULL,
	"util" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_documento_anterior_id_document_id_fk" FOREIGN KEY ("documento_anterior_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_subido_por_app_user_id_fk" FOREIGN KEY ("subido_por") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_machine" ADD CONSTRAINT "document_machine_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_machine" ADD CONSTRAINT "document_machine_machine_id_machine_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_area" ADD CONSTRAINT "document_area_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_area" ADD CONSTRAINT "document_area_area_id_area_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."area"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_machine_family" ADD CONSTRAINT "document_machine_family_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_machine_family" ADD CONSTRAINT "document_machine_family_machine_family_id_machine_family_id_fk" FOREIGN KEY ("machine_family_id") REFERENCES "public"."machine_family"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunk" ADD CONSTRAINT "document_chunk_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_feedback" ADD CONSTRAINT "response_feedback_trace_id_agent_trace_id_fk" FOREIGN KEY ("trace_id") REFERENCES "public"."agent_trace"("id") ON DELETE no action ON UPDATE no action;