import type { Meta, StoryObj } from "@storybook/react-vite";
import { EstadoError } from "./EstadoError";

const meta: Meta<typeof EstadoError> = {
  component: EstadoError,
  title: "Estados/EstadoError",
};

export default meta;
type Historia = StoryObj<typeof EstadoError>;

export const TituloGenerico: Historia = {
  args: { mensaje: "No se pudo guardar el reporte. Tus datos siguen aquí." },
};

export const TituloPropio: Historia = {
  args: { titulo: "No se pudo enviar", mensaje: "Revisa tu conexión e inténtalo de nuevo." },
};

export const ConReintentar: Historia = {
  args: {
    mensaje: "No se pudo guardar el reporte. Tus datos siguen aquí.",
    onReintentar: () => alert("Reintentando…"),
  },
};
