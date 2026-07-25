"use client";

import { Chat, EstadoError, useI18n, type MensajeChat } from "@forja/ui";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { solicitarApi } from "../lib/api";
import { usarEnLinea } from "../lib/usar-en-linea";

interface RespuestaChat {
  readonly respuesta: string;
  readonly exitoso: boolean;
}

interface MensajeHistorial {
  readonly rol: "usuario" | "agente";
  readonly contenido: string;
}

/**
 * El backend de /api/chat (spec 13/17) responde con un único JSON, no con
 * SSE token a token — así que aquí no se simula streaming falso: el texto
 * del agente aparece completo cuando llega la respuesta. El mecanismo de
 * anuncio incremental de <Chat> sigue sirviendo (evita que el lector de
 * pantalla repita el mensaje si el texto se actualizara), simplemente no
 * hay múltiples actualizaciones parciales que anunciar en este caso.
 */
export function ChatOperador() {
  const { t } = useI18n();
  const enLinea = usarEnLinea();
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [degradado, setDegradado] = useState(false);
  const contadorRef = useRef(0);

  const mutacion = useMutation({
    mutationFn: (payload: { texto: string; historial: readonly MensajeHistorial[] }) =>
      solicitarApi<RespuestaChat>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ mensaje: payload.texto, historial: payload.historial }),
      }),
  });

  function alEnviar(texto: string): void {
    const historial: MensajeHistorial[] = mensajes.map((mensaje) => ({
      rol: mensaje.rol,
      contenido: mensaje.texto,
    }));

    contadorRef.current += 1;
    const idUsuario = `usuario-${contadorRef.current}`;
    setMensajes((previos) => [...previos, { id: idUsuario, rol: "usuario", texto }]);

    mutacion.mutate(
      { texto, historial },
      {
        onSuccess: (respuesta) => {
          contadorRef.current += 1;
          const idAgente = `agente-${contadorRef.current}`;
          setMensajes((previos) => [...previos, { id: idAgente, rol: "agente", texto: respuesta.respuesta }]);
          // exitoso: false = el LLM no respondió (no configurado, caído, error del
          // proveedor) — el turno igual devuelve 200 con un mensaje de fallback
          // (packages/runtime/src/loop-agente.ts), así que el chat se ve
          // "normal"; el banner discreto es lo que deja claro que está degradado.
          if (!respuesta.exitoso) setDegradado(true);
        },
      },
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {!enLinea ? <EstadoError mensaje={t("chat.sinConexion")} /> : null}
      {enLinea && degradado ? <EstadoError mensaje={t("chat.degradado")} /> : null}
      {enLinea && !degradado && mutacion.isError ? (
        <EstadoError mensaje={t("chat.errorEnvio")} onReintentar={() => mutacion.reset()} />
      ) : null}
      <Chat mensajes={mensajes} onEnviar={alEnviar} deshabilitado={!enLinea || mutacion.isPending} />
    </div>
  );
}
