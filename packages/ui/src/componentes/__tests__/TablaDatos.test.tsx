import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProveedorI18n } from "../../i18n/contexto";
import { TablaDatos, type ColumnDef } from "../TablaDatos";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: (opciones: { count: number; estimateSize: () => number }) => ({
    getTotalSize: () => opciones.count * opciones.estimateSize(),
    getVirtualItems: () =>
      Array.from({ length: opciones.count }, (_, indice) => ({
        index: indice,
        start: indice * opciones.estimateSize(),
        size: opciones.estimateSize(),
        key: indice,
      })),
  }),
}));

interface FilaMaquina {
  readonly tag: string;
  readonly nombre: string;
}

const COLUMNAS: ColumnDef<FilaMaquina, unknown>[] = [
  { accessorKey: "tag", header: "Tag" },
  { accessorKey: "nombre", header: "Nombre" },
];

const DATOS: readonly FilaMaquina[] = [
  { tag: "PRE-03", nombre: "Prensa 3" },
  { tag: "HRN-01", nombre: "Horno 1" },
  { tag: "TOR-02", nombre: "Torno 2" },
];

function envolver(children: ReactNode) {
  return <ProveedorI18n>{children}</ProveedorI18n>;
}

describe("TablaDatos", () => {
  it("renderiza encabezados y todas las filas", () => {
    render(envolver(<TablaDatos etiqueta="Máquinas" datos={DATOS} columnas={COLUMNAS} />));

    expect(screen.getByRole("columnheader", { name: "Tag" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Nombre" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(4); // 1 encabezado + 3 filas
    expect(screen.getByText("PRE-03")).toBeInTheDocument();
    expect(screen.getByText("Horno 1")).toBeInTheDocument();
  });

  it("expone la tabla con su etiqueta accesible", () => {
    render(envolver(<TablaDatos etiqueta="Máquinas" datos={DATOS} columnas={COLUMNAS} />));
    expect(screen.getByRole("table", { name: "Máquinas" })).toBeInTheDocument();
  });

  it("el filtro global reduce las filas visibles", async () => {
    const usuario = userEvent.setup();
    render(envolver(<TablaDatos etiqueta="Máquinas" datos={DATOS} columnas={COLUMNAS} />));

    await usuario.type(screen.getByRole("textbox", { name: "Buscar" }), "horno");

    const filas = screen.getAllByRole("row");
    expect(filas).toHaveLength(2); // 1 encabezado + 1 fila filtrada
    expect(within(filas[1]!).getByText("Horno 1")).toBeInTheDocument();
    expect(screen.queryByText("Prensa 3")).not.toBeInTheDocument();
  });

  it("sin resultados, muestra el estado vacío del filtro", async () => {
    const usuario = userEvent.setup();
    render(envolver(<TablaDatos etiqueta="Máquinas" datos={DATOS} columnas={COLUMNAS} />));

    await usuario.type(screen.getByRole("textbox", { name: "Buscar" }), "no existe");

    expect(screen.getByText("Sin resultados para este filtro")).toBeInTheDocument();
  });
});
