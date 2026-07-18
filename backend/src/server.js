// Zona horaria por defecto del proceso: el VPS puede estar en UTC o en la
// zona del datacenter, pero el negocio opera en Argentina. Se fija ANTES de
// cualquier otro require para que Date, los timestamps de MySQL y los cron
// jobs que no reciban timezone explícita usen la hora local real. Se
// respeta un TZ ya definido en el entorno del VPS en vez de pisarlo.
process.env.TZ = process.env.TZ || 'America/Argentina/Buenos_Aires';

require('dotenv').config();
const db = require('./config/database');
const runMigrations = require('./migrations/runMigrations');
const app = require('./app');

require('./cron/vencimientosCron');
require('./cron/reservasCron');

const cronService = require('./services/cron.service');

const PORT = process.env.PORT || 3000;

(async () => {
    try {
        await runMigrations();
        app.listen(PORT, () => {
            console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
            cronService.iniciarCrons(db);
        });
    } catch (err) {
        console.error('No se pudieron aplicar migraciones:', err.message || err);
        process.exit(1);
    }
})();