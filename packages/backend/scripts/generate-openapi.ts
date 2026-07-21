import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { buildOpenApiDocument } from '../src/openapi';

/**
 * Emit the OpenAPI document to `openapi.json` without a running server or a
 * database. Preview mode builds the module graph and route metadata but does
 * not instantiate providers or run lifecycle hooks (so Prisma never connects).
 */
async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { preview: true, logger: false });
  const document = buildOpenApiDocument(app);
  const outFile = join(__dirname, '..', 'openapi.json');
  writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  // eslint-disable-next-line no-console
  console.log(`Wrote ${outFile}`);
}

void main();
