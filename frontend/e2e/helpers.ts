import { expect, Page } from '@playwright/test';

// Usuario admin que crea backend/scripts/seed.js.
export const ADMIN = { username: 'admin', password: 'admin123' };

export async function loginComoAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(ADMIN.username);
  await page.getByLabel('Contraseña').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL('**/admin/dashboard');
}

/**
 * Busca un producto en el listado del admin y devuelve su fila.
 */
export async function buscarProductoAdmin(page: Page, texto: string) {
  await page.goto('/admin/productos');
  await page.getByLabel('Buscar por nombre, SKU o código de barras...').fill(texto);
  const fila = page.getByRole('row').filter({ hasText: texto });
  await expect(fila).toHaveCount(1);
  return fila;
}

/**
 * Stock que muestra la tabla de productos del admin (3ra columna).
 */
export async function stockEnAdmin(page: Page, texto: string): Promise<number> {
  const fila = await buscarProductoAdmin(page, texto);
  return Number(await fila.getByRole('cell').nth(2).innerText());
}
