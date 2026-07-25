"use client";

import { Chat, EstadoError, useI18n, type MensajeChat } from "@forja/ui";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { solicitarApi } from "../lib/api";

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
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
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
        },
      },
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {mutacion.isError ? <EstadoError mensaje={t("chat.errorEnvio")} onReintentar={() => mutacion.reset()} /> : null}
      <Chat mensajes={mensajes} onEnviar={alEnviar} deshabilitado={mutacion.isPending} />
    </div>
  );
}
