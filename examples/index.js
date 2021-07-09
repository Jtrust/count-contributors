const Count = require('../src');
const path = require("path");


new Count({
  input: path.join(__dirname, './docs.yml'),
  output: path.join(__dirname, './team.md'),
  format: 'md',
  cols: 5,
}).start();
