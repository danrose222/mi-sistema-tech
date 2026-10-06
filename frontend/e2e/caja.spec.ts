import { test, expect } from '@playwright/test';
import { loginComoAdmin, stockEnAdmin } from './helpers';

// "Funda iPhone 15" del seed: no requiere IMEI, así que se vende sin diálogo extra.
const FUNDA = { nombre: 'Funda iPhone 15', barcode: '9999999999999' };

test.describe('Caja (POS)', () => {
  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('vende en efectivo escaneando el código de barras y descuenta stock', async ({ page }) => {
    const stockInicial = await stockEnAdmin(page, FUNDA.nombre);

    await page.goto('/admin/caja');
    // El lector láser emula un teclado: tipea el código y manda Enter.
    const lector = page.getByLabel('Escanear código de barras');
    await lector.fill(FUNDA.barcode);
    await lector.press('Enter');

    await expect(page.getByRole('row').filter({ hasText: FUNDA.nombre })).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar Venta' }).click();

    const pago = page.getByRole('dialog', { name: 'Confirmar Pago' });
    await expect(pago.getByLabel('Efectivo')).toHaveValue('15000');
    await pago.getByRole('button', { name: 'Finalizar Venta' }).click();

    await expect(page.getByText('Venta registrada correctamente')).toBeVisible();
    const comprobante = page.getByRole('dialog', { name: /^Pedido #\d+$/ });
    await expect(comprobante).toContainText(/Estado:\s*pagado/);
    await expect(comprobante).toContainText('Efectivo (Mostrador)');

    expect(await stockEnAdmin(page, FUNDA.nombre)).toBe(stockInicial - 1);
  });
});
