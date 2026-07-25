/**
 * Design tokens (spec 02-interfaz). Fuente de verdad en TypeScript; el
 * archivo `tokens.css` expone exactamente los mismos valores como
 * variables CSS (verificado por un test que compara ambos, para que no
 * se desincronicen). Ningún componente usa colores/medidas literales:
 * todo pasa por aquí o por `var(--token)`.
 */

export const colores = {
  acero900: "#14181D",
  acero700: "#242C35",
  acero300: "#8A97A6",
  acero050: "#EEF2F6",
  andonVerde: "#1F9D55",
  andonAmbar: "#E0A200",
  /**
   * No está en la tabla de tokens de la spec, pero la severidad 1-4 pide
   * explícitamente "verde → ámbar → naranja → rojo" (4 paradas de color
   * distintas): se extiende la paleta con este tono intermedio entre
   * andonAmbar y andonRojo en vez de reutilizar uno de los dos para dos
   * niveles de severidad distintos.
   */
  andonNaranja: "#D9631E",
  andonRojo: "#D0342C",
  /**
   * La spec da `#2D6FD1` literal para señal azul, pero ese valor exacto
   * mide 4.33:1 contra acero-050 (Boton primario, burbuja de usuario en
   * Chat) — no llega al 4.5:1 que la misma spec exige como no negociable.
   * Se oscurece ligeramente (mismo tono, -3% de luminosidad) hasta 4.5:1+
   * real: la regla de contraste gana sobre el swatch literal.
   */
  senalAzul: "#2A68C4",
  /**
   * Variante clara del mismo tono, solo para texto/ícono de señal azul
   * sobre fondo oscuro (acero-900) — p. ej. el destino activo del nav
   * inferior. `senalAzul` (pensado para fondo claro) mide 3.65:1 ahí; esta
   * variante mide 4.75:1+.
   */
  senalAzulClaro: "#4C84D8",
} as const;

export const tipografia = {
  familiaDisplay: '"Inter Tight", system-ui, sans-serif',
  familiaMono: '"JetBrains Mono", ui-monospace, monospace',
  escala: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    operador: "1.125rem",
    lg: "1.375rem",
    xl: "1.75rem",
    xxl: "2.25rem",
  },
  interlineaCuerpo: "1.5",
  interlineaTitulo: "1.2",
} as const;

export const espaciado = {
  px4: "4px",
  px8: "8px",
  px12: "12px",
  px16: "16px",
  px24: "24px",
  px32: "32px",
  px48: "48px",
  px64: "64px",
} as const;

export const radios = {
  control: "4px",
  tarjeta: "8px",
} as const;

/** Touch target mínimo en vistas de operador (guantes), separación mínima 12px (espaciado.px12). */
export const TOUCH_TARGET_MINIMO = "56px";

/** Ancho de la franja andon de estado (TarjetaMaquina y similares). */
export const ANCHO_FRANJA_ANDON = "6px";

export const SEVERIDADES = [1, 2, 3, 4] as const;
export type Severidad = (typeof SEVERIDADES)[number];

export const COLOR_POR_SEVERIDAD: Record<Severidad, string> = {
  1: colores.andonVerde,
  2: colores.andonAmbar,
  3: colores.andonNaranja,
  4: colores.andonRojo,
};
