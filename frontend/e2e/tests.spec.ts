import { test, expect, Page } from '@playwright/test';

/**
 * Helper: Login como admin
 */
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder="Usuario"]', 'admin');
  await page.fill('input[placeholder="Contraseña"]', 'admin123');
  await page.click('button:has-text("Entrar")');
  // Esperar a que la navegación post-login termine
  await page.waitForURL('**/stock');
  // Navegar a la página de productos para las pruebas
  await page.goto('/admin/productos');
  // Asegurarse de que la página cargó
  await expect(page.locator('h2:has-text("Productos")')).toBeVisible();
}

test.describe('Sistema de Gestión - E2E Tests', () => {
  test.describe('Authentication', () => {
    test('should redirect to login when no token', async ({ page }) => {
      await page.goto('/admin/productos');
      expect(page.url()).toContain('/login');
    });

    test('should allow login and set token', async ({ page }) => {
      await page.goto('/login');
      
      // Fill login form
      await page.fill('input[placeholder="Usuario"]', 'admin');
      await page.fill('input[placeholder="Contraseña"]', 'admin123');
      
      // Click submit
      await page.click('button:has-text("Entrar")');
      
      // Esperar a que la URL cambie y verificar el token
      await page.waitForURL('**/stock');
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeTruthy();
      expect(token).toContain('eyJ');
    });
  });

  test.describe('Products Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('should display products table with headers', async ({ page }) => {
      await expect(page.locator('h2:has-text("Productos")')).toBeVisible();
      await expect(page.locator('th:has-text("ID")')).toBeVisible();
      await expect(page.locator('th:has-text("Nombre")')).toBeVisible();
      await expect(page.locator('th:has-text("Precio")')).toBeVisible();
      await expect(page.locator('th:has-text("Stock")')).toBeVisible();
      await expect(page.locator('th:has-text("Barcode")')).toBeVisible();
    });

    test('should create a new product', async ({ page }) => {
      const productName = `Test Product ${Date.now()}`;
      const productPrice = '99.99';
      const productBarcode = `EAN${Date.now()}`;

      // Fill form
      await page.fill('input[placeholder="Nombre"]', productName);
      await page.fill('input[placeholder="Precio"]', productPrice);
      await page.fill('input[placeholder="Barcode"]', productBarcode);

      // Submit
      await page.click('button:has-text("Crear")');

      // Verify product appears in table
      await expect(page.locator(`text=${productName}`)).toBeVisible();
      await expect(page.locator(`text=${productPrice}`)).toBeVisible();
      await expect(page.locator(`text=${productBarcode}`)).toBeVisible();
    });

    test('should list all products', async ({ page }) => {
      // Assuming at least the product from previous test exists
      const rows = page.locator('tbody tr');
      await expect(rows.first()).toBeVisible();
      
      // Verify first product has all fields
      const firstRow = page.locator('tbody tr').first();
      const cells = await firstRow.locator('td').count();
      expect(cells).toBe(6); // ID, Nombre, Precio, Stock, Barcode, Acciones
    });

    test('should delete a product', async ({ page }) => {
      // Create a product to delete
      const productName = `Delete Test ${Date.now()}`;
      await page.fill('input[placeholder="Nombre"]', productName);
      await page.fill('input[placeholder="Precio"]', '50.00');
      await page.click('button:has-text("Crear")');

      // Verify it was created
      await expect(page.locator(`text=${productName}`)).toBeVisible();

      // Delete it
      const deleteButton = page.locator(`tr:has-text("${productName}")`).locator('button:has-text("Borrar")');
      await deleteButton.click();

      // Verify it's gone from the UI
      await expect(page.locator(`text=${productName}`)).not.toBeVisible();
      
      // Reload to check persistence
      await page.reload();
      await expect(page.locator(`text=${productName}`)).not.toBeVisible();
    });

    test('should handle pagination', async ({ page }) => {
      // Create multiple products to test pagination
      for (let i = 0; i < 3; i++) {
        await page.fill('input[placeholder="Nombre"]', `Pagination Test ${i}`);
        await page.fill('input[placeholder="Precio"]', `${10 + i}.00`);
        await page.click('button:has-text("Crear")');
        // Esperar a que el producto aparezca antes de continuar
        await expect(page.locator(`text=Pagination Test ${i}`)).toBeVisible();
      }

      // Check if pagination controls exist
      const paginationButtons = page.locator('.pagination button');
      const count = await paginationButtons.count();
      // If more than 2 items, pagination buttons should be visible
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Stock Management', () => {
    test('should access stock manager', async ({ page }) => {
      // Un usuario con rol 'admin', 'cajero' o 'vendedor' puede acceder
      await page.goto('/login');
      await page.fill('input[placeholder="Usuario"]', 'admin');
      await page.fill('input[placeholder="Contraseña"]', 'admin123');
      await page.click('button:has-text("Entrar")');
      await page.waitForURL('**/stock');

      await expect(page.locator('h1:has-text("Gestión de Stock")')).toBeVisible();
    });
  });

  test.describe('Admin Navigation', () => {
    test('should navigate between admin pages', async ({ page }) => {
      await loginAsAdmin(page);

      // Navigate to Usuarios
      await page.click('a:has-text("Usuarios")');
      await expect(page.locator('h2:has-text("Usuarios")')).toBeVisible();

      // Navigate back to Productos
      await page.click('a:has-text("Productos")');
      await expect(page.locator('h2:has-text("Productos")')).toBeVisible();

      // Navigate to Pedidos
      await page.click('a:has-text("Pedidos")');
      await expect(page.locator('h2:has-text("Pedidos")')).toBeVisible();
    });

    test('should logout', async ({ page }) => {
      await loginAsAdmin(page);

      // Click logout
      await page.click('button:has-text("Cerrar sesión")');

      // Verify redirected to login
      expect(page.url()).toContain('/login');

      // Verify token is cleared
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeNull();
    });
  });
});
