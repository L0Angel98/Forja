import { ProveedorI18n } from "@forja/ui";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BandejaFallas } from "../bandeja-fallas";

function envolver() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={cliente}>
      <ProveedorI18n>
        <BandejaFallas />
      </ProveedorI18n>
    </QueryClientProvider>
  );
}

const FALLA = {
  id: "f1",
  machineId: "PRE-03",
  descripcion: "Ruido anormal en el motor",
  severidad: 3,
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BandejaFallas (aterrizaje de supervisor: bandeja de pendientes de aprobación)", () => {
  it("muestra las fallas abiertas devueltas por GET /api/fallas?estado=abierto", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ fallas: [FALLA] }), { status: 200 }));

    render(envolver());

    expect(await screen.findByText("PRE-03")).toBeInTheDocument();
    expect(screen.getByText("Ruido anormal en el motor")).toBeInTheDocument();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/fallas?estado=abierto",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("sin fallas abiertas, muestra el estado vacío de la bandeja", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ fallas: [] }), { status: 200 }));

    render(envolver());

    expect(await screen.findByText("Sin fallas pendientes")).toBeInTheDocument();
  });

  it("al avanzar una falla a en_revision, hace PATCH y la refresca", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ fallas: [FALLA] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ reporte: { ...FALLA, estado: "en_revision" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ fallas: [] }), { status: 200 }));

    const usuario = userEvent.setup();
    render(envolver());

    await screen.findByText("PRE-03");
    await usuario.click(screen.getByRole("button", { name: "Poner en revisión" }));

    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/fallas/f1/estado",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ estado: "en_revision" }) }),
      ),
    );
  });
});
