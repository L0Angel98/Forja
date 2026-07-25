import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// jsdom no implementa matchMedia. Se necesita porque @forja/ui se importa
// aquí desde su barrel (index.ts), que también exporta GraficaSensor, y el
// módulo "uplot" llama matchMedia() apenas se importa (no solo al montar).
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

afterEach(() => {
  cleanup();
});
