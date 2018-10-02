module.exports = {
  // roots: ['<rootDir>/src/', '<rootDir>/test/'],
  verbose: true,
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.[ts]sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleDirectories: ['node_modules', 'src/frontend', 'src/shared'],
};
