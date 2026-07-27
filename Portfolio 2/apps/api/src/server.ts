import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { disconnectPrisma, prisma } from './lib/prisma.js';
import { pruneExpiredTokens } from './modules/auth/auth.service.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  // API_URL is the public origin (which differs from the bind port behind a proxy),
  // so both are logged rather than conflated into one string.
  logger.info(
    { port: env.PORT, publicUrl: env.API_URL, env: env.NODE_ENV, storage: env.STORAGE_DRIVER },
    `API listening on port ${env.PORT}`,
  );
});

// Housekeeping: clear stale refresh tokens hourly.
const prune = setInterval(
  () => {
    void pruneExpiredTokens()
      .then((count) => count > 0 && logger.debug({ count }, 'pruned refresh tokens'))
      .catch((error) => logger.error({ error }, 'token prune failed'));
  },
  60 * 60 * 1000,
);
prune.unref();

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'shutting down');
  clearInterval(prune);

  const forced = setTimeout(() => {
    logger.error('forced shutdown after 10s');
    process.exit(1);
  }, 10_000);
  forced.unref();

  server.close(async () => {
    await disconnectPrisma();
    logger.info('shutdown complete');
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'uncaught exception — exiting');
  void disconnectPrisma().finally(() => process.exit(1));
});

// Fail fast if the database is unreachable at boot.
prisma
  .$connect()
  .then(() => logger.info('database connected'))
  .catch((error) => {
    logger.fatal({ error }, 'could not reach the database');
    process.exit(1);
  });
