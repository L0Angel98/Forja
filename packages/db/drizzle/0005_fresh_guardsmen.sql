CREATE TABLE "failure_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"machine_id" uuid NOT NULL,
	"reportado_por" uuid NOT NULL,
	"sintoma_taxonomia" text,
	"sintoma_otro" text,
	"descripcion" text NOT NULL,
	"severidad" integer NOT NULL,
	"fotos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"origen" text NOT NULL,
	"estado" text DEFAULT 'abierto' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "failure_sensor_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"failure_report_id" uuid NOT NULL,
	"sensor_id" uuid NOT NULL,
	"ventana_inicio" timestamp with time zone NOT NULL,
	"ventana_fin" timestamp with time zone NOT NULL,
	"min" double precision,
	"max" double precision,
	"avg" double precision,
	"last" double precision
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"referencia_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_area" (
	"user_id" uuid NOT NULL,
	"area_id" uuid NOT NULL,
	CONSTRAINT "user_area_user_id_area_id_pk" PRIMARY KEY("user_id","area_id")
);
--> statement-breakpoint
ALTER TABLE "failure_report" ADD CONSTRAINT "failure_report_machine_id_machine_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machine"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failure_report" ADD CONSTRAINT "failure_report_reportado_por_app_user_id_fk" FOREIGN KEY ("reportado_por") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failure_sensor_snapshot" ADD CONSTRAINT "failure_sensor_snapshot_failure_report_id_failure_report_id_fk" FOREIGN KEY ("failure_report_id") REFERENCES "public"."failure_report"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failure_sensor_snapshot" ADD CONSTRAINT "failure_sensor_snapshot_sensor_id_sensor_id_fk" FOREIGN KEY ("sensor_id") REFERENCES "public"."sensor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_area_id_area_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."area"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_area" ADD CONSTRAINT "user_area_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_area" ADD CONSTRAINT "user_area_area_id_area_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."area"("id") ON DELETE no action ON UPDATE no action;