import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

/** Path the Swagger UI is served from (JSON at `${SWAGGER_PATH}-json`). */
export const SWAGGER_PATH = 'api/docs';

/** Build the OpenAPI document for the app (used at runtime and for codegen). */
export const buildOpenApiDocument = (app: INestApplication): OpenAPIObject => {
  const config = new DocumentBuilder()
    .setTitle('Cleanarr API')
    .setDescription('Scan for unused downloads and clean matching qBittorrent torrents.')
    .setVersion('0.1.0')
    // The API is served under the global `/api` prefix.
    .addServer('/api')
    .build();
  return SwaggerModule.createDocument(app, config);
};
