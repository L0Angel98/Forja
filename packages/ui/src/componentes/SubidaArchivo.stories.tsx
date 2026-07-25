import type { Meta, StoryObj } from "@storybook/react-vite";
import { SubidaArchivo } from "./SubidaArchivo";

const meta: Meta<typeof SubidaArchivo> = {
  component: SubidaArchivo,
  title: "Dominio/SubidaArchivo",
};

export default meta;
type Historia = StoryObj<typeof SubidaArchivo>;

export const Inactivo: Historia = {
  args: { onSeleccionar: () => {} },
};

export const Subiendo: Historia = {
  args: { onSeleccionar: () => {}, estado: "subiendo", progreso: 45, nombreArchivo: "falla-pre03.jpg" },
};

export const ConError: Historia = {
  args: {
    onSeleccionar: () => {},
    estado: "error",
    nombreArchivo: "falla-pre03.jpg",
    onReintentar: () => alert("Reintentando…"),
  },
};

export const Completado: Historia = {
  args: {
    onSeleccionar: () => {},
    estado: "completado",
    nombreArchivo: "falla-pre03.jpg",
    onQuitar: () => alert("Archivo quitado"),
  },
};
