import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProveedorI18n, useI18n } from "../contexto";

function Consumidor() {
  const { idioma, t, establecerIdioma } = useI18n();
  return (
    <div>
      <span data-testid="idioma">{idioma}</span>
      <span data-testid="texto">{t("comun.confirmar")}</span>
      <button onClick={() => establecerIdioma("es-MX")}>cambiar</button>
    </div>
  );
}

describe("ProveedorI18n / useI18n", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("usa es-MX por defecto y resuelve claves del diccionario", () => {
    render(
      <ProveedorI18n>
        <Consumidor />
      </ProveedorI18n>,
    );

    expect(screen.getByTestId("idioma")).toHaveTextContent("es-MX");
    expect(screen.getByTestId("texto")).toHaveTextContent("Confirmar");
  });

  it("establecerIdioma persiste en localStorage y sobrevive a un remount", async () => {
    const usuario = userEvent.setup();
    const { unmount } = render(
      <ProveedorI18n>
        <Consumidor />
      </ProveedorI18n>,
    );

    await usuario.click(screen.getByRole("button", { name: "cambiar" }));
    expect(window.localStorage.getItem("forja:idioma")).toBe("es-MX");

    unmount();
    cleanup();

    render(
      <ProveedorI18n>
        <Consumidor />
      </ProveedorI18n>,
    );
    expect(screen.getByTestId("idioma")).toHaveTextContent("es-MX");
  });

  it("useI18n fuera de un ProveedorI18n lanza un error claro", () => {
    const spyConsola = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumidor />)).toThrow("useI18n debe usarse dentro de <ProveedorI18n>.");
    spyConsola.mockRestore();
  });
});
