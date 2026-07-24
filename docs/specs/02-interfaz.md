# Interfaz — Estándares de UI y Design System

> Transversal: aplica a toda pantalla de `apps/web`. Leer junto con `00-contexto.md` y `01-estandares.md`. Las secciones "UI" de las specs 11–17 describen *qué* pantallas; esta describe *cómo* se construyen todas.

## Objetivo

Una PWA usable por un operador con guantes, en una tablet montada en piso, con ruido, mala luz y pantalla sucia — y por un supervisor en escritorio revisando datos. Ambos perfiles, una sola aplicación.

## Contexto de uso (esto manda sobre cualquier preferencia estética)

| Perfil | Dispositivo | Condiciones |
|---|---|---|
| Operador | Tablet 10" montada o teléfono | Guantes, luz variable, prisa, posible baja alfabetización digital |
| Supervisor | Laptop / escritorio | Sesiones largas, lectura de datos, aprobaciones |
| Admin | Escritorio | Configuración, carga de documentos, workspace |

Consecuencias no negociables:

- **Touch targets ≥ 56×56 px** en vistas de operador (guantes), separación mínima 12 px.
- **Contraste mínimo AA en todo, AAA en texto crítico** (severidad, estados, alertas). La pantalla se ve con reflejo de lámparas industriales.
- **Tipografía base 18 px** en vistas de operador (no 14/16). Escala completa definida abajo.
- **Cero hover como único canal de información**: todo estado se comunica también por color + forma + texto.
- **Sin scroll horizontal jamás.** El flujo de reporte cabe en una columna.

## Design tokens

Definir en `packages/ui/tokens.ts` y exponer como variables CSS. **Ningún componente usa colores literales.**

**Color** — la paleta se deriva del vocabulario visual de planta (señalización industrial y torretas andon), no de una paleta genérica de dashboard. El color codifica estado real, nunca decora.

| Token | Hex | Uso |
|---|---|---|
| `--acero-900` | `#14181D` | Fondo app (modo oscuro default en piso) |
| `--acero-700` | `#242C35` | Superficies, tarjetas |
| `--acero-300` | `#8A97A6` | Texto secundario, bordes |
| `--acero-050` | `#EEF2F6` | Texto principal sobre oscuro |
| `--andon-verde` | `#1F9D55` | Operativo / atendido / éxito |
| `--andon-ambar` | `#E0A200` | Advertencia / pendiente de aprobación / sensor mudo |
| `--andon-rojo` | `#D0342C` | Falla crítica / error / paro |
| `--senal-azul` | `#2D6FD1` | Acción primaria, enlaces, foco |

Severidad 1–4 mapea a verde → ámbar → naranja → rojo, **siempre acompañada de etiqueta textual e ícono distinto por nivel** (daltonismo es común y en planta nadie pregunta).

**Tipografía** — dos familias, ambas open source y auto-hospedadas (sin CDN: hay instalaciones air-gapped):

- **Display/UI:** Inter Tight — alta legibilidad a distancia, números tabulares para datos.
- **Datos/código:** JetBrains Mono — IDs de máquina, tags de sensor, timestamps. Los tags de equipo (`PRE-03`, `HRN-01`) se muestran siempre en mono: en planta esos códigos son identidad, y monoespaciado evita confundir 0/O y 1/l.

Escala (rem, base 16): 0.75 / 0.875 / 1 / 1.125 (base operador) / 1.375 / 1.75 / 2.25. Interlínea 1.5 en cuerpo, 1.2 en títulos.

**Espaciado:** escala de 4 px (4, 8, 12, 16, 24, 32, 48, 64). **Radios:** 4 px (controles) / 8 px (tarjetas). **Sombras:** ninguna; la jerarquía se comunica con superficie y borde — las sombras se pierden con reflejo.

## Elemento distintivo: la barra de estado de máquina

Cada tarjeta de máquina, reporte o conversación lleva una **franja vertical de 6 px** a la izquierda con el color andon del estado. Es el mismo lenguaje que la torreta física sobre la máquina: un operador entiende la pantalla sin leerla. Es el único elemento decorativo permitido; todo lo demás es tipografía y espacio.

## Arquitectura de la interfaz

```
packages/ui/            # Design system: tokens, primitivas, Storybook
apps/web/
├── app/(operador)/     # Shell táctil: chat, reportar, mis reportes
├── app/(supervisor)/   # Shell escritorio: bandeja, aprobaciones, máquinas
├── app/(admin)/        # Workspace, documentos, conectores, usuarios, rutinas
└── components/         # Composiciones específicas de feature
```

- **Dos shells, un design system.** El rol determina el shell tras el login: operador entra a chat de pantalla completa con navegación inferior (3 destinos máximo); supervisor y admin entran a layout con navegación lateral.
- Estado de servidor con TanStack Query; nada de Redux en `web` (no hay estado global compartido que lo justifique — si aparece, va por ADR).
- Componentes primitivos sin lógica de negocio: la lógica vive en hooks que consumen la API.

## Inventario de componentes (construir en este orden)

1. `Boton`, `Campo`, `Select`, `Textarea` — variantes primario/secundario/peligro, estados: normal, hover, foco, cargando, deshabilitado.
2. `TarjetaMaquina`, `EtiquetaSeveridad`, `EtiquetaEstado` — con la franja andon.
3. `Chat` — burbujas, streaming token a token, indicador de herramienta en ejecución ("consultando sensores…"), chips de cita clicables.
4. `TarjetaConfirmacion` — resumen de la acción propuesta por el agente + botones Confirmar / Corregir. **Componente crítico de seguridad**: es la barrera humana de las specs 13 y 17. Confirmar nunca es el botón que queda bajo el pulgar por accidente; requiere intención (posición separada, sin autofoco).
5. `GraficaSensor` — serie temporal, ≤ 500 puntos, con zoom por rango preestablecido (24 h / 7 d / 30 d), sin librería pesada (uPlot o Recharts).
6. `TablaDatos` — virtualizada, con filtros; solo shells de escritorio.
7. `SubidaArchivo` — cámara directa en tablet, progreso, reintento.
8. `EstadoVacio`, `EstadoError`, `Skeleton`.

Cada componente entra con historia de Storybook incluyendo sus estados de carga, error y vacío. **Un componente sin historia de error no está terminado.**

## Estados obligatorios en toda pantalla

Ninguna vista se considera completa sin los cuatro:

- **Cargando:** skeleton con la forma del contenido real, nunca spinner centrado.
- **Vacío:** dice qué es esto y cuál es la siguiente acción. "Sin reportes esta semana — Reportar una falla".
- **Error:** qué pasó y qué hacer. "No se pudo guardar el reporte. Tus datos siguen aquí — Reintentar". Nunca disculpas, nunca códigos crudos.
- **Sin IA (degradado):** cuando el LLM no responde, banner discreto + acceso directo al formulario. El operador nunca queda bloqueado; la funcionalidad manual siempre existe.

## PWA y conectividad

- Instalable, ícono y splash propios, `display: standalone`.
- **Offline de lectura:** service worker cachea shell, últimos reportes propios y documentos consultados recientemente.
- **Offline de escritura, solo formulario de fallas:** el reporte se guarda en IndexedDB y se sincroniza al reconectar, con indicador visible "1 reporte pendiente de enviar". El chat con IA **no** funciona offline y lo dice claramente en lugar de fallar en silencio.
- Reconexión: reintento con backoff, sin recargar la página ni perder lo escrito.

## Accesibilidad (piso de rendimiento, verificado en CI)

- Navegación completa por teclado en shells de escritorio; foco visible siempre (anillo `--senal-azul` de 2 px, nunca `outline: none`).
- Semántica HTML real; ARIA solo donde no alcanza. El chat usa `aria-live="polite"` para respuestas en streaming.
- `prefers-reduced-motion` respetado: sin animaciones de entrada, solo cambios de estado inmediatos.
- Zoom hasta 200% sin romper el layout.
- `axe-core` en los tests E2E: cero violaciones críticas o serias es condición de merge.

## Copy (i18n)

- Todo texto en `packages/shared/i18n`, base `es-MX`, sin cadenas literales en componentes (regla de ESLint).
- Español de planta, no de software: "máquina", "paro", "refacción", "turno" — no "asset", "downtime", "spare part".
- Voz activa y el mismo verbo en todo el flujo: el botón dice "Reportar falla" → el mensaje de éxito dice "Falla reportada".
- Sentence case en botones y títulos. Sin signos de admiración. Sin "¡Ups!".

## Casos de uso (con test)

- Operador entra → aterriza en chat de pantalla completa; no ve navegación de admin.
- Supervisor entra → aterriza en bandeja de pendientes de aprobación.
- Respuesta del agente en streaming se anuncia a lectores de pantalla sin repetir el texto completo en cada token.
- LLM caído → banner + formulario accesible en un toque.
- Sin red al confirmar un reporte por formulario → se encola y el indicador de pendientes aparece.
- Cambio de idioma persiste entre sesiones.
- Zoom 200% en tablet: el flujo de reporte sigue completable.

## Acceptance Criteria

- Lighthouse en la vista de operador (tablet, 4G simulada): rendimiento ≥ 85, accesibilidad ≥ 95, PWA instalable.
- `axe-core` sin violaciones críticas ni serias en los flujos E2E (bloquea merge).
- Todo componente del inventario tiene historia de Storybook con estados de carga, vacío y error.
- Cero colores literales fuera de `tokens.ts` (regla de lint con `stylelint`).
- Cero cadenas de texto visibles fuera de i18n (regla de ESLint).
- Un reporte creado offline aparece en el servidor tras reconectar, sin duplicarse (test E2E).
- Contraste verificado ≥ 4.5:1 en texto normal y ≥ 7:1 en etiquetas de severidad y estado.
