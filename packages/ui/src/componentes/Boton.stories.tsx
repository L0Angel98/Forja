import type { Meta, StoryObj } from "@storybook/react-vite";
import { Boton } from "./Boton";

const meta: Meta<typeof Boton> = {
  component: Boton,
  title: "Primitivas/Boton",
};

export default meta;
type Historia = StoryObj<typeof Boton>;

export const Primario: Historia = {
  args: { children: "Reportar falla", variante: "primario" },
};

export const Secundario: Historia = {
  args: { children: "Corregir", variante: "secundario" },
};

export const Peligro: Historia = {
  args: { children: "Eliminar", variante: "peligro" },
};

export const Cargando: Historia = {
  args: { children: "Guardar", cargando: true },
};

export const Deshabilitado: Historia = {
  args: { children: "Enviar", disabled: true },
};

export const TamanoCompacto: Historia = {
  args: { children: "Filtrar", tamano: "compacto" },
};
