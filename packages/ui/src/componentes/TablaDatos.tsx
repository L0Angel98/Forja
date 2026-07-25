import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState } from "react";
import { useI18n } from "../i18n/contexto";
import { Campo } from "./Campo";
import estilos from "./TablaDatos.module.css";

export type { ColumnDef } from "@tanstack/react-table";

const ALTURA_FILA_PX = 44;
const ALTURA_VIEWPORT_DEFECTO_PX = 480;

export interface PropiedadesTablaDatos<TFila> {
  readonly etiqueta: string;
  readonly datos: readonly TFila[];
  readonly columnas: readonly ColumnDef<TFila, unknown>[];
  readonly altura?: number;
}

/**
 * Tabla virtualizada con filtro global — solo shells de escritorio (spec
 * 02-interfaz: "TablaDatos... solo shells de escritorio"). Usa roles ARIA
 * (table/row/cell) en vez de elementos <table> reales porque las filas se
 * posicionan de forma absoluta para la virtualización, algo que el layout
 * nativo de tabla no soporta bien.
 */
export function TablaDatos<TFila>({ etiqueta, datos, columnas, altura = ALTURA_VIEWPORT_DEFECTO_PX }: PropiedadesTablaDatos<TFila>) {
  const { t } = useI18n();
  const [filtro, setFiltro] = useState("");
  const contenedorRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library -- no usamos react-compiler en este repo; @tanstack/react-table gestiona su propia memoización.
  const tabla = useReactTable({
    data: datos as TFila[],
    columns: columnas as ColumnDef<TFila, unknown>[],
    state: { globalFilter: filtro },
    onGlobalFilterChange: setFiltro,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const filas = tabla.getRowModel().rows;

  const virtualizador = useVirtualizer({
    count: filas.length,
    getScrollElement: () => contenedorRef.current,
    estimateSize: () => ALTURA_FILA_PX,
    overscan: 8,
  });

  const encabezados = tabla.getHeaderGroups()[0]?.headers ?? [];

  return (
    <div className={estilos.tabla}>
      <Campo etiqueta={t("tablaDatos.buscar")} value={filtro} onChange={(evento) => setFiltro(evento.target.value)} />
      <div ref={contenedorRef} className={estilos.viewport} style={{ height: altura }}>
        <div role="table" aria-label={etiqueta} className={estilos.grilla}>
          <div role="rowgroup">
            <div role="row" className={estilos.filaEncabezado}>
              {encabezados.map((encabezado) => (
                <div role="columnheader" key={encabezado.id} className={estilos.celdaEncabezado}>
                  {flexRender(encabezado.column.columnDef.header, encabezado.getContext())}
                </div>
              ))}
            </div>
          </div>
          {filas.length === 0 ? (
            <p className={estilos.sinResultados}>{t("tablaDatos.sinResultados")}</p>
          ) : (
            <div role="rowgroup" style={{ position: "relative", height: virtualizador.getTotalSize() }}>
              {virtualizador.getVirtualItems().map((elementoVirtual) => {
                const fila = filas[elementoVirtual.index];
                if (!fila) return null;
                return (
                  <div
                    role="row"
                    key={fila.id}
                    className={estilos.fila}
                    style={{
                      display: "flex",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: elementoVirtual.size,
                      transform: `translateY(${elementoVirtual.start}px)`,
                    }}
                  >
                    {fila.getVisibleCells().map((celda) => (
                      <div role="cell" key={celda.id} className={estilos.celda}>
                        {flexRender(celda.column.columnDef.cell, celda.getContext())}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
