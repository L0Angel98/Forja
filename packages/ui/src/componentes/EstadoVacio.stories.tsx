import type { Meta, StoryObj } from "@storybook/react-vite";
import { EstadoVacio } from "./EstadoVacio";

const meta: Meta<typeof EstadoVacio> = {
  component: EstadoVacio,
  title: "Estados/EstadoVacio",
};

export default meta;
type Historia = StoryObj<typeof EstadoVacio>;

export const SoloTitulo: Historia = {
  args: { titulo: "Sin reportes esta semana" },
};

export const ConDescripcion: Historia = {
  args: {
    titulo: "Sin reportes esta semana",
    descripcion: "Cuando reportes una falla, aparecerá aquí.",
  },
};

export const ConAccion: Historia = {
  args: {
    titulo: "Sin reportes esta semana",
    descripcion: "Cuando reportes una falla, aparecerá aquí.",
    accion: { etiqueta: "Reportar una falla", onClick: () => alert("Ir a reportar") },
  },
};
