import type { Meta, StoryObj } from "@storybook/react-vite";
import { Campo } from "./Campo";

const meta: Meta<typeof Campo> = {
  component: Campo,
  title: "Primitivas/Campo",
};

export default meta;
type Historia = StoryObj<typeof Campo>;

export const Normal: Historia = {
  args: { etiqueta: "Tag de máquina", placeholder: "PRE-03" },
};

export const ConAyuda: Historia = {
  args: { etiqueta: "Tag de máquina", ayuda: "El código de la torreta física" },
};

export const ConError: Historia = {
  args: { etiqueta: "Tag de máquina", error: "Este tag no existe en planta", value: "XXX-99" },
};

export const Deshabilitado: Historia = {
  args: { etiqueta: "Tag de máquina", value: "PRE-03", disabled: true },
};
