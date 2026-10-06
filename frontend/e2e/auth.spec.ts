import { test, expect } from '@playwright/test';
import { ADMIN, loginComoAdmin } from './helpers';

test.describe('Autenticación del panel admin', () => {
  test('redirige al login si no hay sesión', async ({ page }) => {
    await page.goto('/admin/productos');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('muestra error con credenciales inválidas', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Usuario').fill(ADMIN.username);
    await page.getByLabel('Contraseña').fill('contraseña-incorrecta');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByText('Credenciales inválidas o error de conexión.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('inicia sesión, guarda el token y lo borra al cerrar sesión', async ({ page }) => {
    await loginComoAdmin(page);

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('token'))).toMatch(/^eyJ/);

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();

    // Sin sesión, las rutas del admin vuelven a estar protegidas.
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('navega entre las secciones del admin', async ({ page }) => {
    await loginComoAdmin(page);
    const nav = page.getByRole('navigation');

    await nav.getByRole('link', { name: 'Productos' }).click();
    await expect(page.getByRole('heading', { name: 'Gestión de Productos' })).toBeVisible();

    await nav.getByRole('link', { name: 'Caja' }).click();
    await expect(page.getByRole('heading', { name: 'Punto de Venta' })).toBeVisible();
  });
});
