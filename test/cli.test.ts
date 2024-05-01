import path from "path";
import fs from "fs-extra";
import { expect } from "chai";
import { execSync } from "child_process";

const PROJ_ROOT = path.resolve(".");
const DATA_DIR = path.join(PROJ_ROOT, "test", "data");
const DATA_SRC_DIR = path.join(PROJ_ROOT, "test", "data-src");

const v1 = "1.0.0";
const v2 = "2.2.2";

before(() => {
  // Reset data
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  } else {
    fs.emptyDirSync(DATA_DIR);
  }
  fs.cpSync(DATA_SRC_DIR, DATA_DIR, { recursive: true });
});

describe("cli", () => {
  let data: Record<string, any> = {};
  let data2: Record<string, any> = {};

  it("updates", async () => {
    execSync(`newver ${v2} --commit false --files=test/data/cli.json`);
  }).timeout(2500);

  it("sets the version correctly", async () => {
    const contents = fs.readFileSync(path.join(DATA_DIR, "cli.json"), "utf-8");
    data = JSON.parse(contents);
    expect(data.version).to.equal(v2);
  });

  it("doesn't mess up the rest of the file", async () => {
    data.version = v1;
    const contentsSrc = fs.readFileSync(path.join(DATA_SRC_DIR, "cli.json"), "utf-8");
    const dataSrc = JSON.parse(contentsSrc);
    expect(data).to.deep.equal(dataSrc);
  });

  it("updates two files with custom data paths", async () => {
    execSync(
      `newver ${v2} -c false -f test/data/cli2.json -f test/data/cli3.json --data-paths=example.version --data-paths=anotherExample[0].version`,
    );
  }).timeout(2500);

  it("sets the version correctly in each custom path", async () => {
    // 2
    const contents = fs.readFileSync(path.join(DATA_DIR, "cli2.json"), "utf-8");
    data = JSON.parse(contents);
    expect(data.example.version).to.equal(v2);
    // 3
    const contents2 = fs.readFileSync(path.join(DATA_DIR, "cli3.json"), "utf-8");
    data2 = JSON.parse(contents2);
    expect(data2.anotherExample[0].version).to.equal(v2);
  });

  it("doesn't mess up the rest of either file", async () => {
    // 2
    data.example.version = v1;
    const contentsSrc = fs.readFileSync(path.join(DATA_SRC_DIR, "cli2.json"), "utf-8");
    const dataSrc = JSON.parse(contentsSrc);
    expect(data).to.deep.equal(dataSrc);
    // 3
    data2.anotherExample[0].version = v1;
    const contentsSrc2 = fs.readFileSync(path.join(DATA_SRC_DIR, "cli3.json"), "utf-8");
    const dataSrc2 = JSON.parse(contentsSrc2);
    expect(data2).to.deep.equal(dataSrc2);
  });
});
