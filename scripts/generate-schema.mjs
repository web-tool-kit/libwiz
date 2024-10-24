import path from 'node:path';
import fse from 'fs-extra';
import { zodToJsonSchema } from 'zod-to-json-schema';

async function generateSchema(distPath) {
  const { ConfigSchema } = await import(`${distPath}/config/schema.js`);
  const jsonSchema = zodToJsonSchema(ConfigSchema, {
    name: 'ConfigSchema',
    nameStrategy: 'ref',
    target: 'jsonSchema7',
  });

  jsonSchema.title = 'JSON schema for libwiz configuration';

  fse.ensureDirSync(path.resolve(distPath, 'schemas'));
  fse.writeFileSync(
    path.resolve(distPath, 'schemas/libwiz-schema.json'),
    JSON.stringify(jsonSchema, null, 2),
  );
}

export default generateSchema;
