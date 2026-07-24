import { forwardRef, useId, type InputHTMLAttributes } from "react";
import estilos from "./Campo.module.css";
import { combinarClases } from "../utils/combinar-clases";

export interface PropiedadesCampo extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  readonly etiqueta: string;
  readonly ayuda?: string;
  readonly error?: string;
}

export const Campo = forwardRef<HTMLInputElement, PropiedadesCampo>(function Campo(
  { etiqueta, ayuda, error, className, "aria-describedby": ariaDescribedByExterno, ...resto },
  ref,
) {
  const idGenerado = useId();
  const id = resto.name ?? idGenerado;
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;
  const describedBy = [ariaDescribedByExterno, idAyuda, idError].filter(Boolean).join(" ") || undefined;

  return (
    <div className={estilos.contenedor}>
      <label htmlFor={id} className={estilos.etiqueta}>
        {etiqueta}
      </label>
      <input
        ref={ref}
        id={id}
        className={combinarClases(estilos.entrada, error && estilos.entradaInvalida, className)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        {...resto}
      />
      {ayuda ? (
        <span id={idAyuda} className={estilos.ayuda}>
          {ayuda}
        </span>
      ) : null}
      {error ? (
        <span id={idError} className={estilos.error} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
});
