/**
 * "Cero colores literales fuera de tokens.ts" (spec 02-interfaz). Se
 * prohíbe todo color literal (hex, nombrado, rgb()/hsl()) en cualquier
 * propiedad — más robusto que limitar la regla a una lista de propiedades
 * "de color", porque esas listas no manejan bien shorthands como
 * `border: 1px solid <color>` (la regla vería el shorthand completo y
 * fallaría también en "1px"/"solid", que no son colores).
 *
 * tokens.css es la única excepción: es la fuente de verdad de los valores
 * literales (verificada contra tokens.ts en
 * packages/ui/src/__tests__/tokens.test.ts), así que su override
 * desactiva estas reglas.
 */
export default {
  extends: ["stylelint-config-standard"],
  rules: {
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla"],
    // CSS Modules en camelCase para que cada clase coincida 1:1 con la
    // clave correspondiente en TS (estilos.filaUsuario); guiones permitidos
    // para utilidades globales fuera de módulos (.forja-mono en base.css).
    "selector-class-pattern": "^[a-z][a-zA-Z0-9-]*$",
    // tokens.css agrupa variables relacionadas con líneas en blanco a
    // propósito, por legibilidad.
    "custom-property-empty-line-before": null,
  },
  overrides: [
    {
      files: ["**/tokens.css"],
      rules: {
        "color-no-hex": null,
        "color-named": null,
        "function-disallowed-list": null,
      },
    },
  ],
};
