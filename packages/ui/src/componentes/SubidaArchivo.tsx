import { useRef, type ChangeEvent } from "react";
import { useI18n } from "../i18n/contexto";
import { Boton } from "./Boton";
import estilos from "./SubidaArchivo.module.css";

export type EstadoSubidaArchivo = "inactivo" | "subiendo" | "error" | "completado";

export interface PropiedadesSubidaArchivo {
  readonly onSeleccionar: (archivo: File) => void;
  readonly estado?: EstadoSubidaArchivo;
  /** 0–100, relevante mientras estado es "subiendo". */
  readonly progreso?: number;
  readonly nombreArchivo?: string;
  readonly onReintentar?: () => void;
  readonly onQuitar?: () => void;
  readonly aceptar?: string;
}

/**
 * Dos puntos de entrada (spec 02-interfaz: "cámara directa en tablet"):
 * "Tomar foto" usa capture="environment" para abrir la cámara directamente
 * en tablet/teléfono; "Elegir archivo" abre el selector normal (galería,
 * archivos). Ambos son <input type="file"> ocultos disparados por un
 * <Boton> de 56px — el input nativo por sí solo no cumple el touch target.
 */
export function SubidaArchivo({
  onSeleccionar,
  estado = "inactivo",
  progreso = 0,
  nombreArchivo,
  onReintentar,
  onQuitar,
  aceptar = "image/*",
}: PropiedadesSubidaArchivo) {
  const { t } = useI18n();
  const inputCamaraRef = useRef<HTMLInputElement>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  function alSeleccionarArchivo(evento: ChangeEvent<HTMLInputElement>): void {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (archivo) onSeleccionar(archivo);
  }

  if (estado === "inactivo") {
    return (
      <div className={estilos.contenedor}>
        <div className={estilos.acciones}>
          <input
            ref={inputCamaraRef}
            type="file"
            accept={aceptar}
            capture="environment"
            className={estilos.entradaOculta}
            onChange={alSeleccionarArchivo}
          />
          <Boton type="button" onClick={() => inputCamaraRef.current?.click()}>
            {t("subidaArchivo.tomarFoto")}
          </Boton>

          <input ref={inputArchivoRef} type="file" accept={aceptar} className={estilos.entradaOculta} onChange={alSeleccionarArchivo} />
          <Boton type="button" variante="secundario" onClick={() => inputArchivoRef.current?.click()}>
            {t("subidaArchivo.elegirArchivo")}
          </Boton>
        </div>
      </div>
    );
  }

  return (
    <div className={estilos.contenedor}>
      <div className={estilos.estadoArchivo} role={estado === "error" ? "alert" : "status"}>
        <span className={estilos.nombre}>{nombreArchivo}</span>
        {estado === "subiendo" ? (
          <progress className={estilos.progreso} value={progreso} max={100} aria-label={t("subidaArchivo.subiendo")} />
        ) : null}
        {estado === "error" ? <span className={estilos.mensajeError}>{t("subidaArchivo.fallo")}</span> : null}
        <div className={estilos.acciones}>
          {estado === "error" && onReintentar ? (
            <Boton variante="secundario" tamano="compacto" onClick={onReintentar}>
              {t("comun.reintentar")}
            </Boton>
          ) : null}
          {onQuitar ? (
            <Boton variante="peligro" tamano="compacto" onClick={onQuitar}>
              {t("subidaArchivo.quitar")}
            </Boton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
