const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/productos');

// La carpeta no está versionada (ver .gitignore), así que en un clone nuevo
// no existe hasta que se sube la primera imagen. multer no la crea sola.
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nombreUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nombreUnico);
  }
});

const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function fileFilter(req, file, cb) {
  if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
    return cb(new Error('Formato de imagen no permitido. Usá JPG, PNG, WEBP o GIF.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('imagen');

// Traduce errores de multer (tipo/tamaño inválido) a 400 en vez de dejarlos
// caer como 500 en el manejador global de errores de app.js.
exports.uploadProductoImagen = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
};
