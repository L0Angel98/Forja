import type { Meta, StoryObj } from "@storybook/react-vite";
import { SEVERIDADES } from "../tokens";
import { EtiquetaSeveridad } from "./EtiquetaSeveridad";

const meta: Meta<typeof EtiquetaSeveridad> = {
  component: EtiquetaSeveridad,
  title: "Dominio/EtiquetaSeveridad",
};

export default meta;
type Historia = StoryObj<typeof EtiquetaSeveridad>;

export const Nivel1: Historia = { args: { severidad: 1 } };
export const Nivel2: Historia = { args: { severidad: 2 } };
export const Nivel3: Historia = { args: { severidad: 3 } };
export const Nivel4: Historia = { args: { severidad: 4 } };

export const TodasLasSeveridades: Historia = {
  render: () => (
    <div style={{ display: "flex", gap: 12 }}>
      {SEVERIDADES.map((severidad) => (
        <EtiquetaSeveridad key={severidad} severidad={severidad} />
      ))}
    </div>
  ),
};
