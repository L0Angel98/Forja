import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProveedorI18n } from "../../i18n/contexto";
import { GraficaSensor, type PuntoSensor } from "../GraficaSensor";

const setData = vi.fn();
const destroy = vi.fn();
let ultimasOpciones: unknown;
let ultimosDatos: unknown;

vi.mock("uplot", () => {
  class GraficaFalsa {
    setData = setData;
    destroy = destroy;
    constructor(opciones: unknown, datos: unknown) {
      ultimasOpciones = opciones;
      ultimosDatos = datos;
    }
  }
  return { default: GraficaFalsa };
});

const PUNTOS: readonly PuntoSensor[] = [
  { timestampMs: 1_700_000_000_000, valor: 21.5 },
  { timestampMs: 1_700_000_060_000, valor: 22.1 },
];

beforeEach(() => {
  setData.mockClear();
  destroy.mockClear();
  ultimasOpciones = undefined;
  ultimosDatos = undefined;
});

describe("GraficaSensor", () => {
  it("instancia uPlot una vez sobre el contenedor con los datos convertidos a segundos", () => {
    render(
      <ProveedorI18n>
        <GraficaSensor titulo="Temperatura" unidad="°C" puntos={PUNTOS} rango="24h" onCambiarRango={vi.fn()} />
      </ProveedorI18n>,
    );

    expect(ultimasOpciones).toBeDefined();
    expect(ultimosDatos).toEqual([
      [1_700_000_000, 1_700_000_060],
      [21.5, 22.1],
    ]);
  });

  it("muestra el título con la unidad", () => {
    render(
      <ProveedorI18n>
        <GraficaSensor titulo="Temperatura" unidad="°C" puntos={PUNTOS} rango="24h" onCambiarRango={vi.fn()} />
      </ProveedorI18n>,
    );

    expect(screen.getByText("Temperatura (°C)")).toBeInTheDocument();
  });

  it("marca el botón del rango activo con aria-pressed", () => {
    render(
      <ProveedorI18n>
        <GraficaSensor titulo="Temperatura" puntos={PUNTOS} rango="7d" onCambiarRango={vi.fn()} />
      </ProveedorI18n>,
    );

    expect(screen.getByRole("button", { name: "7 d" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "24 h" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "30 d" })).toHaveAttribute("aria-pressed", "false");
  });

  it("al hacer clic en un rango, dispara onCambiarRango con ese rango", async () => {
    const alCambiarRango = vi.fn();
    const usuario = userEvent.setup();
    render(
      <ProveedorI18n>
        <GraficaSensor titulo="Temperatura" puntos={PUNTOS} rango="24h" onCambiarRango={alCambiarRango} />
      </ProveedorI18n>,
    );

    await usuario.click(screen.getByRole("button", { name: "30 d" }));

    expect(alCambiarRango).toHaveBeenCalledWith("30d");
  });

  it("al desmontar, destruye la instancia de uPlot", () => {
    const { unmount } = render(
      <ProveedorI18n>
        <GraficaSensor titulo="Temperatura" puntos={PUNTOS} rango="24h" onCambiarRango={vi.fn()} />
      </ProveedorI18n>,
    );

    unmount();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("al cambiar los puntos, llama setData en vez de recrear la gráfica", () => {
    const { rerender } = render(
      <ProveedorI18n>
        <GraficaSensor titulo="Temperatura" puntos={PUNTOS} rango="24h" onCambiarRango={vi.fn()} />
      </ProveedorI18n>,
    );

    const nuevosPuntos: readonly PuntoSensor[] = [...PUNTOS, { timestampMs: 1_700_000_120_000, valor: 22.8 }];
    rerender(
      <ProveedorI18n>
        <GraficaSensor titulo="Temperatura" puntos={nuevosPuntos} rango="24h" onCambiarRango={vi.fn()} />
      </ProveedorI18n>,
    );

    expect(setData).toHaveBeenCalledWith([
      [1_700_000_000, 1_700_000_060, 1_700_000_120],
      [21.5, 22.1, 22.8],
    ]);
  });
});
