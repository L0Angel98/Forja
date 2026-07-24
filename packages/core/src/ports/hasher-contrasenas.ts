export interface HasherContrasenas {
  hash(contrasenaPlana: string): Promise<string>;
  verificar(hash: string, contrasenaPlana: string): Promise<boolean>;
}
