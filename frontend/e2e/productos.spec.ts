import { test, expect } from '@playwright/test';
import { buscarProductoAdmin, loginComoAdmin } from './helpers';

test.describe('Gestión de productos', () => {
  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('crea un producto y aparece en el listado', async ({ page }) => {
    const sufijo = Date.now();
    const nombre = `Producto E2E ${sufijo}`;
    const sku = `E2E-${sufijo}`;

    await page.goto('/admin/productos');
    await page.getByRole('button', { name: 'Nuevo Producto' }).click();

    const dialogo = page.getByRole('dialog', { name: 'Nuevo Producto' });
    await dialogo.getByLabel('Nombre').fill(nombre);
    await dialogo.getByLabel('SKU').fill(sku);
    await dialogo.getByLabel('Precio').fill('25000');
    await dialogo.getByLabel('Stock').fill('7');
    await dialogo.getByRole('button', { name: 'Guardar' }).click();
    await expect(dialogo).toBeHidden();

    const fila = await buscarProductoAdmin(page, sku);
    await expect(fila).toContainText(nombre);
    await expect(fila.getByRole('cell').nth(2)).toHaveText('7');
  });
});
