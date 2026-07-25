import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProveedorI18n } from "../../i18n/contexto";
import { SubidaArchivo } from "../SubidaArchivo";

function envolver(children: ReactNode) {
  return <ProveedorI18n>{children}</ProveedorI18n>;
}

function crearArchivo(nombre = "falla.jpg"): File {
  return new File(["contenido"], nombre, { type: "image/jpeg" });
}

describe("SubidaArchivo", () => {
  it("inactivo: muestra los dos puntos de entrada (Tomar foto / Elegir archivo)", () => {
    render(envolver(<SubidaArchivo onSeleccionar={vi.fn()} />));

    expect(screen.getByRole("button", { name: "Tomar foto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir archivo" })).toBeInTheDocument();
  });

  it("el input de cámara tiene capture=environment; el de elegir archivo no", () => {
    const { container } = render(envolver(<SubidaArchivo onSeleccionar={vi.fn()} />));
    const inputs = container.querySelectorAll("input[type='file']");

    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveAttribute("capture", "environment");
    expect(inputs[1]).not.toHaveAttribute("capture");
  });

  it("seleccionar un archivo por 'Elegir archivo' dispara onSeleccionar con el archivo", async () => {
    const alSeleccionar = vi.fn();
    const usuario = userEvent.setup();
    const { container } = render(envolver(<SubidaArchivo onSeleccionar={alSeleccionar} />));

    const archivo = crearArchivo();
    const inputArchivo = container.querySelectorAll("input[type='file']")[1] as HTMLInputElement;
    await usuario.upload(inputArchivo, archivo);

    expect(alSeleccionar).toHaveBeenCalledWith(archivo);
  });

  it("subiendo: muestra el nombre del archivo y una barra de progreso", () => {
    render(envolver(<SubidaArchivo onSeleccionar={vi.fn()} estado="subiendo" progreso={40} nombreArchivo="falla.jpg" />));

    expect(screen.getByText("falla.jpg")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveValue(40);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("error: expone role=alert, el mensaje de error y el botón de reintentar", async () => {
    const alReintentar = vi.fn();
    const usuario = userEvent.setup();
    render(
      envolver(
        <SubidaArchivo onSeleccionar={vi.fn()} estado="error" nombreArchivo="falla.jpg" onReintentar={alReintentar} />,
      ),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo subir. Tus datos siguen aquí");

    await usuario.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(alReintentar).toHaveBeenCalledTimes(1);
  });

  it("con onQuitar, muestra el botón Quitar y dispara el callback al hacer clic", async () => {
    const alQuitar = vi.fn();
    const usuario = userEvent.setup();
    render(
      envolver(<SubidaArchivo onSeleccionar={vi.fn()} estado="completado" nombreArchivo="falla.jpg" onQuitar={alQuitar} />),
    );

    await usuario.click(screen.getByRole("button", { name: "Quitar" }));
    expect(alQuitar).toHaveBeenCalledTimes(1);
  });

  it("sin onQuitar, no muestra el botón Quitar", () => {
    render(envolver(<SubidaArchivo onSeleccionar={vi.fn()} estado="completado" nombreArchivo="falla.jpg" />));
    expect(screen.queryByRole("button", { name: "Quitar" })).not.toBeInTheDocument();
  });
});
