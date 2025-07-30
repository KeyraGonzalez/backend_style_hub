import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule); // Usar NestExpressApplication
  const configService = app.get(ConfigService);

  // Ya no necesitamos servir archivos estáticos localmente
  // Las imágenes ahora se almacenan en Cloudinary
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const corsOrigin =
    configService.get('CORS_ORIGIN') || 'http://localhost:3001';
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? corsOrigin : true,
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
    .addServer('http://localhost:3000', 'Servidor de Desarrollo')
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

  const port = configService.get('PORT') || 3000;
  const host = configService.get('HOST') || '0.0.0.0';
  await app.listen(port, host);

  console.log(`� Bwackend running on: http://${host}:${port}/api`);
  console.log(`📚 Swagger documentation: http://${host}:${port}/api/docs`);
}

bootstrap();
