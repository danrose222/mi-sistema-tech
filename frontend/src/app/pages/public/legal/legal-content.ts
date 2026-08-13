export interface SeccionLegal {
  titulo: string;
  parrafos: string[];
}

export interface PaginaLegal {
  titulo: string;
  actualizado: string;
  secciones: SeccionLegal[];
}

// Plantillas genéricas para e-commerce argentino, con los datos reales del
// titular (Sergio Sebastian Samarra, CUIL 20-27740871-7). Deben revisarse
// con un abogado antes de publicar el sitio.
export const CONTENIDO_LEGAL: Record<string, PaginaLegal> = {
  terminos: {
    titulo: 'Términos y Condiciones',
    actualizado: '27 de julio de 2026',
    secciones: [
      {
        titulo: '1. Objeto',
        parrafos: [
          'Estos Términos y Condiciones regulan el uso del sitio web y la compra de productos ofrecidos por CEL SHOP CENTER (Sergio Sebastian Samarra, CUIL 20-27740871-7), con domicilio en Dean Funes 463, Capilla del Monte, Córdoba, Argentina. Al utilizar el sitio o realizar una compra, el usuario acepta estos términos en su totalidad.'
        ]
      },
      {
        titulo: '2. Productos y precios',
        parrafos: [
          'Los precios publicados están expresados en pesos argentinos (ARS) e incluyen los impuestos vigentes. Nos reservamos el derecho de modificar precios y stock disponible sin previo aviso, salvo respecto de compras ya confirmadas.'
        ]
      },
      {
        titulo: '3. Proceso de compra y pago',
        parrafos: [
          'La compra se confirma una vez acreditado el pago a través de la pasarela habilitada (MercadoPago) o mediante los medios de financiación en cuotas ofrecidos en el local. El comprador recibirá un comprobante de la operación por los medios de contacto informados en el checkout.'
        ]
      },
      {
        titulo: '4. Envíos y entrega',
        parrafos: [
          'El comprador puede optar por retiro en el local (Dean Funes 463, Capilla del Monte, Córdoba) o envío a domicilio a través del correo/logística habilitada. Los plazos y costos de envío se informan durante el checkout antes de confirmar la compra.'
        ]
      },
      {
        titulo: '5. Garantías',
        parrafos: [
          'Todos los productos cuentan con la garantía legal prevista por la Ley 24.240 de Defensa del Consumidor, sin perjuicio de la garantía adicional del fabricante cuando corresponda.'
        ]
      },
      {
        titulo: '6. Cambios y devoluciones',
        parrafos: [
          'El comprador puede ejercer el derecho de revocación dentro de los 10 días corridos de recibido el producto, conforme el artículo 34 de la Ley 24.240. El detalle del procedimiento está disponible en la sección "Botón de Arrepentimiento" del sitio.'
        ]
      },
      {
        titulo: '7. Ley aplicable y jurisdicción',
        parrafos: [
          'Estos términos se rigen por las leyes de la República Argentina. Ante cualquier controversia, las partes se someten a los tribunales ordinarios competentes del domicilio del consumidor, conforme la normativa de defensa del consumidor vigente.'
        ]
      }
    ]
  },
  privacidad: {
    titulo: 'Política de Privacidad',
    actualizado: '27 de julio de 2026',
    secciones: [
      {
        titulo: '1. Responsable del tratamiento',
        parrafos: [
          'CEL SHOP CENTER (Sergio Sebastian Samarra, CUIL 20-27740871-7), con domicilio en Dean Funes 463, Capilla del Monte, Córdoba, es responsable del tratamiento de los datos personales recolectados a través de este sitio. Contacto: ventas@celshopcenter.com.ar.'
        ]
      },
      {
        titulo: '2. Datos que recolectamos',
        parrafos: [
          'Recolectamos los datos que el usuario proporciona voluntariamente al comprar o registrarse: nombre, DNI, teléfono, email y dirección de entrega. También recolectamos datos de navegación de forma automática (páginas visitadas, dispositivo) a través de cookies de analítica.'
        ]
      },
      {
        titulo: '3. Finalidad',
        parrafos: [
          'Los datos se utilizan para procesar compras, gestionar la financiación en cuotas, coordinar envíos, emitir comprobantes, enviar recordatorios de pago por WhatsApp y mejorar la experiencia del sitio mediante estadísticas de uso agregadas.'
        ]
      },
      {
        titulo: '4. Terceros con acceso a los datos',
        parrafos: [
          'Compartimos datos estrictamente necesarios con: MercadoPago (procesamiento de pagos), el servicio de logística/envíos, y Google Analytics (estadísticas de navegación, de forma anonimizada donde es posible). Ninguno de estos terceros puede usar los datos con fines distintos a los aquí descriptos.'
        ]
      },
      {
        titulo: '5. Derechos del titular de los datos',
        parrafos: [
          'Conforme la Ley 25.326 de Protección de Datos Personales, el titular puede ejercer sus derechos de acceso, rectificación, actualización y supresión de sus datos escribiendo a ventas@celshopcenter.com.ar. La Agencia de Acceso a la Información Pública (AAIP), en su carácter de Órgano de Control, tiene la atribución de atender denuncias y reclamos que interpongan quienes resulten afectados en sus derechos.'
        ]
      },
      {
        titulo: '6. Seguridad',
        parrafos: [
          'Adoptamos medidas técnicas y organizativas razonables para proteger los datos personales contra accesos no autorizados, pérdida o alteración.'
        ]
      }
    ]
  },
  cookies: {
    titulo: 'Política de Cookies',
    actualizado: '27 de julio de 2026',
    secciones: [
      {
        titulo: '1. Qué son las cookies',
        parrafos: [
          'Las cookies son pequeños archivos que se almacenan en tu navegador al visitar el sitio. Nos permiten recordar tus preferencias y entender cómo se usa el sitio para mejorarlo.'
        ]
      },
      {
        titulo: '2. Qué cookies usamos',
        parrafos: [
          'Cookies necesarias: imprescindibles para el funcionamiento del sitio (por ejemplo, mantener el carrito de compras y la sesión del panel administrativo). No requieren consentimiento porque no se pueden desactivar.',
          'Cookies de analítica (Google Analytics): se activan solo si aceptás el banner de cookies, y nos ayudan a entender qué páginas se visitan más y detectar errores de navegación. No identifican a la persona por su nombre.'
        ]
      },
      {
        titulo: '3. Cómo gestionar tu consentimiento',
        parrafos: [
          'Podés aceptar o rechazar las cookies de analítica desde el banner que se muestra en tu primera visita. También podés borrar las cookies ya guardadas o bloquearlas desde la configuración de tu navegador en cualquier momento; esto puede afectar algunas funcionalidades del sitio.'
        ]
      }
    ]
  },
  arrepentimiento: {
    titulo: 'Botón de Arrepentimiento',
    actualizado: '27 de julio de 2026',
    secciones: [
      {
        titulo: '1. Derecho de revocación',
        parrafos: [
          'Conforme el artículo 34 de la Ley 24.240 de Defensa del Consumidor y la Resolución 424/2020 de la Secretaría de Comercio Interior, tenés derecho a revocar tu compra dentro de los 10 (diez) días corridos contados desde la entrega del producto, sin necesidad de justificar el motivo y sin ningún costo adicional.'
        ]
      },
      {
        titulo: '2. Cómo ejercer este derecho',
        parrafos: [
          'Para solicitar la revocación de tu compra, escribinos indicando el número de pedido a través de cualquiera de estos medios:',
        ]
      },
      {
        titulo: '3. Condiciones para la devolución',
        parrafos: [
          'El producto debe devolverse sin uso, en su embalaje original y con todos sus accesorios. Los gastos de devolución del producto corren por cuenta del vendedor cuando la revocación se ejerce dentro del plazo legal.'
        ]
      },
      {
        titulo: '4. Reintegro',
        parrafos: [
          'Una vez recibido y verificado el producto, reintegramos el importe abonado utilizando el mismo medio de pago empleado en la compra original, dentro de los plazos que establece la normativa vigente.'
        ]
      }
    ]
  }
};
