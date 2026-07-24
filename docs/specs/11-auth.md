# Feature: Autenticación y RBAC

## Objetivo

Permitir que operadores, supervisores y admins ingresen al sistema y que cada acción del sistema (incluidas las del agente) se ejecute con los permisos del rol correcto.

## Decisión de diseño

Sesiones con cookie httpOnly + tabla `session` en Postgres. **No JWT**: es un monolito on-prem con un solo dominio; las sesiones en DB permiten revocación inmediata (dar de baja a un empleado surte efecto al instante, requisito real de planta) y eliminan la complejidad de refresh tokens. Rate limiting con `@fastify/rate-limit` respaldado en Postgres.

## Casos de uso

- Login correcto → sesión creada, redirección según rol.
- Password incorrecta → error genérico (no revelar si el usuario existe).
- Usuario inexistente → mismo error genérico que password incorrecta.
- Usuario desactivado → acceso denegado con mensaje específico.
- Logout → sesión revocada en DB.
- Sesión expirada (inactividad configurable, default 12 h; tablets de piso: opción "dispositivo compartido" con expiración 15 min).
- Admin desactiva usuario → sus sesiones activas quedan inválidas en la siguiente petición.

## UI

- Email/usuario y password. Sin "recordarme" en dispositivos compartidos de piso; disponible solo si el dispositivo no está marcado como compartido.
- Selector de idioma (es-MX default).

## API

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET  /api/auth/me`

## Roles (RBAC)

| Rol | Permisos |
|---|---|
| operador | crear reportes de falla, consultar documentos y sensores de sus áreas |
| supervisor | todo lo del operador + aprobar/rechazar borradores, ver todas las áreas, gestionar rutinas |
| admin | todo + usuarios, máquinas, workspace, conectores |

- Middleware `requiereRol(...)` en Fastify; además el **registro de herramientas del agente filtra por rol**: un operador no ve la herramienta de aprobación.
- Permisos verificados en el caso de uso (core), no solo en la ruta.

## Validaciones

- Email válido, password requerida (mín. 10 caracteres al crear usuarios).
- Hash con argon2id.

## Seguridad

- Rate limit: 5 intentos/min por IP+usuario, backoff exponencial.
- Cookie: httpOnly, SameSite=Lax, Secure detrás de Caddy.
- Registro de auditoría: login, logout, intentos fallidos.

## Acceptance Criteria

- Los 7 casos de uso tienen test (unitario en core + integración de sesión).
- Un usuario desactivado con sesión abierta recibe 401 en su siguiente petición.
- Los intentos fallidos por encima del límite reciben 429 y quedan auditados.
- El agente, en sesión de operador, no tiene acceso a herramientas de supervisor (eval incluido).
