import { useI18n } from "../i18n/contexto";
import { Boton } from "./Boton";
import estilos from "./EstadoError.module.css";

export interface PropiedadesEstadoError {
  /** Qué pasó, en lenguaje de planta (spec: "Tus datos siguen aquí"). Por defecto usa el título genérico del diccionario. */
  readonly titulo?: string;
  readonly mensaje: string;
  readonly onReintentar?: () => void;
}

/**
 * Estado obligatorio de error (spec 02-interfaz). role="alert" para que
 * lectores de pantalla lo anuncien de inmediato, a diferencia de EstadoVacio
 * (role="status", no urgente).
 */
export function EstadoError({ titulo, mensaje, onReintentar }: PropiedadesEstadoError) {
  const { t } = useI18n();

  return (
    <div className={estilos.contenedor} role="alert">
      <p className={estilos.titulo}>{titulo ?? t("estados.errorTitulo")}</p>
      <p className={estilos.mensaje}>{mensaje}</p>
      {onReintentar ? (
        <Boton variante="secundario" tamano="compacto" onClick={onReintentar}>
          {t("estados.errorAccion")}
        </Boton>
      ) : null}
    </div>
  );
}
