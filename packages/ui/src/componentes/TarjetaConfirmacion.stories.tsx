import type { Meta, StoryObj } from "@storybook/react-vite";
import { TarjetaConfirmacion } from "./TarjetaConfirmacion";

const meta: Meta<typeof TarjetaConfirmacion> = {
  component: TarjetaConfirmacion,
  title: "Dominio/TarjetaConfirmacion",
};

export default meta;
type Historia = StoryObj<typeof TarjetaConfirmacion>;

const RESUMEN_REPORTE = [
  { etiqueta: "Máquina", valor: "PRE-03" },
  { etiqueta: "Severidad", valor: "Alta" },
  { etiqueta: "Descripción", valor: "Ruido anormal en el motor principal" },
];

export const Normal: Historia = {
  args: {
    titulo: "Confirmar reporte de falla",
    resumen: RESUMEN_REPORTE,
    onConfirmar: () => alert("Confirmado"),
    onCorregir: () => alert("Corregir"),
  },
};

export const Confirmando: Historia = {
  args: {
    titulo: "Confirmar reporte de falla",
    resumen: RESUMEN_REPORTE,
    onConfirmar: () => {},
    onCorregir: () => {},
    confirmando: true,
  },
};
