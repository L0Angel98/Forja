import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuardiaRol } from "../guardia-rol";

const alReemplazar = vi.fn();
const usarSesionMock = vi.fn();

const RUTA_POR_ROL: Record<string, string> = { operador: "/chat", supervisor: "/bandeja", admin: "/documentos" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: alReemplazar }),
}));

vi.mock("../../lib/usar-sesion", () => ({
  usarSesion: () => usarSesionMock(),
  rutaInicioPorRol: (rol: string) => RUTA_POR_ROL[rol],
}));

beforeEach(() => {
  alReemplazar.mockClear();
  usarSesionMock.mockClear();
});

describe("GuardiaRol", () => {
  it("con el rol correcto, renderiza los hijos (operador aterriza en su propia sección)", () => {
    usarSesionMock.mockReturnValue({ data: { id: "1", rol: "operador" }, isLoading: false });

    render(
      <GuardiaRol rol="operador">
        <p>Chat de pantalla completa</p>
      </GuardiaRol>,
    );

    expect(screen.getByText("Chat de pantalla completa")).toBeInTheDocument();
    expect(alReemplazar).not.toHaveBeenCalled();
  });

  it("sin sesión, redirige a /iniciar-sesion y no renderiza los hijos", () => {
    usarSesionMock.mockReturnValue({ data: null, isLoading: false });

    render(
      <GuardiaRol rol="operador">
        <p>Contenido protegido</p>
      </GuardiaRol>,
    );

    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
    expect(alReemplazar).toHaveBeenCalledWith("/iniciar-sesion");
  });

  it("con un rol distinto al esperado, redirige a la sección del rol real y no renderiza los hijos (operador no ve navegación de admin)", () => {
    usarSesionMock.mockReturnValue({ data: { id: "1", rol: "operador" }, isLoading: false });

    render(
      <GuardiaRol rol="admin">
        <p>Panel de administración</p>
      </GuardiaRol>,
    );

    expect(screen.queryByText("Panel de administración")).not.toBeInTheDocument();
    expect(alReemplazar).toHaveBeenCalledWith("/chat");
  });

  it("mientras carga, no renderiza los hijos ni redirige todavía", () => {
    usarSesionMock.mockReturnValue({ data: undefined, isLoading: true });

    render(
      <GuardiaRol rol="operador">
        <p>Contenido protegido</p>
      </GuardiaRol>,
    );

    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
    expect(alReemplazar).not.toHaveBeenCalled();
  });
});
