import { describe, expect, it } from "vitest";
import { ErrorDominio } from "../domain-error";

class ErrorDePrueba extends ErrorDominio {
  readonly codigo = "ERROR_DE_PRUEBA";
}

describe("ErrorDominio", () => {
  it("expone el nombre de la subclase y el mensaje", () => {
    const error = new ErrorDePrueba("algo salió mal");

    expect(error.name).toBe("ErrorDePrueba");
    expect(error.message).toBe("algo salió mal");
    expect(error.codigo).toBe("ERROR_DE_PRUEBA");
    expect(error).toBeInstanceOf(Error);
  });
});
