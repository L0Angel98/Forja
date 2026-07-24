export interface RegistroIntentos {
  readonly intentosConsecutivos: number;
  readonly bloqueadoHasta: Date | null;
  readonly vecesBloqueado: number;
  readonly ultimoIntentoEn: Date;
}

export interface RepositorioIntentosLogin {
  obtener(ip: string, email: string): Promise<RegistroIntentos | null>;
  guardar(ip: string, email: string, registro: RegistroIntentos): Promise<void>;
  eliminar(ip: string, email: string): Promise<void>;
}
