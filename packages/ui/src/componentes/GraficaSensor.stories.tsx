import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { GraficaSensor, type PuntoSensor, type RangoGraficaSensor } from "./GraficaSensor";

const meta: Meta<typeof GraficaSensor> = {
  component: GraficaSensor,
  title: "Dominio/GraficaSensor",
};

export default meta;
type Historia = StoryObj<typeof GraficaSensor>;

function generarPuntos(cantidad: number): readonly PuntoSensor[] {
  const ahora = Date.UTC(2026, 0, 1, 0, 0, 0);
  return Array.from({ length: cantidad }, (_, indice) => ({
    timestampMs: ahora + indice * 60_000,
    valor: 20 + Math.sin(indice / 5) * 3,
  }));
}

const PUNTOS = generarPuntos(120);

function GraficaSensorInteractiva() {
  const [rango, setRango] = useState<RangoGraficaSensor>("24h");
  return <GraficaSensor titulo="Temperatura" unidad="°C" puntos={PUNTOS} rango={rango} onCambiarRango={setRango} />;
}

export const ConDatos: Historia = {
  render: () => <GraficaSensorInteractiva />,
};

export const SinDatos: Historia = {
  name: "Vacía (sin puntos)",
  args: { titulo: "Temperatura", unidad: "°C", puntos: [], rango: "24h", onCambiarRango: () => {} },
};
