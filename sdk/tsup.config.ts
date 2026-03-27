import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'headless/index': 'src/headless/index.ts',
    'micro/index': 'src/micro/index.ts',
    'cli/index': 'src/cli/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ['@solana/web3.js', '@solana/spl-token'],
  banner: ({ format }) => {
    // Add shebang to CLI entry
    if (format === 'esm') {
      return { js: '' };
    }
    return { js: '' };
  },
});
