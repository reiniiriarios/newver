import path from "path";
import fs from "fs-extra";
import { expect } from "chai";
import newver from "../src/newver.js";

const PROJ_ROOT = path.resolve(".");
const DATA_DIR = path.join(PROJ_ROOT, "test", "data");
const DATA_SRC_DIR = path.join(PROJ_ROOT, "test", "data-src");

// const v1 = "1.0.0";
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

describe("custom.json", () => {
  let contents: string = "";
  let data: Record<string, any> = {};

  it("sets existing version by property", async () => {
    await newver(v2, { files: ["test/data/custom.json"], dataPaths: ["one.two.three.v"], commit: false, quiet: true });
    contents = fs.readFileSync(path.join(DATA_DIR, "custom.json"), "utf-8");
    data = JSON.parse(contents);
    expect(data.one.two.three.v).to.equal(v2);
  });

  it("sets new version by property", async () => {
    await newver(v2, { files: ["test/data/custom.json"], dataPaths: ["x.y.z.v"], commit: false, quiet: true });
    contents = fs.readFileSync(path.join(DATA_DIR, "custom.json"), "utf-8");
    data = JSON.parse(contents);
    expect(data.x.y.z.v).to.equal(v2);
  });

  it("sets existing version by array", async () => {
    await newver(v2, { files: ["test/data/custom.json"], dataPaths: ["a[0].b[0].v"], commit: false, quiet: true });
    contents = fs.readFileSync(path.join(DATA_DIR, "custom.json"), "utf-8");
    data = JSON.parse(contents);
    expect(data.a[0].b[0].v).to.equal(v2);
  });

  it("sets new version by array", async () => {
    await newver(v2, { files: ["test/data/custom.json"], dataPaths: ["n[0].m[0].v"], commit: false, quiet: true });
    contents = fs.readFileSync(path.join(DATA_DIR, "custom.json"), "utf-8");
    data = JSON.parse(contents);
    expect(data.n[0].m[0].v).to.equal(v2);
  });
});
