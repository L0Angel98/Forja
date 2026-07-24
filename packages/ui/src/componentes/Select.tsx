import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from "react";
import estilos from "./Campo.module.css";
import { combinarClases } from "../utils/combinar-clases";

export interface OpcionSelect {
  readonly valor: string;
  readonly etiqueta: string;
}

export interface PropiedadesSelect extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "children"> {
  readonly etiqueta: string;
  readonly opciones: readonly OpcionSelect[];
  readonly ayuda?: string;
  readonly error?: string;
  readonly placeholder?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, PropiedadesSelect>(function Select(
  { etiqueta, opciones, ayuda, error, placeholder, className, "aria-describedby": ariaDescribedByExterno, ...resto },
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
      <select
        ref={ref}
        id={id}
        className={combinarClases(estilos.entrada, error && estilos.entradaInvalida, className)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        {...resto}
      >
        {placeholder !== undefined ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
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
