import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProveedorI18n } from "../../i18n/contexto";
import { TarjetaConfirmacion } from "../TarjetaConfirmacion";

const RESUMEN = [
  { etiqueta: "Máquina", valor: "PRE-03" },
  { etiqueta: "Severidad", valor: "Alta" },
];

describe("TarjetaConfirmacion", () => {
  it("muestra el título y el resumen como pares etiqueta/valor", () => {
    render(
      <ProveedorI18n>
        <TarjetaConfirmacion titulo="Confirmar reporte de falla" resumen={RESUMEN} onConfirmar={vi.fn()} onCorregir={vi.fn()} />
      </ProveedorI18n>,
    );

    expect(screen.getByText("Confirmar reporte de falla")).toBeInTheDocument();
    expect(screen.getByText("Máquina")).toBeInTheDocument();
    expect(screen.getByText("PRE-03")).toBeInTheDocument();
    expect(screen.getByText("Severidad")).toBeInTheDocument();
    expect(screen.getByText("Alta")).toBeInTheDocument();
  });

  it("el botón Confirmar nunca tiene el foco automáticamente al montar", () => {
    render(
      <ProveedorI18n>
        <TarjetaConfirmacion titulo="Confirmar acción" resumen={RESUMEN} onConfirmar={vi.fn()} onCorregir={vi.fn()} />
      </ProveedorI18n>,
    );

    const confirmar = screen.getByRole("button", { name: "Confirmar" });
    expect(confirmar).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it("Corregir aparece antes que Confirmar en el DOM (separación espacial, no lado a lado bajo el mismo gesto)", () => {
    render(
      <ProveedorI18n>
        <TarjetaConfirmacion titulo="Confirmar acción" resumen={RESUMEN} onConfirmar={vi.fn()} onCorregir={vi.fn()} />
      </ProveedorI18n>,
    );

    const botones = screen.getAllByRole("button");
    expect(botones[0]).toHaveTextContent("Corregir");
    expect(botones[1]).toHaveTextContent("Confirmar");
  });

  it("al hacer clic en Confirmar, dispara onConfirmar y no onCorregir", async () => {
    const alConfirmar = vi.fn();
    const alCorregir = vi.fn();
    const usuario = userEvent.setup();
    render(
      <ProveedorI18n>
        <TarjetaConfirmacion titulo="Confirmar acción" resumen={RESUMEN} onConfirmar={alConfirmar} onCorregir={alCorregir} />
      </ProveedorI18n>,
    );

    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(alConfirmar).toHaveBeenCalledTimes(1);
    expect(alCorregir).not.toHaveBeenCalled();
  });

  it("al hacer clic en Corregir, dispara onCorregir y no onConfirmar", async () => {
    const alConfirmar = vi.fn();
    const alCorregir = vi.fn();
    const usuario = userEvent.setup();
    render(
      <ProveedorI18n>
        <TarjetaConfirmacion titulo="Confirmar acción" resumen={RESUMEN} onConfirmar={alConfirmar} onCorregir={alCorregir} />
      </ProveedorI18n>,
    );

    await usuario.click(screen.getByRole("button", { name: "Corregir" }));

    expect(alCorregir).toHaveBeenCalledTimes(1);
    expect(alConfirmar).not.toHaveBeenCalled();
  });

  it("confirmando: Confirmar muestra estado de carga y Corregir queda deshabilitado", () => {
    render(
      <ProveedorI18n>
        <TarjetaConfirmacion titulo="Confirmar acción" resumen={RESUMEN} onConfirmar={vi.fn()} onCorregir={vi.fn()} confirmando />
      </ProveedorI18n>,
    );

    expect(screen.getByRole("button", { name: "Confirmar" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Corregir" })).toBeDisabled();
  });
});
