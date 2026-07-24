import { Boton } from "./Boton";
import estilos from "./EstadoVacio.module.css";

export interface AccionEstado {
  readonly etiqueta: string;
  readonly onClick: () => void;
}

export interface PropiedadesEstadoVacio {
  /** Dice qué es esto (spec: "Sin reportes esta semana"). */
  readonly titulo: string;
  readonly descripcion?: string;
  /** La siguiente acción (spec: "— Reportar una falla"). */
  readonly accion?: AccionEstado;
}

export function EstadoVacio({ titulo, descripcion, accion }: PropiedadesEstadoVacio) {
  return (
    <div className={estilos.contenedor} role="status">
      <p className={estilos.titulo}>{titulo}</p>
      {descripcion ? <p className={estilos.descripcion}>{descripcion}</p> : null}
      {accion ? (
        <Boton variante="secundario" tamano="compacto" onClick={accion.onClick}>
          {accion.etiqueta}
        </Boton>
      ) : null}
    </div>
  );
}
