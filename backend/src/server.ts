import http from 'http';
import { env } from './config/env';
import app from './app';
import { logger } from './utils/logger';
import { connectDB, prisma } from './config/db';
import { wsManager } from './websocket';

let server: http.Server;

const startServer = async () => {
  await connectDB();

  server = http.createServer(app);
  wsManager.init(server);

  server.listen(env.PORT, () => {
    logger.info(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  wsManager.close();
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      await prisma.$disconnect();
      logger.info('Database connection closed.');
      process.exit(0);
    });
  } else {
    await prisma.$disconnect();
    process.exit(0);
  }
};

if (env.NODE_ENV === 'production') {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer();
