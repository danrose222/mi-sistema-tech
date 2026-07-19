// Integración con la API de Andreani (proveedor logístico confirmado por el
// cliente). Por ahora son stubs: devuelven datos simulados para poder
// desarrollar y probar el resto del flujo (checkout, panel admin) sin
// depender todavía de credenciales reales ni de la disponibilidad de la API.
// Cuando se integre de verdad, acá van las llamadas HTTP autenticadas con
// ANDREANI_USUARIO / ANDREANI_CONTRASENA / ANDREANI_CLIENTE_ID.

const ANDREANI_USUARIO = process.env.ANDREANI_USUARIO;
const ANDREANI_CONTRASENA = process.env.ANDREANI_CONTRASENA;
const ANDREANI_CLIENTE_ID = process.env.ANDREANI_CLIENTE_ID;

if (!ANDREANI_USUARIO || !ANDREANI_CONTRASENA || !ANDREANI_CLIENTE_ID) {
  console.warn('Aviso: las variables ANDREANI_USUARIO, ANDREANI_CONTRASENA y ANDREANI_CLIENTE_ID no están configuradas. El servicio de Andreani funciona en modo simulado.');
}

/**
 * Cotiza el costo y plazo de envío para un origen/destino/peso dados.
 * TODO: reemplazar por la llamada real a la API de cotización de Andreani
 * una vez que estén las credenciales de producción.
 */
exports.cotizarEnvio = async ({ codigoPostalOrigen, codigoPostalDestino, peso, valorDeclarado } = {}) => {
  return {
    simulado: true,
    codigoPostalOrigen: codigoPostalOrigen || null,
    codigoPostalDestino: codigoPostalDestino || null,
    peso: peso || null,
    valorDeclarado: valorDeclarado || null,
    costo: 0,
    plazoEntregaDias: null
  };
};

/**
 * Genera una orden de envío en Andreani a partir de los datos del pedido y
 * el destinatario. TODO: reemplazar por la llamada real de alta de envío.
 */
exports.crearEnvio = async ({ pedidoId, destinatario, direccion, bultos } = {}) => {
  return {
    simulado: true,
    pedidoId: pedidoId || null,
    destinatario: destinatario || null,
    direccion: direccion || null,
    bultos: bultos || null,
    numeroDeEnvio: null,
    etiquetaUrl: null
  };
};

/**
 * Consulta el estado/tracking de un envío ya creado por su número de envío.
 * TODO: reemplazar por la llamada real de tracking.
 */
exports.obtenerTracking = async (numeroDeEnvio) => {
  return {
    simulado: true,
    numeroDeEnvio: numeroDeEnvio || null,
    estado: null,
    eventos: []
  };
};
