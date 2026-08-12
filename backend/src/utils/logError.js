// Los errores de mysql2 traen `.sql` con la query ya interpolada (valores
// reales incluidos: hashes de contraseña, montos, DNI, teléfonos) y los de
// axios traen `.config.headers` con tokens de autenticación en texto plano
// (ver whatsappService.js). Loguear el objeto Error completo con
// console.error(err) filtra esos datos a los logs de producción. Esta
// utilidad centraliza el logging de errores para que solo se imprima el
// mensaje, nunca el objeto entero.
module.exports = function logError(context, err) {
  console.error(context, err.message);
};
