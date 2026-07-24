import { describe, expect, it, vi } from "vitest";
import type PgBoss from "pg-boss";
import { ColaTrabajosPgBoss } from "../cola-trabajos-pgboss";

describe("ColaTrabajosPgBoss", () => {
  it("delega encolar() en boss.send() con el tipo y el payload", async () => {
    const send = vi.fn().mockResolvedValue("job-1");
    const boss = { send } as unknown as PgBoss;
    const cola = new ColaTrabajosPgBoss(boss);

    await cola.encolar("materializar-snapshot", { failureReportId: "reporte-1" });

    expect(send).toHaveBeenCalledWith("materializar-snapshot", { failureReportId: "reporte-1" });
  });
});
