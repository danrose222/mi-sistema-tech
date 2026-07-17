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