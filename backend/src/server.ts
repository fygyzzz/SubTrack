import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config.js';
import { authRoutes } from './routes/auth.js';
import { categoryRoutes } from './routes/categories.js';
import { subscriptionRoutes } from './routes/subscriptions.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { exportRoutes } from './routes/export.js';
import { notificationRoutes } from './routes/notifications.js';
import { getRates } from './currency.js';
import { startScheduler } from './scheduler.js';

// предзагружаем курсы ЦБ при старте
getRates();

// запускаем шедулер email-уведомлений
startScheduler();

const app = Fastify({ logger: true });

await app.register(cors, { origin: env.FRONTEND_URL, credentials: true });
await app.register(jwt, { secret: env.JWT_SECRET });

await app.register(swagger, {
  openapi: {
    info: { title: 'SubTrack API', version: '1.0.0', description: 'Управление подписками и регулярными платежами' },
    servers: [{ url: 'http://localhost:3001' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
});
await app.register(swaggerUi, { routePrefix: '/docs' });

app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'Unauthorized' });
  }
});

await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(categoryRoutes, { prefix: '/api/categories' });
await app.register(subscriptionRoutes, { prefix: '/api/subscriptions' });
await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
await app.register(exportRoutes, { prefix: '/api/export' });
await app.register(notificationRoutes, { prefix: '/api/notifications' });

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`Server running on http://localhost:${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
