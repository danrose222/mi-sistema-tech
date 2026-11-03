// Convierte un texto en un identificador apto para URL: sin tildes, en
// minúsculas y con guiones ("Protectores de pantalla" -> "protectores-de-pantalla").
function quitarAcentos(text) {
  return String(text)
    .normalize('NFD')
    .split('')
    .filter((ch) => {
      const code = ch.codePointAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join('');
}

module.exports = function slugify(text) {
  return quitarAcentos(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};
