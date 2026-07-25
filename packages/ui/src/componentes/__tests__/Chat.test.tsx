import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProveedorI18n } from "../../i18n/contexto";
import { Chat, type MensajeChat } from "../Chat";

function envolver(children: ReactNode) {
  return <ProveedorI18n>{children}</ProveedorI18n>;
}

describe("Chat", () => {
  it("renderiza los mensajes con su remitente y texto", () => {
    const mensajes: MensajeChat[] = [
      { id: "1", rol: "usuario", texto: "¿Cuál es el estado de PRE-03?" },
      { id: "2", rol: "agente", texto: "PRE-03 está operativa." },
    ];
    render(envolver(<Chat mensajes={mensajes} onEnviar={vi.fn()} />));

    expect(screen.getByText("¿Cuál es el estado de PRE-03?", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("PRE-03 está operativa.", { selector: "p" })).toBeInTheDocument();
    expect(screen.getAllByText("Tú")).toHaveLength(1);
    expect(screen.getAllByText("Agente")).toHaveLength(1);
  });

  it("streaming: la región aria-live anuncia solo el fragmento nuevo, no el texto completo repetido", () => {
    const mensajes: MensajeChat[] = [{ id: "1", rol: "agente", texto: "Hola" }];
    const { container, rerender } = render(envolver(<Chat mensajes={mensajes} onEnviar={vi.fn()} />));

    const region = container.querySelector("[aria-live='polite']");
    expect(region).not.toBeNull();
    expect(region?.textContent).toBe("Hola");

    rerender(envolver(<Chat mensajes={[{ id: "1", rol: "agente", texto: "Hola mundo" }]} onEnviar={vi.fn()} />));

    const fragmentos = Array.from(region?.querySelectorAll("span") ?? []).map((nodo) => nodo.textContent);
    expect(fragmentos).toEqual(["Hola", " mundo"]);
  });

  it("sin herramienta en ejecución, no muestra el indicador", () => {
    render(envolver(<Chat mensajes={[]} onEnviar={vi.fn()} />));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("con herramienta en ejecución, muestra su etiqueta como role=status", () => {
    render(envolver(<Chat mensajes={[]} onEnviar={vi.fn()} herramientaEnEjecucion={{ etiqueta: "Consultando sensores…" }} />));
    expect(screen.getByRole("status")).toHaveTextContent("Consultando sensores…");
  });

  it("chips de cita: se renderizan como botones y disparan su onClick al hacer clic", async () => {
    const alHacerClickCita = vi.fn();
    const mensajes: MensajeChat[] = [
      {
        id: "1",
        rol: "agente",
        texto: "Según el manual, el torque máximo es 40 Nm.",
        citas: [{ id: "c1", etiqueta: "[1] Manual PRE-03", onClick: alHacerClickCita }],
      },
    ];
    const usuario = userEvent.setup();
    render(envolver(<Chat mensajes={mensajes} onEnviar={vi.fn()} />));

    await usuario.click(screen.getByRole("button", { name: "[1] Manual PRE-03" }));
    expect(alHacerClickCita).toHaveBeenCalledTimes(1);
  });

  it("compositor: escribir y enviar dispara onEnviar con el texto y limpia el campo", async () => {
    const alEnviar = vi.fn();
    const usuario = userEvent.setup();
    render(envolver(<Chat mensajes={[]} onEnviar={alEnviar} />));

    const entrada = screen.getByLabelText("Escribe un mensaje…");
    await usuario.type(entrada, "Hola");
    await usuario.click(screen.getByRole("button", { name: "Enviar" }));

    expect(alEnviar).toHaveBeenCalledWith("Hola");
    expect(entrada).toHaveValue("");
  });

  it("compositor: Enter envía, Shift+Enter no envía", async () => {
    const alEnviar = vi.fn();
    const usuario = userEvent.setup();
    render(envolver(<Chat mensajes={[]} onEnviar={alEnviar} />));

    const entrada = screen.getByLabelText("Escribe un mensaje…");
    await usuario.type(entrada, "Línea 1");
    await usuario.keyboard("{Shift>}{Enter}{/Shift}");
    expect(alEnviar).not.toHaveBeenCalled();

    await usuario.keyboard("{Enter}");
    expect(alEnviar).toHaveBeenCalledTimes(1);
  });

  it("no envía texto vacío ni solo espacios", async () => {
    const alEnviar = vi.fn();
    const usuario = userEvent.setup();
    render(envolver(<Chat mensajes={[]} onEnviar={alEnviar} />));

    const entrada = screen.getByLabelText("Escribe un mensaje…");
    await usuario.type(entrada, "   ");

    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("deshabilitado: el campo y el botón quedan inhabilitados", () => {
    render(envolver(<Chat mensajes={[]} onEnviar={vi.fn()} deshabilitado />));

    expect(screen.getByLabelText("Escribe un mensaje…")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });
});
