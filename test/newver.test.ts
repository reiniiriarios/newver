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
const v1b = "1.1.1";
const v2 = "2.2.2";
const v3 = "3.4.5";

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

describe("go.mod", () => {
  let contents0: string = "";

  it("updates", async () => {
    await newver(v1b, { files: ["test/data/v0.go.mod"], commit: false, quiet: true });
  });

  it("sets the version correctly", async () => {
    contents0 = fs.readFileSync(path.join(DATA_DIR, "v0.go.mod"), "utf-8");
    expect(contents0.startsWith(`module example.com/mymodule v${v1b}`)).to.be.true;
  });

  it("doesn't mess up the rest of the file", async () => {
    contents0 = contents0.replace(/^module example.com\/mymodule v[0-9\.]*/, `module example.com/mymodule`);
    const contentsSrc = fs.readFileSync(path.join(DATA_SRC_DIR, "v0.go.mod"), "utf-8");
    expect(contents0).to.equal(contentsSrc);
  });

  it("adds a major version correctly", async () => {
    await newver(v2, { files: ["test/data/v1.go.mod"], commit: false, quiet: true });
    let contents1 = fs.readFileSync(path.join(DATA_DIR, "v1.go.mod"), "utf-8");
    expect(contents1.startsWith(`module example.com/mymodule/v2 v${v2}`)).to.be.true;
    contents1 = contents1.replace(
      /^module example.com\/mymodule\/v2 (v[0-9\.]*)/,
      `module example.com/mymodule v${v1}`,
    );
    const contentsSrc = fs.readFileSync(path.join(DATA_SRC_DIR, "v1.go.mod"), "utf-8");
    expect(contents1).to.equal(contentsSrc);
  });

  it("updates a major version correctly", async () => {
    await newver(v3, { files: ["test/data/v2.go.mod"], commit: false, quiet: true });
    let contents2 = fs.readFileSync(path.join(DATA_DIR, "v2.go.mod"), "utf-8");
    expect(contents2.startsWith(`module example.com/mymodule/v3 v${v3}`)).to.be.true;
    contents2 = contents2.replace(
      /^module example.com\/mymodule\/v3 (v[0-9\.]*)/,
      `module example.com/mymodule/v2 v${v2}`,
    );
    const contentsSrc = fs.readFileSync(path.join(DATA_SRC_DIR, "v2.go.mod"), "utf-8");
    expect(contents2).to.equal(contentsSrc);
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
