import { exec } from "child_process";
import readline from "readline";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import toml from "@iarna/toml";
import chalk from "chalk";
import log from "./log.js";

const PROJ_ROOT = path.resolve(".");

export type NewVersionOptions = {
  commit: boolean;
  tag: boolean;
  push: boolean;
  prefix: string;
  files: string[];
  quiet: boolean;
};

type JsonMap = { [key: string]: AnyJson };
type JsonArray = boolean[] | number[] | string[] | JsonMap[] | Date[];
type AnyJson = boolean | number | string | JsonMap | Date | JsonArray | JsonArray[];

function parseVersion(version: string): string {
  if (!version || !/^v?\d+\.\d+\.\d+(?:\.\d+)?(?:-[a-z])?$/i.test(version)) {
    log.err("Invalid new version. Usage: newver 1.2.3");
    process.exit();
  }
  version = version.replace(/^v/i, "");
  return version;
}

function normalizePath(file: string): string {
  // Make absolute if relative.
  if (!file.match(/^(?:\/|[a-z]:[/\\])/i)) {
    file = path.join(PROJ_ROOT, file);
  }
  if (!fs.existsSync(file)) {
    log.err(`File not found: ${chalk.redBright(file)}`);
    process.exit();
  }
  return file;
}

async function getData(file: string): Promise<JsonMap> {
  return new Promise(function (resolve, _reject) {
    try {
      fs.readFile(normalizePath(file), "utf-8", (err, contents) => {
        if (err) {
          log.err(`[${err.code}] ${err.message}`);
          process.exit();
        }
        if (file.endsWith(".json")) {
          resolve(JSON.parse(contents));
          return;
        }
        if (file.endsWith(".yaml") || file.endsWith(".yml")) {
          const data = yaml.load(contents);
          if (data && typeof data === "object") {
            resolve(data as JsonMap);
            return;
          }
          log.err(`Error parsing ${chalk.redBright(file)}`);
          process.exit();
        }
        if (file.endsWith(".toml")) {
          const data = toml.parse(contents);
          if (data && typeof data === "object") {
            resolve(data);
            return;
          }
          log.err(`Error parsing ${chalk.redBright(file)}`);
          process.exit();
        }
        log.err(`Unsupported filetype: ${chalk.redBright(file)}`);
        process.exit();
      });
    } catch (err: unknown) {
      log.exception(err);
      process.exit();
    }
  });
}

function saveData(file: string, data: JsonMap): void {
  try {
    let contents: string = "";
    if (file.endsWith(".json")) {
      contents = JSON.stringify(data, null, 2);
    } else if (file.endsWith(".yaml") || file.endsWith(".yml")) {
      contents = yaml.dump(data);
    } else if (file.endsWith(".toml")) {
      contents = toml.stringify(data);
    }
    if (!contents) {
      log.err(`Unsupported filetype: ${chalk.redBright(file)}`);
      process.exit();
    }
    fs.writeFileSync(normalizePath(file), `${contents}\n`);
    log.info(`${chalk.green(file)} updated`);
  } catch (err: unknown) {
    log.exception(err);
    process.exit();
  }
}

function cmpVersions(v1: string, v2: string) {
  const partsA = v1.split(".");
  const partsB = v2.split(".");
  const nbParts = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < nbParts; ++i) {
    if (partsA[i] === undefined) {
      partsA[i] = "0";
    }
    if (partsB[i] === undefined) {
      partsB[i] = "0";
    }
    const intA = parseInt(partsA[i], 10);
    const intB = parseInt(partsB[i], 10);
    if (!isNaN(intA) && !isNaN(intB)) {
      if (intA > intB) {
        return 1;
      } else if (intA < intB) {
        return -1;
      }
    }

    const compare = partsA[i].localeCompare(partsB[i]);
    if (compare !== 0) {
      return compare;
    }
  }

  return 0;
}

async function confirmVersionChange(v1: string, v2: string, file: string): Promise<boolean> {
  if (v1 === v2) {
    return false;
  }
  // change in suffixes
  const [v1v, v1f] = v1.split("-");
  const [v2v, v2f] = v2.split("-");
  if (v1f !== v2f) {
    return true;
  }
  // check if new version is older than current version
  if (cmpVersions(v1v, v2v) > 0) {
    if (
      !(await question(
        `Version ${chalk.magenta(v2)} is older than version ${chalk.magenta(v1)} in ${chalk.green(file)}. Proceed?`,
      ))
    ) {
      return false;
    }
  }
  return true;
}

async function setVersion(data: JsonMap, version: string, file: string): Promise<boolean> {
  // e.g. package.json, package-lock.json, snapcraft.yaml
  if ("version" in data) {
    if (!(await confirmVersionChange(data.version as string, version, file))) {
      return false;
    }
    data.version = version;
    return true;
  }
  // e.g. manifest.json
  if ("Version" in data) {
    if (!(await confirmVersionChange(data.Version as string, version, file))) {
      return false;
    }
    data.Version = version;
    return true;
  }
  // e.g. Cargo.toml
  if ("package" in data && typeof data.package === "object" && "version" in data.package) {
    if (!(await confirmVersionChange(data.package.version as string, version, file))) {
      return false;
    }
    data.package.version = version;
    return true;
  }
  // e.g. wails.json
  if ("info" in data && typeof data.info === "object") {
    if ("productVersion" in data.info) {
      if (!(await confirmVersionChange(data.info.productVersion as string, version, file))) {
        return false;
      }
      data.info.productVersion = version;
      return true;
    }
    if ("version" in data.info) {
      if (!(await confirmVersionChange(data.info.version as string, version, file))) {
        return false;
      }
      data.info.version = version;
      return true;
    }
  }
  return false;
}

function setPkgLockVersion(data: JsonMap, version: string): boolean {
  if (
    data.packages &&
    typeof data.packages === "object" &&
    "" in data.packages &&
    data.packages[""] &&
    typeof data.packages[""] === "object" &&
    "version" in data.packages[""]
  ) {
    data.packages[""].version = version;
    return true;
  }
  return false;
}

function gitExec(cmd: string): Promise<void> {
  cmd = `git ${cmd}`;
  log.cmd(cmd);
  return new Promise(function (resolve, _reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (stdout) {
        log.stdout(stdout);
      }
      if (stderr) {
        log.stderr(stderr);
      }
      if (err && (!stderr || !err.message.includes(stderr))) {
        log.err(`[${err.code}] ${err.message}`);
      }
      if (stderr || err) {
        process.exit();
      }
      resolve();
    });
  });
}

async function question(q: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(function (resolve, _reject) {
    rl.question(`${chalk.magenta("▸")} ${q} ${chalk.gray("(Y/n)")} `, (ans) => {
      rl.close();
      if (!ans || ["y", "yes"].includes(ans.toLowerCase())) {
        resolve(true);
      }
      resolve(false);
    });
  });
}

async function gitCommit(version: string, files: string[], prefix?: string) {
  await gitExec(`add ${files.join(" ")}`);
  prefix = prefix ? `${prefix}: ` : "";
  await gitExec(`commit -m "${prefix}update version to ${version}"`);
}

async function gitTag(version: string): Promise<void> {
  await gitExec(`tag v${version}`);
}

async function gitPush(): Promise<void> {
  await gitExec("push");
}

async function gitPushTag(version: string): Promise<void> {
  await gitExec(`push origin v${version}`);
}

export default async function newver(version: string, opts: Partial<NewVersionOptions> = {}) {
  log.quiet = !!opts.quiet;
  log.msg(`Updating version to ${chalk.magenta(version)}`);

  // Args
  version = parseVersion(version);
  if (!opts.files) {
    opts.files = ["package.json", "package-lock.json"];
  }

  // Parse
  for (const file of opts.files) {
    const data = await getData(file);
    if (!(await setVersion(data, version, file))) {
      log.info(`No update to ${chalk.green(file)}`);
    } else {
      if (file.endsWith("package-lock.json") && !setPkgLockVersion(data, version)) {
        log.err(`Error setting secondary version in ${chalk.redBright(file)}`);
      }
      saveData(file, data);
    }
  }

  // Git
  if (opts.commit || (typeof opts.commit === "undefined" && (await question("Create commit?")))) {
    await gitCommit(version, opts.files, opts.prefix);
    if (opts.tag || (typeof opts.commit === "undefined" && (await question("Create tag?")))) {
      await gitTag(version);
    }
    if (opts.push || (typeof opts.push === "undefined" && (await question("Push to origin?")))) {
      await gitPush();
      if (opts.tag) {
        await gitPushTag(version);
      }
    }
  }
}
