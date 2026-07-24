import type { CSSProperties, ReactNode } from "react";
import { useI18n } from "../i18n/contexto";
import { colores } from "../tokens";
import { combinarClases } from "../utils/combinar-clases";
import { EtiquetaEstado, type TonoEstado } from "./EtiquetaEstado";
import estilos from "./TarjetaMaquina.module.css";

export const ESTADOS_MAQUINA = ["operativa", "enFalla", "enMantenimiento", "sensorMudo"] as const;
export type EstadoMaquina = (typeof ESTADOS_MAQUINA)[number];

const TONO_POR_ESTADO_MAQUINA: Record<EstadoMaquina, TonoEstado> = {
  operativa: "verde",
  enFalla: "rojo",
  enMantenimiento: "ambar",
  sensorMudo: "ambar",
};

const COLOR_POR_TONO: Record<TonoEstado, string> = {
  verde: colores.andonVerde,
  ambar: colores.andonAmbar,
  naranja: colores.andonNaranja,
  rojo: colores.andonRojo,
  neutro: colores.acero300,
};

export interface PropiedadesTarjetaMaquina {
  /** Tag de equipo (p. ej. "PRE-03"): se muestra en JetBrains Mono, identidad de planta. */
  readonly tag: string;
  readonly nombre: string;
  readonly estado: EstadoMaquina;
  readonly children?: ReactNode;
  readonly onClick?: () => void;
}

/**
 * Franja andon de 6px a la izquierda con el color del estado — mismo
 * lenguaje que la torreta física sobre la máquina (spec 02-interfaz). Es
 * clicable (elemento <button>) solo si se pasa onClick.
 */
export function TarjetaMaquina({ tag, nombre, estado, children, onClick }: PropiedadesTarjetaMaquina) {
  const { t } = useI18n();
  const tono = TONO_POR_ESTADO_MAQUINA[estado];
  const Elemento = onClick ? "button" : "div";

  return (
    <Elemento
      className={combinarClases(estilos.tarjeta, onClick && estilos.clicable)}
      style={{ "--color-franja": COLOR_POR_TONO[tono] } as CSSProperties}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      <span className={estilos.franja} aria-hidden="true" />
      <span className={estilos.contenido}>
        <span className={estilos.encabezado}>
          <span className={combinarClases(estilos.tag, "forja-mono")}>{tag}</span>
          <EtiquetaEstado tono={tono}>{t(`estadoMaquina.${estado}`)}</EtiquetaEstado>
        </span>
        <span className={estilos.nombre}>{nombre}</span>
        {children}
      </span>
    </Elemento>
  );
}
