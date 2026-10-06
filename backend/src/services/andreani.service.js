// Integración con la API de Andreani (proveedor logístico confirmado por el
// cliente). Con las credenciales cargadas hace las llamadas HTTP reales;
// sin ellas, sigue devolviendo datos simulados para no romper el resto del
// flujo (checkout, panel admin) mientras se gestiona la cuenta corriente.
//
// ⚠️ IMPORTANTE: no hay credenciales todavía, así que nada de esto pudo
// probarse de punta a punta. Lo que SÍ se pudo verificar contra la API real
// (apis.andreani.com) sin necesitar autenticación, a partir de los mensajes
// de validación que devuelve ante parámetros faltantes/incorrectos:
//   - GET /v1/tarifas es una ruta real y espera cpOrigen, cpDestino,
//     contrato, cliente y un array bultos[indice][valor|kilos|volumen]
//     (confirmado: devuelve un error puntual por cada uno de estos campos
//     cuando falta, y dejar de quejarse de ellos al completarlos todos).
//   - POST /v2/ordenes-de-envio y GET /v2/envios/{id}/trazas SON rutas
//     reales (devuelven 401 Unauthorized, no 404), pero exigen auth válida
//     antes de validar el body/parámetros, así que la forma exacta del
//     payload de crearEnvio y la ruta exacta de obtenerTracking (¿v1 o v2?)
//     siguen sin confirmar. Falta re-verificar estas dos apenas haya
//     credenciales reales.
const axios = require('axios');

const ANDREANI_USUARIO = process.env.ANDREANI_USUARIO;
const ANDREANI_CONTRASENA = process.env.ANDREANI_CONTRASENA;
const ANDREANI_CLIENTE_ID = process.env.ANDREANI_CLIENTE_ID;
const ANDREANI_BASE_URL = process.env.ANDREANI_BASE_URL || 'https://apis.andreani.com';

const CREDENCIALES_COMPLETAS = Boolean(ANDREANI_USUARIO && ANDREANI_CONTRASENA && ANDREANI_CLIENTE_ID);

if (!CREDENCIALES_COMPLETAS) {
  console.warn('Aviso: las variables ANDREANI_USUARIO, ANDREANI_CONTRASENA y ANDREANI_CLIENTE_ID no están configuradas. El servicio de Andreani funciona en modo simulado.');
}

// La API REST de Andreani se autentica con Basic Auth (usuario/contraseña
// de la cuenta corriente), no con un token OAuth.
const cliente = axios.create({
  baseURL: ANDREANI_BASE_URL,
  timeout: 15000,
  auth: CREDENCIALES_COMPLETAS ? { username: ANDREANI_USUARIO, password: ANDREANI_CONTRASENA } : undefined
});

/**
 * Cotiza el costo y plazo de envío para un origen/destino/peso dados.
 * Forma de los parámetros verificada contra la API real (ver nota arriba);
 * lo único pendiente de confirmar con credenciales reales es la forma
 * exacta de la respuesta (tarifaConIva/plazoEntrega son la mejor suposición).
 */
exports.cotizarEnvio = async ({ codigoPostalOrigen, codigoPostalDestino, peso, volumen, valorDeclarado } = {}) => {
  if (!CREDENCIALES_COMPLETAS) {
    return {
      simulado: true,
      codigoPostalOrigen: codigoPostalOrigen || null,
      codigoPostalDestino: codigoPostalDestino || null,
      peso: peso || null,
      valorDeclarado: valorDeclarado || null,
      costo: 0,
      plazoEntregaDias: null
    };
  }

  const { data } = await cliente.get('/v1/tarifas', {
    params: {
      contrato: ANDREANI_CLIENTE_ID,
      cliente: ANDREANI_CLIENTE_ID,
      cpOrigen: codigoPostalOrigen,
      cpDestino: codigoPostalDestino,
      'bultos[0][valor]': valorDeclarado,
      'bultos[0][kilos]': peso,
      'bultos[0][volumen]': volumen ?? 0.001
    }
  });

  return {
    simulado: false,
    codigoPostalOrigen: codigoPostalOrigen || null,
    codigoPostalDestino: codigoPostalDestino || null,
    peso: peso || null,
    valorDeclarado: valorDeclarado || null,
    costo: data?.tarifaConIva ?? null,
    plazoEntregaDias: data?.plazoEntrega ?? null
  };
};

/**
 * Genera una orden de envío en Andreani a partir de los datos del pedido y
 * el destinatario, y devuelve el número de envío junto con la URL de la
 * etiqueta para imprimir.
 */
exports.crearEnvio = async ({ pedidoId, destinatario, direccion, bultos } = {}) => {
  if (!CREDENCIALES_COMPLETAS) {
    return {
      simulado: true,
      pedidoId: pedidoId || null,
      destinatario: destinatario || null,
      direccion: direccion || null,
      bultos: bultos || null,
      numeroDeEnvio: null,
      etiquetaUrl: null
    };
  }

  const { data } = await cliente.post('/v2/ordenes-de-envio', {
    contrato: { numeroCliente: ANDREANI_CLIENTE_ID },
    destino: { postal: direccion },
    destinatario,
    bultos,
    // Referencia externa: permite reconciliar el envío de Andreani con
    // nuestro pedido sin depender de guardar el número de envío antes de
    // tenerlo (se busca por esta referencia si hace falta reintentar).
    referenciaExterna: pedidoId != null ? String(pedidoId) : undefined
  });

  const numeroDeEnvio = data?.numeroDeEnvio ?? null;

  return {
    simulado: false,
    pedidoId: pedidoId || null,
    destinatario: destinatario || null,
    direccion: direccion || null,
    bultos: bultos || null,
    numeroDeEnvio,
    etiquetaUrl: numeroDeEnvio ? `${ANDREANI_BASE_URL}/v2/ordenes-de-envio/${numeroDeEnvio}/etiquetas` : null
  };
};

/**
 * Consulta el estado/tracking de un envío ya creado por su número de envío.
 */
exports.obtenerTracking = async (numeroDeEnvio) => {
  if (!CREDENCIALES_COMPLETAS) {
    return {
      simulado: true,
      numeroDeEnvio: numeroDeEnvio || null,
      estado: null,
      eventos: []
    };
  }
  if (!numeroDeEnvio) {
    throw new Error('numeroDeEnvio es requerido');
  }

  const { data } = await cliente.get(`/v2/envios/${numeroDeEnvio}/trazas`);
  const eventos = Array.isArray(data) ? data : [];

  return {
    simulado: false,
    numeroDeEnvio,
    estado: eventos[0]?.estado ?? null,
    eventos
  };
};
