import type { CSSProperties, ReactNode } from "react";
import { colores } from "../tokens";
import estilos from "./EtiquetaEstado.module.css";

export type TonoEstado = "verde" | "ambar" | "naranja" | "rojo" | "neutro";

const COLOR_POR_TONO: Record<TonoEstado, string> = {
  verde: colores.andonVerde,
  ambar: colores.andonAmbar,
  naranja: colores.andonNaranja,
  rojo: colores.andonRojo,
  neutro: colores.acero300,
};

export interface PropiedadesEtiquetaEstado {
  readonly tono: TonoEstado;
  readonly children: ReactNode;
}

/**
 * Badge genérico de estado (color + punto + texto). No conoce estados de
 * dominio (falla, máquina, conector...): quien la usa decide el tono y el
 * texto ya traducido — así se reutiliza para cualquier estado sin acoplar
 * este átomo a un diccionario de i18n en particular.
 */
export function EtiquetaEstado({ tono, children }: PropiedadesEtiquetaEstado) {
  return (
    <span className={estilos.etiqueta} style={{ "--color-tono": COLOR_POR_TONO[tono] } as CSSProperties}>
      <span className={estilos.punto} aria-hidden="true" />
      {children}
    </span>
  );
}
