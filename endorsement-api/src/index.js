'use strict';

const { loadConfig } = require('./config/env');
const { createDataSource } = require('./config/data-source');
const { TemplateRepository } = require('./repositories/template.repository');
const { createContainer } = require('./container');
const { createServer } = require('./app');

async function main() {
  const config = loadConfig();
  const dataSource = createDataSource(config.db);
  await dataSource.initialize();
  if (config.db.migrationsRun) await dataSource.runMigrations({ transaction: 'each' });

  const container = createContainer({
    config,
    templateRepository: new TemplateRepository(dataSource),
    readinessCheck: () => dataSource.query('SELECT 1'),
  });
  const server = await createServer({ config, container });
  await server.start();
  console.log(`endorsement-api listening on ${server.info.uri}`);

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`);
    await server.stop({ timeout: 10_000 });
    await dataSource.destroy();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
