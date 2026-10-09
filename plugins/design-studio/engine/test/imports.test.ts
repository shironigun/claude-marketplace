import { test } from 'node:test';
import assert from 'node:assert/strict';
import { libraryOf, muiPrimitiveName, readImports } from '../src/parse/imports.ts';
import { file } from './parse-helpers.ts';

test('readImports records default, named, namespace and type-only bindings', () => {
  const ast = file(`import React from 'react';\nimport { Box, type SxProps } from '@mui/material';\nimport * as Icons from '@mui/icons-material';\nimport type { Lead } from '../models/lead';`);
  assert.deepEqual(readImports(ast).map((b) => [b.local, b.imported, b.source, b.typeOnly]), [
    ['React', 'default', 'react', false],
    ['Box', 'Box', '@mui/material', false],
    ['SxProps', 'SxProps', '@mui/material', true],
    ['Icons', '*', '@mui/icons-material', false],
    ['Lead', 'Lead', '../models/lead', true],
  ]);
});

test('libraryOf groups packages', () => {
  assert.equal(libraryOf('@mui/material/Button'), 'mui');
  assert.equal(libraryOf('@mui/x-date-pickers/DatePicker'), 'mui');
  assert.equal(libraryOf('@mui/icons-material/Close'), 'icon');
  assert.equal(libraryOf('react-router-dom'), 'router');
  assert.equal(libraryOf('./local'), null);
  assert.equal(libraryOf('@tanstack/react-query'), '@tanstack/react-query');
});

test('muiPrimitiveName resolves named and default imports', () => {
  const m = new Map(readImports(file(`import Chip from '@mui/material/Chip';\nimport { Button as B } from '@mui/material';\nimport { Foo } from './foo';`)).map((b) => [b.local, b]));
  assert.equal(muiPrimitiveName('Chip', m), 'Chip');
  assert.equal(muiPrimitiveName('B', m), 'Button');
  assert.equal(muiPrimitiveName('Foo', m), null);
  assert.equal(muiPrimitiveName('div', m), null);
});
