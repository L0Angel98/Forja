import { forwardRef, type ButtonHTMLAttributes } from "react";
import estilos from "./Boton.module.css";
import { combinarClases } from "../utils/combinar-clases";

export type VarianteBoton = "primario" | "secundario" | "peligro";
export type TamanoBoton = "operador" | "compacto";

export interface PropiedadesBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variante?: VarianteBoton;
  /** "operador" (por defecto) respeta el touch target mínimo de 56px; "compacto" es solo para shells de escritorio. */
  readonly tamano?: TamanoBoton;
  readonly cargando?: boolean;
}

export const Boton = forwardRef<HTMLButtonElement, PropiedadesBoton>(function Boton(
  { variante = "primario", tamano = "operador", cargando = false, disabled, className, children, type = "button", ...resto },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={combinarClases(estilos.boton, estilos[variante], estilos[tamano], className)}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...resto}
    >
      {cargando ? <span className={estilos.spinner} aria-hidden="true" /> : null}
      {children}
    </button>
  );
});
