import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chat, type MensajeChat } from "./Chat";

const meta: Meta<typeof Chat> = {
  component: Chat,
  title: "Dominio/Chat",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Historia = StoryObj<typeof Chat>;

const MENSAJES: readonly MensajeChat[] = [
  { id: "1", rol: "usuario", texto: "¿Cuál es el estado de PRE-03?" },
  { id: "2", rol: "agente", texto: "PRE-03 está operativa desde las 06:00." },
];

const MENSAJES_CON_CITAS: readonly MensajeChat[] = [
  {
    id: "1",
    rol: "usuario",
    texto: "¿Cuál es el torque máximo permitido en la prensa?",
  },
  {
    id: "2",
    rol: "agente",
    texto: "Según el manual de mantenimiento, el torque máximo es 40 Nm.",
    citas: [{ id: "c1", etiqueta: "[1] Manual PRE-03", onClick: () => alert("Abrir documento") }],
  },
];

const decoradorAltura = (Historia: () => React.JSX.Element) => (
  <div style={{ height: "70vh" }}>
    <Historia />
  </div>
);

export const ConMensajes: Historia = {
  args: { mensajes: MENSAJES, onEnviar: () => {} },
  decorators: [decoradorAltura],
};

export const Vacio: Historia = {
  args: { mensajes: [], onEnviar: () => {} },
  decorators: [decoradorAltura],
};

export const HerramientaEnEjecucion: Historia = {
  args: {
    mensajes: MENSAJES,
    onEnviar: () => {},
    herramientaEnEjecucion: { etiqueta: "Consultando sensores…" },
  },
  decorators: [decoradorAltura],
};

export const ConCitas: Historia = {
  args: { mensajes: MENSAJES_CON_CITAS, onEnviar: () => {} },
  decorators: [decoradorAltura],
};

export const Deshabilitado: Historia = {
  args: { mensajes: MENSAJES, onEnviar: () => {}, deshabilitado: true },
  decorators: [decoradorAltura],
};
