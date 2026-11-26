'use strict';
// The detector tables (spec 6). Each rule names a finding and the signals that prove it:
//   {dep}   a package in any package.json; a trailing * matches every package with that prefix
//   {file}  a file name; without a slash it matches the base name, and * matches within one name
//   {grep}  a pattern searched in the files whose name matches one of `in`
// shared/detectors.md lists the same ids; a plugin test keeps the two in step.
const CODE = ['*.js', '*.jsx', '*.ts', '*.tsx', '*.mjs', '*.cjs', '*.vue', '*.svelte'];
const STYLES = ['*.css', '*.scss', '*.sass', '*.less'];
const PAGES = ['*.html', '*.cshtml', '*.vue', '*.svelte'];
const NODE_HTTP = /require\(['"](?:node:)?http['"]\)|from ['"](?:node:)?http['"]/;
const RAILS = /^\s*gem ['"]rails['"]/m;

const RULES = {
  'frontend.frameworks': [
    { id: 'react', any: [{ dep: 'react' }] },
    { id: 'vue', any: [{ dep: 'vue' }] },
    { id: 'angular', any: [{ dep: '@angular/core' }] },
    { id: 'svelte', any: [{ dep: 'svelte' }] },
    { id: 'solid', any: [{ dep: 'solid-js' }] },
    { id: 'next', any: [{ dep: 'next' }] },
    { id: 'nuxt', any: [{ dep: 'nuxt' }] },
    { id: 'rails', any: [{ grep: RAILS, in: ['Gemfile'] }] },
    { id: 'django', any: [{ file: 'manage.py' }] },
    { id: 'laravel', any: [{ file: 'artisan' }] },
    { id: 'aspnet-razor', any: [{ file: '*.cshtml' }] },
  ],
  'frontend.routing': [
    { id: 'react-router', any: [{ dep: 'react-router-dom' }, { dep: 'react-router' }] },
    { id: 'vue-router', any: [{ dep: 'vue-router' }] },
    { id: 'angular-router', any: [{ dep: '@angular/router' }] },
    { id: 'next-file-routes', any: [{ dep: 'next' }] },
    { id: 'nuxt-file-routes', any: [{ dep: 'nuxt' }] },
    { id: 'sveltekit', any: [{ dep: '@sveltejs/kit' }] },
    { id: 'remix', any: [{ dep: '@remix-run/react' }] },
    {
      id: 'server-routes',
      any: [{ grep: /\b(?:app|router)\.(?:get|post|put|patch|delete)\(\s*['"`]\//, in: CODE }, { grep: /\bcreateServer\(/, in: CODE }],
    },
  ],
  'frontend.apiStyles': [
    { id: 'rest', any: [{ grep: /\b(?:fetch|axios\.(?:get|post|put|patch|delete))\(\s*['"`]\/[^'"`]*/, in: CODE }] },
    { id: 'graphql', any: [{ dep: 'graphql' }, { dep: '@apollo/client' }, { dep: 'urql' }, { dep: 'graphql-request' }] },
    { id: 'trpc', any: [{ dep: '@trpc/client' }] },
    { id: 'websocket', any: [{ grep: /\bnew WebSocket\(/, in: CODE }] },
    { id: 'sse', any: [{ grep: /\bnew EventSource\(/, in: CODE }] },
  ],
  'frontend.contracts': [
    { id: 'openapi', any: [{ file: 'openapi.json' }, { file: 'openapi.yaml' }, { file: 'openapi.yml' }, { file: 'swagger.json' }] },
    { id: 'graphql-schema', any: [{ file: '*.graphql' }, { file: '*.gql' }] },
    { id: 'typescript-types', any: [{ file: 'tsconfig.json' }] },
    { id: 'backend-dtos', any: [{ grep: /\b(?:class|record) \w+(?:Dto|Request|Response)\b/, in: ['*.cs', '*.java', '*.kt'] }] },
  ],
  'frontend.auth': [
    {
      id: 'oauth-sso',
      any: [{ dep: '@azure/msal-browser' }, { dep: 'oidc-client-ts' }, { dep: 'next-auth' }, { dep: '@auth0/auth0-react' }, { dep: 'keycloak-js' }],
    },
    { id: 'bearer-token', any: [{ grep: /Authorization['"]?\s*[:=,]\s*[`'"]Bearer /, in: CODE }] },
    { id: 'cookie-session', any: [{ grep: /credentials:\s*['"]include['"]|withCredentials:\s*true|Set-Cookie/, in: CODE }] },
  ],
  'frontend.theming': [
    { id: 'css-variables', any: [{ grep: /--[a-z][\w-]*\s*:/, in: STYLES }] },
    { id: 'tailwind', any: [{ file: 'tailwind.config.*' }, { dep: 'tailwindcss' }] },
    { id: 'component-theme', any: [{ grep: /\b(?:createTheme|extendTheme|defineTheme)\(/, in: CODE }] },
    { id: 'design-tokens', any: [{ file: 'tokens.json' }, { file: '*.tokens.json' }, { dep: 'style-dictionary' }] },
    { id: 'scss', any: [{ file: '*.scss' }] },
    { id: 'css-in-js', any: [{ dep: 'styled-components' }, { dep: '@emotion/react' }] },
  ],
  'frontend.devServers': [
    { id: 'vite', any: [{ file: 'vite.config.*' }, { dep: 'vite' }] },
    { id: 'webpack', any: [{ file: 'webpack.config.*' }, { dep: 'webpack' }] },
    { id: 'next', any: [{ dep: 'next' }] },
    { id: 'nuxt', any: [{ dep: 'nuxt' }] },
    { id: 'angular-cli', any: [{ file: 'angular.json' }] },
  ],
  'frontend.i18n': [
    { id: 'i18next', any: [{ dep: 'i18next' }, { dep: 'react-i18next' }] },
    { id: 'vue-i18n', any: [{ dep: 'vue-i18n' }] },
    { id: 'angular-i18n', any: [{ dep: '@angular/localize' }] },
  ],
  'frontend.fonts': [
    { id: 'google-fonts', any: [{ grep: /fonts\.googleapis\.com/, in: [...PAGES, ...STYLES, ...CODE] }] },
    { id: 'fontsource', any: [{ dep: '@fontsource/*' }] },
    // An @font-face block that loads a file is self-hosted; one with local() sources only uses the machine's fonts.
    { id: 'self-hosted', any: [{ grep: /@font-face(?=[^}]*\burl\()/, in: STYLES }] },
    { id: 'system', any: [{ grep: /@font-face(?![^}]*\burl\()(?=[^}]*\blocal\()/, in: STYLES }] },
  ],
  'backend.languages': [
    { id: 'node', any: [{ dep: 'express' }, { dep: 'fastify' }, { dep: 'koa' }, { dep: '@nestjs/core' }, { grep: NODE_HTTP, in: CODE }] },
    { id: 'dotnet', any: [{ file: '*.csproj' }] },
    { id: 'java', any: [{ file: 'pom.xml' }, { file: 'build.gradle' }, { file: 'build.gradle.kts' }] },
    { id: 'python', any: [{ file: 'requirements.txt' }, { file: 'pyproject.toml' }] },
    { id: 'go', any: [{ file: 'go.mod' }] },
    { id: 'ruby', any: [{ file: 'Gemfile' }] },
    { id: 'php', any: [{ file: 'composer.json' }] },
  ],
  'backend.frameworks': [
    { id: 'express', any: [{ dep: 'express' }] },
    { id: 'fastify', any: [{ dep: 'fastify' }] },
    { id: 'koa', any: [{ dep: 'koa' }] },
    { id: 'nestjs', any: [{ dep: '@nestjs/core' }] },
    { id: 'node-http', any: [{ grep: NODE_HTTP, in: CODE }] },
    { id: 'aspnet-core', any: [{ grep: /Microsoft\.NET\.Sdk\.Web|Microsoft\.AspNetCore/, in: ['*.csproj'] }] },
    { id: 'spring', any: [{ grep: /spring-boot/, in: ['pom.xml', 'build.gradle', 'build.gradle.kts'] }] },
    { id: 'django', any: [{ file: 'manage.py' }] },
    { id: 'flask', any: [{ grep: /^flask\b/im, in: ['requirements.txt', 'pyproject.toml'] }] },
    { id: 'fastapi', any: [{ grep: /^fastapi\b/im, in: ['requirements.txt', 'pyproject.toml'] }] },
    { id: 'rails', any: [{ grep: RAILS, in: ['Gemfile'] }] },
    { id: 'laravel', any: [{ file: 'artisan' }] },
    { id: 'gin', any: [{ grep: /gin-gonic\/gin/, in: ['go.mod'] }] },
  ],
};

module.exports = { RULES };
