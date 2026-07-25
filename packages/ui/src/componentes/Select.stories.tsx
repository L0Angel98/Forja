import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select } from "./Select";

const meta: Meta<typeof Select> = {
  component: Select,
  title: "Primitivas/Select",
};

export default meta;
type Historia = StoryObj<typeof Select>;

const OPCIONES = [
  { valor: "1", etiqueta: "Baja" },
  { valor: "2", etiqueta: "Media" },
  { valor: "3", etiqueta: "Alta" },
  { valor: "4", etiqueta: "Crítica" },
];

export const Normal: Historia = {
  args: { etiqueta: "Severidad", opciones: OPCIONES, placeholder: "Elige una severidad" },
};

export const ConError: Historia = {
  args: { etiqueta: "Severidad", opciones: OPCIONES, error: "Selecciona una severidad" },
};
