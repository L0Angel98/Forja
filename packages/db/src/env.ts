import { ErrorDominio } from "@forja/shared";

class VariableDeEntornoFaltante extends ErrorDominio {
  readonly codigo = "VARIABLE_DE_ENTORNO_FALTANTE";
}

export function databaseUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new VariableDeEntornoFaltante(
      "Falta la variable de entorno DATABASE_URL. Copia .env.example a .env y complétala.",
    );
  }
  return url;
}
