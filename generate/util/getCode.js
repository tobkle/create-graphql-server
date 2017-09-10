// @flow
import path from 'path';
import Handlebars from 'handlebars';
import getContext from './getContext';
import getPartials from './getPartials';
import getName from './getName';

import {
  ENCODING,
  USER_LITERAL,
  TEMPLATE_EXTENSION,
  TEMPLATES_COMMON_DIR,
  TEMPLATES_DEFAULT_DIR,
  TEMPLATES_DEFAULT_TEMPLATE,
  MODEL,
  RESOLVER
} from './constants';

/**
 * get generated code from template partials
 * @public
 * @param {string} codeType - the code to be generated: MODEL || RESOLVER
 * @param {Object} config - configuration object
 * @property {string} userType - the user type
 * @property {object} inputSchema - schema of the type 
 * @property {array} templatePaths, - paths with templates
 * @property {string} defaultTemplate - name of the start template
 * @property {string} extension - file extension '.template'
 * @property {string} encoding - base file encoding 'utf8'
 * @property {string} commonDir - commonly used template partials
 * @property {string} defaultDir - default directory for templates
 * @property {function} getNameFunc - calculate the name of a partial
 * @return {string} code - generated code for a model
 */

export default function getCode(codeType, {
  userType = USER_LITERAL,
  inputSchema = {},
  templatePaths,
  defaultTemplate = TEMPLATES_DEFAULT_TEMPLATE,
  extension = TEMPLATE_EXTENSION,
  encoding = ENCODING,
  commonDir = TEMPLATES_COMMON_DIR,
  defaultDir = TEMPLATES_DEFAULT_DIR,
  getNameFunc = getName
}) {
    // partials dictionary for template resolution
    const partials = {};

    // adds helpers to handlebars
    registerHandlebarsHelpers();

    // define the compiler
    function compile(templates) {
      templates.forEach(partial => {
        partials[partial.name] = Handlebars.compile(partial.source);
        Handlebars.registerPartial(partial.name, partials[partial.name]);
      });
    }

    // getting data context
    const context = getContext(inputSchema, userType, codeType);
    const TypeName = context.TypeName;
    const typeName = context.typeName;
    let startTemplate = '';

    // Collect all partial templates out of all provided templatePaths
    templatePaths.forEach((templatePath, index) => {

      // getting partial templates from "common" folder
      logPath(templatePath, commonDir);
      const commonPartials = getPartials({
        basePath: templatePath,
        directoryPath: [commonDir],
        extension: extension,
        encoding: encoding,
        getNameFunc: getNameFunc
      });

      // getting partial templates from "<type>" folder
      logPath(templatePath, typeName);
      let typePartials = getPartials({
        basePath: templatePath,
        directoryPath: [typeName],
        extension: extension,
        encoding: encoding,
        getNameFunc: getNameFunc
      });

      // assuming, we start with the type name's template
      startTemplate = typeName

      // fallback to partial templates in "default" folder
      if (typePartials.length === 0) {
        logPath(templatePath, defaultDir);
        typePartials = getPartials({
          basePath: templatePath,
          directoryPath: [defaultDir],
          extension: extension,
          encoding: encoding,
          getNameFunc: getNameFunc
        });
        // reset start template to the default template,
        // as <type> specific template does not exist
        startTemplate = defaultTemplate;
      }

      // compile partials
      compile(commonPartials);
      compile(typePartials);
    });

    console.log('Found the following templates:', 
      JSON.stringify(Object.keys(partials), null, 2));
    console.log(`Generating ${codeType} for type "${
      TypeName}" with template "${startTemplate}"`);

    // run start template with data context
    const code = partials[startTemplate](context);

    // return the final code
    return code;
  }

/**
 * registers a helper, which could be used in the templates
 * @example
 * {{#foreach}}
 *     {{#if $first}} console.log('this was the last element') {{/if}}
 *     {{#if $notFirst}} console.log('this was not the last one') {{/if}}
 *     {{#if $last}} console.log('this was the last element') {{/if}}
 *     {{#if $notLast}} console.log('this was not the last one') {{/if}}
 * {{/foreach}}
 *
 */

function registerHandlebarsHelpers() {
  Handlebars.registerHelper('foreach', function(arr, options) {
    if (options.inverse && !arr.length) {
      return options.inverse(this);
    }
    return arr
      .map(function(item, index) {
        item.$index = index;
        item.$first = index === 0;
        item.$last = index === arr.length - 1;
        item.$notFirst = index !== 0;
        item.$notLast = index !== arr.length - 1;
        return options.fn(item);
      })
      .join('');
  });
}

/**
 * log the given path for easier failure analysis
 */

function logPath(abspath, dir) {
  const directory = path.join(...abspath, dir);
  console.log(`searching templates in "${directory}"`);
}
