import typescript from '@rollup/plugin-typescript';

export default [

  {
    input: 'src/react/index.ts',
    output: {
      file: 'dist/react/index.esm.js',
      format: 'es',
      sourcemap: true 
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.react.json',
        declaration: true,
        declarationDir: './dist/react',
        declarationMap: false
      })
    ],
    external: ['react', 'react-dom', 'react/jsx-runtime']
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
        tsconfig: './tsconfig.react.json',
        declaration: false, 
        declarationMap: false
      })
    ],
    external: ['react', 'react-dom', 'react/jsx-runtime']
  }
]; 