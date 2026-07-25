/**
 * Login de operador antes de auditar /chat con Lighthouse (spec
 * 02-interfaz: "Lighthouse en la vista de operador"). .cjs a propósito:
 * apps/web/package.json usa "type": "module", y @lhci/cli hace
 * require() directo de este archivo (CommonJS, no ESM).
 */
module.exports = async (browser) => {
  const page = await browser.newPage();
  await page.goto("http://localhost:3100/iniciar-sesion", { waitUntil: "networkidle0" });
  await page.type('input[type="email"]', "operador@forja.local");
  await page.type('input[type="password"]', "Forja123!");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click('button[type="submit"]')]);
  await page.close();
};
