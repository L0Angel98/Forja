export interface Sesion {
  readonly id: string;
  readonly usuarioId: string;
  readonly dispositivoCompartido: boolean;
  readonly creadaEn: Date;
  readonly ultimaActividadEn: Date;
}
