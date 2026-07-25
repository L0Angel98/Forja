import type { Meta, StoryObj } from "@storybook/react-vite";
import { TarjetaMaquina } from "./TarjetaMaquina";

const meta: Meta<typeof TarjetaMaquina> = {
  component: TarjetaMaquina,
  title: "Dominio/TarjetaMaquina",
};

export default meta;
type Historia = StoryObj<typeof TarjetaMaquina>;

export const Operativa: Historia = {
  args: { tag: "PRE-03", nombre: "Prensa 3", estado: "operativa" },
};

export const EnFalla: Historia = {
  args: { tag: "HRN-01", nombre: "Horno 1", estado: "enFalla" },
};

export const EnMantenimiento: Historia = {
  args: { tag: "TOR-02", nombre: "Torno 2", estado: "enMantenimiento" },
};

export const SensorMudo: Historia = {
  args: { tag: "CNC-05", nombre: "CNC 5", estado: "sensorMudo" },
};

export const Interactiva: Historia = {
  args: { tag: "PRE-03", nombre: "Prensa 3", estado: "operativa", onClick: () => alert("Abrir detalle de PRE-03") },
};
