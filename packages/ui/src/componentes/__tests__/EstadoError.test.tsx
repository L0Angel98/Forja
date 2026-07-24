import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProveedorI18n } from "../../i18n/contexto";
import { EstadoError } from "../EstadoError";

describe("EstadoError", () => {
  it("muestra el mensaje y expone role=alert", () => {
    render(
      <ProveedorI18n>
        <EstadoError mensaje="No se pudo guardar el reporte. Tus datos siguen aquí." />
      </ProveedorI18n>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar el reporte. Tus datos siguen aquí.");
  });

  it("sin título propio, usa el título genérico del diccionario", () => {
    render(
      <ProveedorI18n>
        <EstadoError mensaje="Falló la carga." />
      </ProveedorI18n>,
    );

    expect(screen.getByText("No se pudo cargar")).toBeInTheDocument();
  });

  it("con título propio, lo usa en vez del genérico", () => {
    render(
      <ProveedorI18n>
        <EstadoError titulo="No se pudo enviar" mensaje="Revisa tu conexión." />
      </ProveedorI18n>,
    );

    expect(screen.getByText("No se pudo enviar")).toBeInTheDocument();
    expect(screen.queryByText("No se pudo cargar")).not.toBeInTheDocument();
  });

  it("sin onReintentar, no renderiza ningún botón", () => {
    render(
      <ProveedorI18n>
        <EstadoError mensaje="Falló la carga." />
      </ProveedorI18n>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("con onReintentar, renderiza el botón de reintentar y dispara el callback", async () => {
    const alReintentar = vi.fn();
    const usuario = userEvent.setup();
    render(
      <ProveedorI18n>
        <EstadoError mensaje="Falló la carga." onReintentar={alReintentar} />
      </ProveedorI18n>,
    );

    await usuario.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(alReintentar).toHaveBeenCalledTimes(1);
  });
});
