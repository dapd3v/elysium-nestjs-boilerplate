import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from './core/config/config.type';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });

  const configService = app.get(ConfigService<AllConfigType>);

  // Configura archivos estáticos
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.setGlobalPrefix(
    configService.getOrThrow('app.apiPrefix', { infer: true }),
    {
      exclude: ['/'],
    },
  );
  app.enableCors();
  app.enableVersioning({
    type: VersioningType.URI,
  });
  
  if (configService.getOrThrow('app.documentation', { infer: true }) === true) {
    const options = new DocumentBuilder()
    .setTitle('API')
    .setDescription('API docs')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

    const document = SwaggerModule.createDocument(app, options);
  
    SwaggerModule.setup('docs', app, document);
  }
  await app.listen(configService.getOrThrow('app.port', { infer: true }));
}
bootstrap();
