import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';
import path from 'path';

// Treat internal core/editor/etc modules as externals so they are not re-emitted under dist/react
function makeExternal(id) {
  // Externalize React peers
  if (id === 'react' || id === 'react-dom' || id === 'react/jsx-runtime') return true;
  // Externalize any import coming from this package root (core/editor/util/etc)
  if (id === 'dv-rich-editor' || id.startsWith('dv-rich-editor/')) return true;
  // Externalize any module that resolves inside this repo's src/ folder so Rollup doesn't bundle core files
  try {
    const projectRoot = path.resolve(__dirname);
    const srcPrefix = projectRoot + path.sep + 'src' + path.sep;
    if (id.startsWith(srcPrefix) || id.includes(srcPrefix)) return true;
  } catch (e) {
    // ignore path resolution issues
  }
  // Also treat relative imports to parent folders as external (safety)
  if (id.startsWith('../')) return true;
  return false;
}

export default [
  {
    input: 'src/react/index.ts',
    output: {
      file: 'dist/react/index.esm.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      // Rewrite local ../editor imports to package-root deep imports so consumers can resolve them
      alias({
        entries: [
          { find: '../editor/DhivehiRichEditor', replacement: 'dv-rich-editor/editor/DhivehiRichEditor' },
          { find: '../editor/ThemeManager', replacement: 'dv-rich-editor/editor/ThemeManager' }
        ]
      }),
      typescript({
        tsconfig: './tsconfig.react.build.json',
        // Do not emit declarations from Rollup plugin; let `tsc` emit them during the build step
        declaration: false,
        declarationMap: false
      })
    ],
    external: makeExternal
  },
  {
    input: 'src/react/index.ts',
    output: {
      file: 'dist/react/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.react.build.json',
        declaration: false,
        declarationMap: false
      })
    ],
    external: makeExternal
  }
];