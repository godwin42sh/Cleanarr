import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { buildOpenApiDocument, SWAGGER_PATH } from './openapi';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: config.getOrThrow<string[]>('corsOrigins'),
  });

  SwaggerModule.setup(SWAGGER_PATH, app, buildOpenApiDocument(app), {
    jsonDocumentUrl: `${SWAGGER_PATH}-json`,
  });

  const port = config.getOrThrow<number>('port');
  await app.listen(port);
  Logger.log(`Cleanarr API listening on http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`Swagger UI at http://localhost:${port}/${SWAGGER_PATH}`, 'Bootstrap');
}

void bootstrap();
