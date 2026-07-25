import type { Meta, StoryObj } from "@storybook/react-vite";
import { EtiquetaEstado, type TonoEstado } from "./EtiquetaEstado";

const meta: Meta<typeof EtiquetaEstado> = {
  component: EtiquetaEstado,
  title: "Primitivas/EtiquetaEstado",
};

export default meta;
type Historia = StoryObj<typeof EtiquetaEstado>;

export const Verde: Historia = { args: { tono: "verde", children: "Operativa" } };
export const Ambar: Historia = { args: { tono: "ambar", children: "Pendiente de aprobación" } };
export const Naranja: Historia = { args: { tono: "naranja", children: "Advertencia" } };
export const Rojo: Historia = { args: { tono: "rojo", children: "En falla" } };
export const Neutro: Historia = { args: { tono: "neutro", children: "Sin datos" } };

const TONOS: readonly TonoEstado[] = ["verde", "ambar", "naranja", "rojo", "neutro"];

export const TodosLosTonos: Historia = {
  render: () => (
    <div style={{ display: "flex", gap: 12 }}>
      {TONOS.map((tono) => (
        <EtiquetaEstado key={tono} tono={tono}>
          {tono}
        </EtiquetaEstado>
      ))}
    </div>
  ),
};
