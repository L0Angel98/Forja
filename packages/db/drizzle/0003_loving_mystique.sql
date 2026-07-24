CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"dispositivo_compartido" boolean DEFAULT false NOT NULL,
	"creada_en" timestamp with time zone DEFAULT now() NOT NULL,
	"ultima_actividad_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"ip" text NOT NULL,
	"email" text,
	"user_id" uuid,
	"ocurrido_en" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempt" (
	"ip" text NOT NULL,
	"email" text NOT NULL,
	"intentos_consecutivos" integer NOT NULL,
	"bloqueado_hasta" timestamp with time zone,
	"veces_bloqueado" integer DEFAULT 0 NOT NULL,
	"ultimo_intento_en" timestamp with time zone NOT NULL,
	CONSTRAINT "login_attempt_ip_email_pk" PRIMARY KEY("ip","email")
);
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;