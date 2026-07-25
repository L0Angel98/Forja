"use client";

import { EstadoError, EstadoVacio, Skeleton, useI18n } from "@forja/ui";
import { useQuery } from "@tanstack/react-query";
import { solicitarApi } from "../lib/api";
import estilos from "./lista-mis-reportes.module.css";

interface Documento {
  readonly id: string;
  readonly nombre: string;
  readonly tipoArchivo: string;
  readonly vigente: boolean;
  readonly estadoIndexacion: string;
}

interface RespuestaDocumentos {
  readonly documentos: readonly Documento[];
}

export function ListaDocumentos() {
  const { t } = useI18n();

  const consulta = useQuery({
    queryKey: ["documentos"],
    queryFn: () => solicitarApi<RespuestaDocumentos>("/api/documentos"),
  });

  return (
    <main className={estilos.pagina}>
      <h1 className={estilos.titulo}>{t("documentos.titulo")}</h1>
      {consulta.isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Skeleton alto="48px" radio="tarjeta" />
          <Skeleton alto="48px" radio="tarjeta" />
        </div>
      ) : consulta.isError ? (
        <EstadoError mensaje={t("auth.errorGenerico")} onReintentar={() => consulta.refetch()} />
      ) : (consulta.data?.documentos.length ?? 0) === 0 ? (
        <EstadoVacio titulo={t("documentos.vacioTitulo")} descripcion={t("documentos.vacioDescripcion")} />
      ) : (
        <ul className={estilos.lista}>
          {consulta.data?.documentos.map((documento) => (
            <li key={documento.id} className={estilos.reporte}>
              <div className={estilos.encabezado}>
                <span className={estilos.tag}>{documento.nombre}</span>
                <span className="forja-mono">{documento.tipoArchivo}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
