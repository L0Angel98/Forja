"use client";

import { Boton, Campo, EstadoError, Select, Textarea, useI18n, type ContextoI18n, type OpcionSelect } from "@forja/ui";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ErrorApi, solicitarApi } from "../lib/api";
import { usarColaOffline } from "../lib/usar-cola-offline";
import estilos from "./formulario-reportar-falla.module.css";

const SINTOMAS = [
  "ruido_anormal",
  "vibracion_excesiva",
  "fuga",
  "sobrecalentamiento",
  "no_enciende",
  "paro_total",
  "error_sensor",
] as const;

function opcionesSintomas(t: ContextoI18n["t"]): readonly OpcionSelect[] {
  return SINTOMAS.map((sintoma) => ({ valor: sintoma, etiqueta: t(`reportar.sintomas.${sintoma}`) }));
}

function opcionesSeveridad(t: ContextoI18n["t"]): readonly OpcionSelect[] {
  return [1, 2, 3, 4].map((nivel) => ({ valor: String(nivel), etiqueta: t(`severidad.nivel${nivel as 1 | 2 | 3 | 4}`) }));
}

function mensajeErrorReporte(error: unknown, t: ContextoI18n["t"]): string {
  if (error instanceof ErrorApi) {
    if (error.codigo === "MAQUINA_NO_ENCONTRADA") return t("proximamente.descripcion");
    if (error.codigo === "MAQUINA_FUERA_DE_AREA") return t("proximamente.descripcion");
  }
  return t("auth.errorGenerico");
}

export function FormularioReportarFalla() {
  const { t } = useI18n();
  const colaOffline = usarColaOffline();
  const [machineId, setMachineId] = useState("");
  const [sintoma, setSintoma] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [severidad, setSeveridad] = useState("1");
  const [enviado, setEnviado] = useState(false);
  const [guardadoSinConexion, setGuardadoSinConexion] = useState(false);

  const mutacion = useMutation({
    mutationFn: (payload: Record<string, unknown>) => solicitarApi("/api/fallas", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => limpiar(false),
    onError: async (error, payload) => {
      // Sin conexión (fetch nunca llega a responder) ≠ el server rechazó la
      // solicitud (ErrorApi con un código): solo lo primero se encola.
      const sinRed = !(error instanceof ErrorApi);
      if (sinRed || (typeof navigator !== "undefined" && !navigator.onLine)) {
        await colaOffline.encolar(payload);
        limpiar(true);
      }
    },
  });

  function limpiar(sinConexion: boolean): void {
    setEnviado(true);
    setGuardadoSinConexion(sinConexion);
    setMachineId("");
    setSintoma("");
    setDescripcion("");
    setSeveridad("1");
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    setEnviado(false);
    mutacion.mutate({
      machineId,
      sintomaTaxonomia: sintoma || undefined,
      sintomaOtro: sintoma ? undefined : descripcion.slice(0, 500),
      descripcion,
      severidad: Number(severidad),
    });
  }

  return (
    <main className={estilos.pagina}>
      <h1 className={estilos.titulo}>{t("reportar.titulo")}</h1>
      {enviado ? (
        <p className={estilos.exito} role="status">
          {guardadoSinConexion ? t("reportar.guardadoSinConexion") : t("reportar.exito")}
        </p>
      ) : null}
      {colaOffline.pendientes.length > 0 ? (
        <p className={estilos.exito} role="status">
          {colaOffline.pendientes.length}{" "}
          {t(colaOffline.pendientes.length === 1 ? "reportar.pendienteUno" : "reportar.pendienteVarios")}
        </p>
      ) : null}
      <form onSubmit={alEnviar} className={estilos.formulario}>
        <Campo
          etiqueta={t("reportar.maquinaEtiqueta")}
          ayuda={t("reportar.maquinaAyuda")}
          value={machineId}
          onChange={(evento) => setMachineId(evento.target.value)}
          required
        />
        <Select
          etiqueta={t("reportar.sintomaEtiqueta")}
          opciones={opcionesSintomas(t)}
          placeholder={t("comun.buscar")}
          value={sintoma}
          onChange={(evento) => setSintoma(evento.target.value)}
        />
        <Textarea
          etiqueta={t("reportar.descripcionEtiqueta")}
          ayuda={t("reportar.descripcionAyuda")}
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
          required
        />
        <Select
          etiqueta={t("severidad.etiqueta")}
          opciones={opcionesSeveridad(t)}
          value={severidad}
          onChange={(evento) => setSeveridad(evento.target.value)}
        />
        {mutacion.isError && mutacion.error instanceof ErrorApi ? (
          <EstadoError mensaje={mensajeErrorReporte(mutacion.error, t)} />
        ) : null}
        <Boton type="submit" cargando={mutacion.isPending}>
          {t("reportar.enviar")}
        </Boton>
      </form>
    </main>
  );
}
