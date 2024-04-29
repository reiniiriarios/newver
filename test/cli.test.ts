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
});
