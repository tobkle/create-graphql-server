 import { print } from 'recast';
 import getCode from '../util/getCode';
 import { templateToAst } from '../util/read';
 import { RESOLVER } from '../util/constants';
 import { modulePath } from 'create-graphql-server-authorization';
 import { templates } from 'create-graphql-server-connections';

export default function generateResolvers(inputSchema) {
  const ast = generateResolversAst(inputSchema)
  return print(ast, { trailingComma: true }).code;
}

export function generateResolversAst(inputSchema) {
  // the last template path, determines the start template: type/default
  // the last path has the highest priority and may overwrite
  // partial templates, if they have equal names
  const templateCode = getCode(RESOLVER, {
    inputSchema,
    templatePaths: [
      templates.resolvers,
      [modulePath, 'templates','resolver', 'auth'],
      [__dirname, 'templates'],
    ]
  });

  // validate syntax of generated template code
  const replacements = {};
  const ast = templateToAst(templateCode, replacements);

  return ast;
}
