const process = require('process');
const fs = require('fs');
const { promises } = fs;
const YAML = require('yamljs');
const axios = require('axios');
const app = require('json-to-markdown-table');

class Count {
  constructor({ input, output, format, cols = 5 }) {
    this.input = input;
    this.output = output;
    this.format = format;
    this.cols = cols;
    this.nativeObject = [];
    this.logins = {};
  }

  async start() {
    try {
      console.log('start...');
      this.nativeObject = await this.loadYaml();
      await this.getAllRepoContributors();
      await this.writeFile();
      console.log('success!');
    } catch (err) {
      console.log(err);
      process.exit(1);
    }
  }

  async getAllRepoContributors() {
    const promiseList = [];
    for (const k of this.nativeObject) {
      for (const item of k.list) {
        const { user, repo } = item;
        const list = [];
        promiseList.push(this.getRepoContributors({ user, repo, list, item }));
      }
    }
    await Promise.all(promiseList);
  }

  formatList(data, cols) {
    const list = Object.keys(data).sort();
    const length = list.length;
    let index = 0;
    const target = [];
    while (index < length) {
      const arr = list.slice(index, (index += cols));
      while (arr.length && arr.length < cols) {
        arr.push('');
      }
      const obj = arr.reduce((acc, cur, ind) => {
        acc['name' + ind] = cur;
        return acc;
      }, {});
      target.push(obj);
    }
    return target;
  }
  async writeFile() {
    if (this.format === 'md') {
      const list = this.formatList(this.logins, this.cols);
      const columns = Array(this.cols)
        .fill(null)
        .map((item, index) => 'name' + index);
      const tableMdString = app(list, columns);
      await promises.writeFile(this.output, tableMdString, 'utf8');
      return;
    }
    const data = {
      totalCount: Object.keys(this.logins).length,
      projects: this.nativeObject,
    };
    const yamlString = YAML.stringify(data);
    await promises.writeFile(this.output, yamlString, 'utf8');
  }

  async loadYaml() {
    const data = await new Promise((resolve) => {
      YAML.load(this.input, (result) => {
        resolve(result);
      });
    });
    return data;
  }
  handleData(data) {
    return data
      .filter((item) => item.type !== 'Bot')
      .map((item) => {
        const { type, email } = item;
        if (type === 'Anonymous') {
          item.login = email.replace(/(.+)@.+/, '$1**');
        }
        this.logins[item.login] = item.login;
        return item;
      });
  }

  async getRepoContributors({ user, repo, page = 1, per_page = 100, list = [], item }) {
    let { data } = await axios.get(
      `https://api.github.com/repos/${user}/${repo}/contributors?page=${page}&per_page=${per_page}&anon=true&t=${new Date().getTime()}`,
    );
    data = this.handleData(data);

    list.push(...data);
    if (data.length === per_page) {
      page++;
      await this.getRepoContributors({ user, repo, page, per_page, list, item });
    } else {
      item.contributors = list;
      item.contributorCount = [...new Set(list.map((item) => item.id || item.email))].length;
    }
  }
}

module.exports = Count;
