import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule); // Usar NestExpressApplication
  const configService = app.get(ConfigService);

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Servir archivos estáticos desde la carpeta public
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public/',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.enableCors({
    origin:
      process.env.NODE_ENV === 'development'
        ? [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3001',
          ]
        : [
            configService.get('CORS_ORIGIN'),
            'https://frontend-tienda-pi.vercel.app',
            'https://moda-elegante-backend-production.up.railway.app',
            /\.railway\.app$/,
            /\.vercel\.app$/,
          ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Moda Elegante API')
    .setDescription(
      'API completa para la plataforma de e-commerce Moda Elegante'
    )
    .setVersion('1.0')
    .addTag('auth', 'Autenticación y autorización')
    .addTag('users', 'Gestión de usuarios')
    .addTag('products', 'Gestión de productos')
    .addTag('cart', 'Carrito de compras')
    .addTag('orders', 'Gestión de pedidos')
    .addTag('payments', 'Procesamiento de pagos')
    .addTag('notifications', 'Sistema de notificaciones')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa tu JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addServer('http://localhost:3001', 'Servidor de Desarrollo Local')
    .addServer(
      'https://moda-elegante-backend-production.up.railway.app',
      'Servidor Railway'
    )
    .addServer('https://api.modaelegante.com', 'Servidor de Producción')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Moda Elegante API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .topbar-wrapper .link { content: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjMzMzIi8+Cjwvc3ZnPgo='); }
      .swagger-ui .topbar { background-color: #3b82f6; }
      .swagger-ui .topbar .download-url-wrapper .select-label { color: white; }
      .swagger-ui .topbar .download-url-wrapper .download-url-button { background-color: #1d4ed8; border-color: #1d4ed8; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  });

  const port = configService.get('PORT') || process.env.PORT || 3001;
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

  try {
    await app.listen(port, host);
    console.log(`🚀 Backend running on: http://${host}:${port}/api`);
    console.log(`📚 Swagger documentation: http://${host}:${port}/api/docs`);
    console.log(`🌐 Server successfully started on ${host}:${port}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

bootstrap();
