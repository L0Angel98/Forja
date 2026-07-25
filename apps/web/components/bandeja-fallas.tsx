"use client";

import { Boton, EstadoError, EstadoVacio, EtiquetaSeveridad, Skeleton, useI18n, type Severidad } from "@forja/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { solicitarApi } from "../lib/api";
import estilos from "./lista-mis-reportes.module.css";

interface ReporteFalla {
  readonly id: string;
  readonly machineId: string;
  readonly descripcion: string;
  readonly severidad: Severidad;
}

interface RespuestaFallas {
  readonly fallas: readonly ReporteFalla[];
}

const CLAVE_CONSULTA = ["fallas", "bandeja"];

/**
 * "Bandeja de pendientes de aprobación" (spec 02-interfaz, caso de uso de
 * supervisor) se construye sobre GET /api/fallas?estado=abierto — el
 * endpoint que ya existe — en vez de la entidad Notificacion, que no tiene
 * ruta HTTP de lectura hoy. Las fallas abiertas SON lo que un supervisor
 * necesita triar; crear un endpoint de notificaciones nuevo queda fuera de
 * alcance de esta tarea (shells + routing), no de esta pantalla en sí.
 */
export function BandejaFallas() {
  const { t } = useI18n();
  const cliente = useQueryClient();

  const consulta = useQuery({
    queryKey: CLAVE_CONSULTA,
    queryFn: () => solicitarApi<RespuestaFallas>("/api/fallas?estado=abierto"),
  });

  const mutacionAvanzar = useMutation({
    mutationFn: (id: string) =>
      solicitarApi(`/api/fallas/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: "en_revision" }),
      }),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: CLAVE_CONSULTA }),
  });

  return (
    <main className={estilos.pagina}>
      <h1 className={estilos.titulo}>{t("bandeja.titulo")}</h1>
      {consulta.isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton alto="72px" radio="tarjeta" />
          <Skeleton alto="72px" radio="tarjeta" />
        </div>
      ) : consulta.isError ? (
        <EstadoError mensaje={t("auth.errorGenerico")} onReintentar={() => consulta.refetch()} />
      ) : (consulta.data?.fallas.length ?? 0) === 0 ? (
        <EstadoVacio titulo={t("bandeja.vacioTitulo")} descripcion={t("bandeja.vacioDescripcion")} />
      ) : (
        <ul className={estilos.lista}>
          {consulta.data?.fallas.map((reporte) => (
            <li key={reporte.id} className={estilos.reporte}>
              <div className={estilos.encabezado}>
                <span className={`${estilos.tag} forja-mono`}>{reporte.machineId}</span>
                <EtiquetaSeveridad severidad={reporte.severidad} />
              </div>
              <p className={estilos.descripcion}>{reporte.descripcion}</p>
              <Boton
                variante="secundario"
                tamano="compacto"
                cargando={mutacionAvanzar.isPending}
                onClick={() => mutacionAvanzar.mutate(reporte.id)}
              >
                {t("bandeja.avanzarAEnRevision")}
              </Boton>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
