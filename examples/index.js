const Count = require('../src');

new Count({
  input: './docs.yml',
  output: './team.md',
  format: 'md',
  cols: 5,
}).start();
