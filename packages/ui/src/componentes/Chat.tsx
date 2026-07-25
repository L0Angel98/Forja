import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useI18n } from "../i18n/contexto";
import { combinarClases } from "../utils/combinar-clases";
import { Boton } from "./Boton";
import estilos from "./Chat.module.css";

export type RolMensajeChat = "usuario" | "agente";

export interface CitaChat {
  readonly id: string;
  readonly etiqueta: string;
  readonly onClick: () => void;
}

export interface MensajeChat {
  readonly id: string;
  readonly rol: RolMensajeChat;
  readonly texto: string;
  readonly citas?: readonly CitaChat[];
}

export interface HerramientaEnEjecucionChat {
  /** Texto ya resuelto por quien la usa, p. ej. "Consultando sensores…" — Chat no conoce nombres de herramientas de dominio. */
  readonly etiqueta: string;
}

export interface PropiedadesChat {
  readonly mensajes: readonly MensajeChat[];
  readonly herramientaEnEjecucion?: HerramientaEnEjecucionChat | null;
  readonly onEnviar: (texto: string) => void;
  readonly deshabilitado?: boolean;
}

/**
 * Devuelve solo los fragmentos *nuevos* de `texto` a medida que crece
 * (streaming token a token), para alimentar una región aria-live que
 * anuncia lo nuevo sin repetir el mensaje completo en cada actualización
 * (spec 02-interfaz, casos de uso).
 */
function useFragmentosAnunciados(texto: string): readonly string[] {
  const anteriorRef = useRef("");
  const [fragmentos, setFragmentos] = useState<readonly string[]>([]);

  useEffect(() => {
    const anterior = anteriorRef.current;
    if (texto === anterior) return;
    const fragmento = texto.startsWith(anterior) ? texto.slice(anterior.length) : texto;
    anteriorRef.current = texto;
    if (fragmento) {
      setFragmentos((previos) => [...previos, fragmento]);
    }
  }, [texto]);

  return fragmentos;
}

function BurbujaMensaje({ mensaje }: { readonly mensaje: MensajeChat }) {
  const { t } = useI18n();
  const fragmentos = useFragmentosAnunciados(mensaje.texto);
  const esUsuario = mensaje.rol === "usuario";

  return (
    <li className={combinarClases(estilos.fila, esUsuario ? estilos.filaUsuario : estilos.filaAgente)}>
      <span className={estilos.remitente}>{t(esUsuario ? "chat.remitenteUsuario" : "chat.remitenteAgente")}</span>
      <div className={combinarClases(estilos.burbuja, esUsuario ? estilos.burbujaUsuario : estilos.burbujaAgente)}>
        <p className={estilos.texto}>{mensaje.texto}</p>
        {!esUsuario ? (
          <div className={estilos.soloLector} aria-live="polite" aria-atomic="false">
            {fragmentos.map((fragmento, indice) => (
              <span key={indice}>{fragmento}</span>
            ))}
          </div>
        ) : null}
        {mensaje.citas && mensaje.citas.length > 0 ? (
          <ul className={estilos.citas}>
            {mensaje.citas.map((cita) => (
              <li key={cita.id}>
                <button type="button" className={estilos.chipCita} onClick={cita.onClick}>
                  {cita.etiqueta}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

export function Chat({ mensajes, herramientaEnEjecucion, onEnviar, deshabilitado = false }: PropiedadesChat) {
  const { t } = useI18n();
  const [borrador, setBorrador] = useState("");

  function enviar(): void {
    const texto = borrador.trim();
    if (!texto || deshabilitado) return;
    onEnviar(texto);
    setBorrador("");
  }

  function alEnviarFormulario(evento: FormEvent<HTMLFormElement>): void {
    evento.preventDefault();
    enviar();
  }

  function alPresionarTecla(evento: KeyboardEvent<HTMLTextAreaElement>): void {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      enviar();
    }
  }

  return (
    <div className={estilos.chat}>
      <ul className={estilos.lista}>
        {mensajes.map((mensaje) => (
          <BurbujaMensaje key={mensaje.id} mensaje={mensaje} />
        ))}
      </ul>
      {herramientaEnEjecucion ? (
        <p className={estilos.herramienta} role="status">
          {herramientaEnEjecucion.etiqueta}
        </p>
      ) : null}
      <form className={estilos.compositor} onSubmit={alEnviarFormulario}>
        <textarea
          className={estilos.entrada}
          value={borrador}
          onChange={(evento) => setBorrador(evento.target.value)}
          onKeyDown={alPresionarTecla}
          placeholder={t("chat.placeholder")}
          aria-label={t("chat.placeholder")}
          disabled={deshabilitado}
          rows={1}
        />
        <Boton type="submit" disabled={deshabilitado || borrador.trim().length === 0}>
          {t("comun.enviar")}
        </Boton>
      </form>
    </div>
  );
}
