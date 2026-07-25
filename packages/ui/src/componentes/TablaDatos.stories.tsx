import type { Meta, StoryObj } from "@storybook/react-vite";
import { TablaDatos, type ColumnDef } from "./TablaDatos";

interface FilaMaquina {
  readonly tag: string;
  readonly nombre: string;
  readonly estado: string;
}

const COLUMNAS: ColumnDef<FilaMaquina, unknown>[] = [
  { accessorKey: "tag", header: "Tag" },
  { accessorKey: "nombre", header: "Nombre" },
  { accessorKey: "estado", header: "Estado" },
];

const DATOS: readonly FilaMaquina[] = [
  { tag: "PRE-03", nombre: "Prensa 3", estado: "Operativa" },
  { tag: "HRN-01", nombre: "Horno 1", estado: "En falla" },
  { tag: "TOR-02", nombre: "Torno 2", estado: "En mantenimiento" },
  { tag: "CNC-05", nombre: "CNC 5", estado: "Sensor mudo" },
];

const meta: Meta<typeof TablaDatos<FilaMaquina>> = {
  component: TablaDatos<FilaMaquina>,
  title: "Dominio/TablaDatos",
};

export default meta;
type Historia = StoryObj<typeof TablaDatos<FilaMaquina>>;

export const ConDatos: Historia = {
  args: { etiqueta: "Máquinas", datos: DATOS, columnas: COLUMNAS },
};

export const Vacia: Historia = {
  args: { etiqueta: "Máquinas", datos: [], columnas: COLUMNAS },
};
