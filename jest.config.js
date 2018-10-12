module.exports = {
  // roots: ['<rootDir>/src/', '<rootDir>/test/'],
  verbose: false,
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    // '^.+\\.jsx?$': 'babel-jest',
  },
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.[ts]sx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleDirectories: ['node_modules', 'src/frontend', 'src/shared'],
};
