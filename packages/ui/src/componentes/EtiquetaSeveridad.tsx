import type { CSSProperties } from "react";
import { useI18n } from "../i18n/contexto";
import { COLOR_POR_SEVERIDAD, type Severidad } from "../tokens";
import estilos from "./EtiquetaSeveridad.module.css";

export interface PropiedadesEtiquetaSeveridad {
  readonly severidad: Severidad;
}

/** Forma distinta por nivel además del color (daltonismo es común en planta): círculo, triángulo, rombo, octágono. */
function IconoSeveridad({ severidad }: { severidad: Severidad }) {
  switch (severidad) {
    case 1:
      return (
        <svg viewBox="0 0 16 16" className={estilos.icono} aria-hidden="true">
          <circle cx="8" cy="8" r="6" fill="currentColor" />
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 16 16" className={estilos.icono} aria-hidden="true">
          <polygon points="8,1 15,14 1,14" fill="currentColor" />
        </svg>
      );
    case 3:
      return (
        <svg viewBox="0 0 16 16" className={estilos.icono} aria-hidden="true">
          <polygon points="8,1 15,8 8,15 1,8" fill="currentColor" />
        </svg>
      );
    case 4:
      return (
        <svg viewBox="0 0 16 16" className={estilos.icono} aria-hidden="true">
          <polygon points="5,1 11,1 15,5 15,11 11,15 5,15 1,11 1,5" fill="currentColor" />
        </svg>
      );
  }
}

/** Severidad 1-4: color + ícono de forma distinta + etiqueta textual — nunca solo color (spec 02-interfaz). */
export function EtiquetaSeveridad({ severidad }: PropiedadesEtiquetaSeveridad) {
  const { t } = useI18n();
  const clave = `severidad.nivel${severidad}` as const;

  return (
    <span
      className={estilos.etiqueta}
      style={{ "--color-severidad": COLOR_POR_SEVERIDAD[severidad] } as CSSProperties}
    >
      <IconoSeveridad severidad={severidad} />
      {t(clave)}
    </span>
  );
}
