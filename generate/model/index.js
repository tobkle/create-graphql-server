import { print } from 'recast';
import { templateToAst } from '../util/read';
import getCode from '../util/getCode';
import { MODEL } from '../util/constants';
import { modulePath } from 'create-graphql-server-authorization';
import { templates } from 'create-graphql-server-connections';

export default function generateModel(inputSchema) {
  const ast = generateModelAst(inputSchema);
  return print(ast, { trailingComma: true }).code;
}

export function generateModelAst(inputSchema) {
  // the last template path, determines the start template: type/default
  // the last path has the highest priority and may overwrite
  // partial templates, if they have equal names
  const templateCode = getCode(MODEL, {
    inputSchema,
    templatePaths: [
      templates.model,
      [modulePath, 'templates', 'model', 'auth'],
      [__dirname, 'templates'],
    ]
  });

  // validate syntax of generated template code
  const replacements = {};
  const ast = templateToAst(templateCode, replacements);

  return ast;
}
