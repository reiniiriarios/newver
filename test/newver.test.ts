import path from "path";
import fs from "fs-extra";
import { expect } from "chai";
import yaml from "js-yaml";
import toml from "@iarna/toml";
import newver from "../src/newver.js";

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

describe("package.json", () => {
  let data: Record<string, any> = {};

  it("updates", async () => {
    await newver(v2, { files: ["test/data/package.json"], commit: false, quiet: true });
  });

  it("sets the version correctly", async () => {
    const contents = fs.readFileSync(path.join(DATA_DIR, "package.json"), "utf-8");
    data = JSON.parse(contents);
    expect(data.version).to.equal(v2);
  });

  it("doesn't mess up the rest of the file", async () => {
    data.version = v1;
    const contentsSrc = fs.readFileSync(path.join(DATA_SRC_DIR, "package.json"), "utf-8");
    const dataSrc = JSON.parse(contentsSrc);
    expect(data).to.deep.equal(dataSrc);
  });
});

describe("package-lock.json", () => {
  let data: Record<string, any> = {};

  it("updates", async () => {
    await newver(v2, { files: ["test/data/package-lock.json"], commit: false, quiet: true });
  });

  it("sets the version correctly", async () => {
    const contents = fs.readFileSync(path.join(DATA_DIR, "package-lock.json"), "utf-8");
    data = JSON.parse(contents);
    expect(data.version).to.equal(v2);
    expect(data.packages[""].version).to.equal(v2);
  });

  it("doesn't mess up the rest of the file", async () => {
    data.version = v1;
    data.packages[""].version = v1;
    const contentsSrc = fs.readFileSync(path.join(DATA_SRC_DIR, "package-lock.json"), "utf-8");
    const dataSrc = JSON.parse(contentsSrc);
    expect(data).to.deep.equal(dataSrc);
  });
});

describe("Cargo.toml", () => {
  let data: Record<string, any> = {};

  it("updates", async () => {
    await newver(v2, { files: ["test/data/Cargo.toml"], commit: false, quiet: true });
  });

  it("sets the version correctly", async () => {
    const contents = fs.readFileSync(path.join(DATA_DIR, "Cargo.toml"), "utf-8");
    data = toml.parse(contents);
    expect((data.package as Record<string, unknown>).version).to.equal(v2);
  });

  it("doesn't mess up the rest of the file", async () => {
    data.package.version = v1;
    const contentsSrc = fs.readFileSync(path.join(DATA_SRC_DIR, "Cargo.toml"), "utf-8");
    const dataSrc = toml.parse(contentsSrc);
    expect(data).to.deep.equal(dataSrc);
  });
});

describe("snapcraft.yaml", () => {
  let data: Record<string, any> = {};

  it("updates", async () => {
    await newver(v2, { files: ["test/data/snapcraft.yaml"], commit: false, quiet: true });
  });

  it("sets the version correctly", async () => {
    const contents = fs.readFileSync(path.join(DATA_DIR, "snapcraft.yaml"), "utf-8");
    data = yaml.load(contents) as Record<string, any>;
    expect(data.version).to.equal(v2);
  });

  it("doesn't mess up the rest of the file", async () => {
    data.version = v1;
    const contentsSrc = fs.readFileSync(path.join(DATA_SRC_DIR, "snapcraft.yaml"), "utf-8");
    const dataSrc = yaml.load(contentsSrc);
    expect(data).to.deep.equal(dataSrc);
  });
});

describe("wails.json", () => {
  let data: Record<string, any> = {};

  it("updates", async () => {
    await newver(v2, { files: ["test/data/wails.json"], commit: false, quiet: true });
  });

  it("sets the version correctly", async () => {
    const contents = fs.readFileSync(path.join(DATA_DIR, "wails.json"), "utf-8");
    data = JSON.parse(contents);
    expect(data.info.productVersion).to.equal(v2);
  });

  it("doesn't mess up the rest of the file", async () => {
    data.info.productVersion = v1;
    const contentsSrc = fs.readFileSync(path.join(DATA_SRC_DIR, "wails.json"), "utf-8");
    const dataSrc = JSON.parse(contentsSrc);
    expect(data).to.deep.equal(dataSrc);
  });
});
