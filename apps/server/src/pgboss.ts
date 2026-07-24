import PgBoss from "pg-boss";

export async function iniciarPgBoss(connectionString: string): Promise<PgBoss> {
  const boss = new PgBoss(connectionString);
  boss.on("error", (error) => console.error("pg-boss error:", error));
  await boss.start();
  return boss;
}
