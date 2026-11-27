'use strict';

const { loadDatabaseConfig } = require('../src/config/env');
const { createDataSource } = require('../src/config/data-source');

async function main() {
  const dataSource = createDataSource(loadDatabaseConfig());
  await dataSource.initialize();
  try {
    if (process.argv.includes('--revert')) {
      await dataSource.undoLastMigration({ transaction: 'each' });
      console.log('Reverted last migration');
    } else {
      const applied = await dataSource.runMigrations({ transaction: 'each' });
      console.log(`Applied ${applied.length} migration(s): ${applied.map((m) => m.name).join(', ') || 'none'}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
