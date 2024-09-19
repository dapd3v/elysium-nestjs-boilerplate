import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from './core/config/config.type';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  const configService = app.get(ConfigService<AllConfigType>);

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
