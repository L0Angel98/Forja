"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { solicitarApi } from "./api";
import { eliminarPendiente, encolarReporte, listarPendientes, type ReportePendiente } from "./cola-offline";

const BACKOFF_INICIAL_MS = 2_000;
const BACKOFF_MAXIMO_MS = 60_000;

/**
 * Sincroniza la cola de reportes offline al reconectar, con reintento y
 * backoff exponencial (spec 02-interfaz: "Reconexión: reintento con
 * backoff, sin recargar la página ni perder lo escrito"). Si un reporte
 * falla al reenviarse (el server sigue sin responder), se reintenta con
 * espera creciente en vez de machacar la red; al ver network otra vez el
 * backoff se reinicia.
 */
export function usarColaOffline() {
  const [pendientes, setPendientes] = useState<readonly ReportePendiente[]>([]);
  const backoffRef = useRef(BACKOFF_INICIAL_MS);

  const refrescar = useCallback(async () => {
    setPendientes(await listarPendientes());
  }, []);

  useEffect(() => {
    void refrescar();
  }, [refrescar]);

  useEffect(() => {
    let cancelado = false;
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    async function sincronizar(): Promise<void> {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      const items = await listarPendientes();
      if (items.length === 0) {
        backoffRef.current = BACKOFF_INICIAL_MS;
        return;
      }

      let huboFallo = false;
      for (const item of items) {
        try {
          await solicitarApi("/api/fallas", { method: "POST", body: JSON.stringify(item.payload) });
          await eliminarPendiente(item.id);
        } catch {
          huboFallo = true;
        }
      }

      if (!cancelado) await refrescar();

      if (huboFallo) {
        backoffRef.current = Math.min(backoffRef.current * 2, BACKOFF_MAXIMO_MS);
        if (!cancelado) temporizador = setTimeout(() => void sincronizar(), backoffRef.current);
      } else {
        backoffRef.current = BACKOFF_INICIAL_MS;
      }
    }

    function alReconectar(): void {
      backoffRef.current = BACKOFF_INICIAL_MS;
      void sincronizar();
    }

    window.addEventListener("online", alReconectar);
    void sincronizar();

    return () => {
      cancelado = true;
      window.removeEventListener("online", alReconectar);
      if (temporizador) clearTimeout(temporizador);
    };
  }, [refrescar]);

  const encolar = useCallback(
    async (payload: Record<string, unknown>) => {
      const pendiente = await encolarReporte(payload);
      await refrescar();
      return pendiente;
    },
    [refrescar],
  );

  return { pendientes, encolar };
}
