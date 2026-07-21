import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../backend/openapi.json',
  output: 'src/client',
  plugins: [
    '@hey-api/client-fetch',
    'zod',
    // Validate responses against the generated Zod schemas.
    { name: '@hey-api/sdk', validator: true },
  ],
});
