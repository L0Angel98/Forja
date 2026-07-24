import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import estilos from "../Skeleton.module.css";
import { Skeleton } from "../Skeleton";

describe("Skeleton", () => {
  it("es decorativo (aria-hidden) para no ser anunciado por lectores de pantalla", () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });

  it("aplica ancho y alto personalizados vía estilo inline", () => {
    const { container } = render(<Skeleton ancho="120px" alto="24px" />);
    const nodo = container.firstElementChild as HTMLElement;
    expect(nodo.style.width).toBe("120px");
    expect(nodo.style.height).toBe("24px");
  });

  it("por defecto usa radio de control", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveClass(estilos.control ?? "");
  });

  it("acepta radio circulo para avatares/iconos", () => {
    const { container } = render(<Skeleton radio="circulo" />);
    expect(container.firstElementChild).toHaveClass(estilos.circulo ?? "");
  });
});
