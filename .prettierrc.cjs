module.exports = {
  plugins: [
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-packagejson',
  ],
  bracketSpacing: true,
  singleQuote: true,
  trailingComma: 'all',
  importOrder: ['<THIRD_PARTY_MODULES>', '^[./]', '^@(.*)$'],
  importOrderSeparation: true,
};
