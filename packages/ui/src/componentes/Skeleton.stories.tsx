import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
  component: Skeleton,
  title: "Estados/Skeleton",
};

export default meta;
type Historia = StoryObj<typeof Skeleton>;

export const Bloque: Historia = {
  args: { ancho: "240px", alto: "16px" },
};

export const Circulo: Historia = {
  args: { ancho: "48px", alto: "48px", radio: "circulo" },
};

export const ComposicionTarjetaMaquina: Historia = {
  name: "Composición: forma de TarjetaMaquina",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 280 }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <Skeleton ancho="80px" alto="14px" />
        <Skeleton ancho="90px" alto="20px" radio="control" />
      </div>
      <Skeleton ancho="160px" alto="20px" />
    </div>
  ),
};
