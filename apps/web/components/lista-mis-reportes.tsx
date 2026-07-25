"use client";

import { EstadoError, EstadoVacio, EtiquetaEstado, EtiquetaSeveridad, Skeleton, useI18n, type Severidad, type TonoEstado } from "@forja/ui";
import { useQuery } from "@tanstack/react-query";
import { solicitarApi } from "../lib/api";
import { usarSesion } from "../lib/usar-sesion";
import estilos from "./lista-mis-reportes.module.css";

type EstadoFalla = "abierto" | "en_revision" | "atendido" | "cerrado";

interface ReporteFalla {
  readonly id: string;
  readonly machineId: string;
  readonly reportadoPor: string;
  readonly descripcion: string;
  readonly severidad: Severidad;
  readonly estado: EstadoFalla;
}

interface RespuestaFallas {
  readonly fallas: readonly ReporteFalla[];
}

const TONO_POR_ESTADO_FALLA: Record<EstadoFalla, TonoEstado> = {
  abierto: "ambar",
  en_revision: "naranja",
  atendido: "verde",
  cerrado: "neutro",
};

export function ListaMisReportes() {
  const { t } = useI18n();
  const { data: sesion } = usarSesion();

  const consulta = useQuery({
    queryKey: ["fallas", "mis-reportes"],
    queryFn: () => solicitarApi<RespuestaFallas>("/api/fallas"),
    enabled: Boolean(sesion),
  });

  const misReportes = (consulta.data?.fallas ?? []).filter((reporte) => reporte.reportadoPor === sesion?.id);

  return (
    <main className={estilos.pagina}>
      <h1 className={estilos.titulo}>{t("misReportes.titulo")}</h1>
      {consulta.isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton alto="72px" radio="tarjeta" />
          <Skeleton alto="72px" radio="tarjeta" />
        </div>
      ) : consulta.isError ? (
        <EstadoError mensaje={t("auth.errorGenerico")} onReintentar={() => consulta.refetch()} />
      ) : misReportes.length === 0 ? (
        <EstadoVacio titulo={t("misReportes.vacioTitulo")} descripcion={t("misReportes.vacioDescripcion")} />
      ) : (
        <ul className={estilos.lista}>
          {misReportes.map((reporte) => (
            <li key={reporte.id} className={estilos.reporte}>
              <div className={estilos.encabezado}>
                <span className={`${estilos.tag} forja-mono`}>{reporte.machineId}</span>
                <EtiquetaSeveridad severidad={reporte.severidad} />
              </div>
              <p className={estilos.descripcion}>{reporte.descripcion}</p>
              <EtiquetaEstado tono={TONO_POR_ESTADO_FALLA[reporte.estado]}>{t(`estadoFalla.${estadoFallaClave(reporte.estado)}`)}</EtiquetaEstado>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function estadoFallaClave(estado: EstadoFalla): "abierto" | "enRevision" | "atendido" | "cerrado" {
  if (estado === "en_revision") return "enRevision";
  return estado;
}
