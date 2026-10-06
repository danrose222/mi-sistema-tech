import { test, expect } from '@playwright/test';

const CABLE = { nombre: 'Cable USB-C 2M', precio: 'ARS12,000.00' };

test.describe('Catálogo público', () => {
  test.beforeEach(async ({ page }) => {
    // El aviso de cookies tapa parte de la pantalla en la primera visita.
    await page.goto('/');
    await page.getByRole('dialog', { name: 'Aviso de cookies' }).getByRole('button', { name: 'Aceptar' }).click();
  });

  test('lista los productos activos del catálogo', async ({ page }) => {
    await page.goto('/productos');
    await expect(page.getByRole('heading', { name: 'Catálogo', level: 1 })).toBeVisible();
    // Sin número fijo: otros tests pueden dar de alta productos en la misma corrida.
    await expect(page.getByText(/^\d+ resultados$/)).toBeVisible();
    await expect(page.getByRole('link', { name: CABLE.nombre })).toBeVisible();
  });

  test('compra con retiro y pago en efectivo en el local', async ({ page }) => {
    await page.goto('/productos');
    await page.getByRole('link', { name: CABLE.nombre }).click();
    await expect(page.getByRole('heading', { name: CABLE.nombre, level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'AGREGAR AL CARRITO' }).click();
    await page.getByRole('button', { name: 'Ver carrito' }).click();

    await expect(page.getByRole('heading', { name: 'Mi Carrito' })).toBeVisible();
    await expect(page.getByRole('heading', { name: CABLE.nombre })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar compra' }).click();

    await expect(page.getByRole('heading', { name: 'Finalizar Compra' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Retiro en Local' })).toBeChecked();
    await page.getByLabel('Nombre Completo').fill('Cliente E2E');
    await page.getByLabel('DNI').fill('40123456');
    await page.getByLabel('Email').fill('cliente.e2e@example.com');
    await page.getByLabel('Teléfono').fill('3548000000');
    // Es un <button role="radio"> propio, no un input: check() valida el estado
    // apenas termina el click, antes de que Angular actualice aria-checked.
    const efectivo = page.getByRole('radio', { name: /Efectivo en Local/ });
    await efectivo.click();
    await expect(efectivo).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('button', { name: 'Confirmar Pedido' }).click();

    await expect(page.getByRole('heading', { name: '¡Pedido Confirmado!' })).toBeVisible();
    await expect(page.getByText(/Tu pedido #\d+ quedó registrado/)).toBeVisible();
  });
});
