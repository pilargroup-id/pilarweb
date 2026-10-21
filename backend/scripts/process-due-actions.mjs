import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { testDatabaseConnection } = require('../src/config/database.config');
const DeliveryService = require('../src/services/delivery.service');

try {
  await testDatabaseConnection();
  const result = await DeliveryService.processDueActions();
  console.log('[pilarweb] due actions processed', result);
  process.exit(0);
} catch (error) {
  console.error('[pilarweb] due actions failed', error);
  process.exit(1);
}
