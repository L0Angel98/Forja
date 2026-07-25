const NOMBRE_DB = "forja-cola-offline";
const VERSION_DB = 1;
const NOMBRE_ALMACEN = "reportes-pendientes";

export interface ReportePendiente {
  readonly id: string;
  readonly payload: Record<string, unknown>;
  readonly creadoEn: number;
}

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_DB, VERSION_DB);
    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;
      if (!db.objectStoreNames.contains(NOMBRE_ALMACEN)) {
        db.createObjectStore(NOMBRE_ALMACEN, { keyPath: "id" });
      }
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error as Error);
  });
}

/**
 * Offline de escritura, solo formulario de fallas (spec 02-interfaz): el
 * reporte se guarda en IndexedDB y se sincroniza al reconectar. Se usa la
 * API nativa de IndexedDB directamente (sin librería) — es un solo
 * almacén con operaciones simples (put/getAll/delete).
 */
export async function encolarReporte(payload: Record<string, unknown>): Promise<ReportePendiente> {
  const db = await abrirDb();
  const pendiente: ReportePendiente = { id: crypto.randomUUID(), payload, creadoEn: Date.now() };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(NOMBRE_ALMACEN, "readwrite");
    tx.objectStore(NOMBRE_ALMACEN).put(pendiente);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error as Error);
  });

  db.close();
  return pendiente;
}

export async function listarPendientes(): Promise<readonly ReportePendiente[]> {
  const db = await abrirDb();

  const pendientes = await new Promise<ReportePendiente[]>((resolve, reject) => {
    const tx = db.transaction(NOMBRE_ALMACEN, "readonly");
    const solicitud = tx.objectStore(NOMBRE_ALMACEN).getAll();
    solicitud.onsuccess = () => resolve(solicitud.result as ReportePendiente[]);
    solicitud.onerror = () => reject(solicitud.error as Error);
  });

  db.close();
  return pendientes;
}

export async function eliminarPendiente(id: string): Promise<void> {
  const db = await abrirDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(NOMBRE_ALMACEN, "readwrite");
    tx.objectStore(NOMBRE_ALMACEN).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error as Error);
  });

  db.close();
}
