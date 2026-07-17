const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Cel Shop Center <no-reply@celshopcenter.com.ar>';

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.warn('Aviso: las variables SMTP_HOST, SMTP_USER y SMTP_PASS no están configuradas. El servicio de email no funcionará sin ellas.');
}

// Transportador SMTP genérico: sirve tanto para un proveedor transaccional
// (SendGrid, Resend, Amazon SES vía SMTP, etc.) como para un SMTP tradicional
// (ej. Gmail con contraseña de aplicación) sin acoplarse a un SDK propietario.
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
});

function escapeHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatearMonto(monto) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(monto) || 0);
}

/**
 * Arma el HTML del comprobante de compra.
 * @param {Object} pedido - Registro de pedidos (id, total, created_at, cliente_nombre).
 * @param {Array} items - Items del pedido (producto_nombre, cantidad, precio_unitario).
 * @returns {string} HTML listo para enviar como body del correo.
 */
function construirHtmlComprobante({ pedido, items }) {
  const fecha = new Date(pedido.created_at).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const filas = items.map((item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${escapeHtml(item.producto_nombre)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;text-align:center;">${item.cantidad}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;text-align:right;">${formatearMonto(item.precio_unitario)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;text-align:right;">${formatearMonto(item.cantidad * item.precio_unitario)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">
            <tr>
              <td style="background-color:#08080f;padding:32px;text-align:center;">
                <h1 style="color:#ffffff;margin:0;font-size:22px;font-family:Arial,Helvetica,sans-serif;">¡Gracias por tu compra en Cel Shop Center!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px;">
                  Hola${pedido.cliente_nombre ? ` ${escapeHtml(pedido.cliente_nombre)}` : ''}, confirmamos que recibimos tu pago. Acá tenés el comprobante con el detalle de tu compra.
                </p>
                <p style="color:#64748b;font-size:13px;line-height:1.5;margin:0 0 24px;">
                  Cel Shop Center · Dean Funes 463, Capilla del Monte, Córdoba
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                  <tr>
                    <td style="font-size:12px;color:#64748b;text-transform:uppercase;">Pedido</td>
                    <td style="font-size:12px;color:#64748b;text-transform:uppercase;text-align:right;">Fecha</td>
                  </tr>
                  <tr>
                    <td style="font-size:16px;font-weight:bold;color:#0f172a;">#${pedido.id}</td>
                    <td style="font-size:16px;font-weight:bold;color:#0f172a;text-align:right;">${fecha}</td>
                  </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:8px;">
                  <thead>
                    <tr style="background-color:#f8fafc;">
                      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.03em;">Producto</th>
                      <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.03em;">Cant.</th>
                      <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.03em;">P. Unit.</th>
                      <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.03em;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filas}
                  </tbody>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-top:12px;border-top:2px solid #0f172a;font-size:14px;color:#334155;">Total</td>
                    <td style="padding-top:12px;border-top:2px solid #0f172a;font-size:20px;font-weight:bold;color:#0f172a;text-align:right;">${formatearMonto(pedido.total)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f8fafc;padding:20px 32px;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:12px;">Este comprobante es un documento interno, no válido como factura.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}

/**
 * Envía el comprobante de compra al email del comprador.
 * No trata la falta de email/SMTP como error: solo lo loguea y no envía,
 * para que el llamador decida si eso amerita un console.error propio.
 * @param {Object} params
 * @param {Object} params.pedido - Pedido con cliente_email, total, created_at, id.
 * @param {Array} params.items - Items del pedido.
 */
exports.enviarComprobanteCompra = async ({ pedido, items }) => {
  if (!pedido.cliente_email) {
    console.warn(`[EmailService] Pedido #${pedido.id} no tiene email registrado, se omite el envío del comprobante.`);
    return;
  }
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[EmailService] SMTP no configurado (SMTP_HOST/SMTP_USER/SMTP_PASS), se omite el envío del comprobante.');
    return;
  }

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: pedido.cliente_email,
    subject: `Tu compra en Cel Shop Center - Pedido #${pedido.id}`,
    html: construirHtmlComprobante({ pedido, items })
  });
};

exports.construirHtmlComprobante = construirHtmlComprobante;
