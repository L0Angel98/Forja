import { useEffect, useMemo, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { useI18n } from "../i18n/contexto";
import { colores } from "../tokens";
import { combinarClases } from "../utils/combinar-clases";
import estilos from "./GraficaSensor.module.css";

export type RangoGraficaSensor = "24h" | "7d" | "30d";

const RANGOS: readonly RangoGraficaSensor[] = ["24h", "7d", "30d"];
const ALTURA_LIENZO = 240;

const CLAVE_ETIQUETA_RANGO = {
  "24h": "graficaSensor.rango24h",
  "7d": "graficaSensor.rango7d",
  "30d": "graficaSensor.rango30d",
} as const;

export interface PuntoSensor {
  readonly timestampMs: number;
  readonly valor: number;
}

export interface PropiedadesGraficaSensor {
  readonly titulo: string;
  readonly unidad?: string;
  /** Serie ya muestreada por quien la usa (spec 02-interfaz: serie temporal ≤ 500 puntos). */
  readonly puntos: readonly PuntoSensor[];
  readonly rango: RangoGraficaSensor;
  readonly onCambiarRango: (rango: RangoGraficaSensor) => void;
}

/**
 * Serie temporal con uPlot (spec 02-interfaz: "sin librería pesada"). uPlot
 * no es un componente React: se instancia una vez sobre un <div> ref y se
 * actualiza imperativamente vía setData/setSize en efectos, en vez de
 * re-crearla en cada render.
 */
export function GraficaSensor({ titulo, unidad, puntos, rango, onCambiarRango }: PropiedadesGraficaSensor) {
  const { t } = useI18n();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const graficaRef = useRef<uPlot | null>(null);

  const datos = useMemo<uPlot.AlignedData>(
    () => [puntos.map((punto) => punto.timestampMs / 1000), puntos.map((punto) => punto.valor)],
    [puntos],
  );

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const opciones: uPlot.Options = {
      width: contenedor.clientWidth || 600,
      height: ALTURA_LIENZO,
      scales: { x: { time: true } },
      axes: [{ stroke: colores.acero300 }, { stroke: colores.acero300 }],
      series: [{}, { label: unidad ?? titulo, stroke: colores.senalAzul, width: 2 }],
    };

    const grafica = new uPlot(opciones, datos, contenedor);
    graficaRef.current = grafica;

    return () => {
      grafica.destroy();
      graficaRef.current = null;
    };
    // Solo se crea una vez: título/unidad no cambian en caliente para una misma gráfica montada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    graficaRef.current?.setData(datos);
  }, [datos]);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    // jsdom (tests) no implementa ResizeObserver; en navegador siempre existe.
    if (!contenedor || typeof ResizeObserver === "undefined") return;

    const observador = new ResizeObserver(() => {
      graficaRef.current?.setSize({ width: contenedor.clientWidth, height: ALTURA_LIENZO });
    });
    observador.observe(contenedor);

    return () => observador.disconnect();
  }, []);

  return (
    <div className={estilos.grafica}>
      <div className={estilos.encabezado}>
        <p className={estilos.titulo}>
          {titulo}
          {unidad ? ` (${unidad})` : ""}
        </p>
        <div className={estilos.rangos} role="group" aria-label={t("graficaSensor.rango")}>
          {RANGOS.map((opcion) => (
            <button
              key={opcion}
              type="button"
              className={combinarClases(estilos.botonRango, opcion === rango ? estilos.botonRangoActivo : undefined)}
              aria-pressed={opcion === rango}
              onClick={() => onCambiarRango(opcion)}
            >
              {t(CLAVE_ETIQUETA_RANGO[opcion])}
            </button>
          ))}
        </div>
      </div>
      <div ref={contenedorRef} className={estilos.lienzo} />
    </div>
  );
}
