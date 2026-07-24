import { useI18n } from "../i18n/contexto";
import { Boton } from "./Boton";
import estilos from "./TarjetaConfirmacion.module.css";

export interface ParResumen {
  readonly etiqueta: string;
  readonly valor: string;
}

export interface PropiedadesTarjetaConfirmacion {
  readonly titulo: string;
  /** Resumen de la acción propuesta por el agente, como pares etiqueta/valor. */
  readonly resumen: readonly ParResumen[];
  readonly onConfirmar: () => void;
  readonly onCorregir: () => void;
  readonly confirmando?: boolean;
}

/**
 * Componente crítico de seguridad (spec 02-interfaz): la barrera humana
 * antes de ejecutar una acción propuesta por el agente (specs 13 y 17
 * — crear un reporte de falla, ejecutar una acción de conector). La franja
 * usa --andon-ambar porque semánticamente esto ES el estado "pendiente de
 * aprobación" de la tabla de color de la spec.
 *
 * Dos garantías no negociables:
 * 1. Confirmar nunca lleva autoFocus — nada en este componente llama
 *    .focus() ni pasa autoFocus, así que jamás se confirma sin gesto
 *    explícito del usuario (ni por Enter accidental).
 * 2. Corregir y Confirmar están espacialmente separados (ver .acciones en
 *    el CSS module), no uno junto al otro, para que un toque impreciso con
 *    guantes no alcance ambos.
 */
export function TarjetaConfirmacion({ titulo, resumen, onConfirmar, onCorregir, confirmando = false }: PropiedadesTarjetaConfirmacion) {
  const { t } = useI18n();

  return (
    <div className={estilos.tarjeta} role="group" aria-label={titulo}>
      <span className={estilos.franja} aria-hidden="true" />
      <div className={estilos.contenido}>
        <p className={estilos.titulo}>{titulo}</p>
        <dl className={estilos.resumen}>
          {resumen.map((par) => (
            <div className={estilos.par} key={par.etiqueta}>
              <dt className={estilos.etiqueta}>{par.etiqueta}</dt>
              <dd className={estilos.valor}>{par.valor}</dd>
            </div>
          ))}
        </dl>
        <div className={estilos.acciones}>
          <Boton variante="secundario" tamano="operador" onClick={onCorregir} disabled={confirmando}>
            {t("comun.corregir")}
          </Boton>
          <Boton variante="primario" tamano="operador" onClick={onConfirmar} cargando={confirmando}>
            {t("comun.confirmar")}
          </Boton>
        </div>
      </div>
    </div>
  );
}
