import type { Notificacion } from "../entities/notificacion";

export interface RepositorioNotificaciones {
  crear(notificacion: Notificacion): Promise<void>;
  listar(areaId?: string): Promise<Notificacion[]>;
}
