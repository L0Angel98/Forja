import type { LecturaCuarentena } from "../entities/lectura-cuarentena";

export interface RepositorioCuarentena {
  crear(lectura: LecturaCuarentena): Promise<void>;
  contar(): Promise<number>;
}
