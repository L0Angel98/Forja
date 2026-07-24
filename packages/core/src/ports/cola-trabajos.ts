export interface ColaTrabajos {
  encolar(tipo: string, payload: Record<string, unknown>): Promise<void>;
}
