import fs from "fs";
import path from "path";
import { exec } from "child_process";
import readline from "readline";
import log from "./log.js";
import chalk from "chalk";

const PROJ_ROOT = path.resolve(".");
const PKG_JSON_FILE = path.join(PROJ_ROOT, "package.json");
const PKG_LOCK_FILE = path.join(PROJ_ROOT, "package-lock.json");

export type NewVersionOptions = {
  commit: boolean;
  tag: boolean;
  push: boolean;
  prefix: string;
  files: string[];
};

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

async function loadJson(path: string): Promise<Record<string, unknown>> {
  return new Promise(function (resolve, _reject) {
    fs.readFile(path, "utf-8", (err, data) => {
      if (err) {
        log.err(`[${err.code}] ${err.message}`);
        process.exit();
      }
      resolve(JSON.parse(data));
    });
  });
}

async function updatePackageVersion(version: string): Promise<boolean> {
  const pkgJson: Record<string, unknown> = await loadJson(normalizePath(PKG_JSON_FILE));
  const pkgLock: Record<string, unknown> = await loadJson(normalizePath(PKG_LOCK_FILE));

  if (!("version" in pkgJson)) {
    log.err("Error parsing package.json");
    process.exit();
  }

  if (
    !pkgLock.packages ||
    typeof pkgLock.packages !== "object" ||
    !("" in pkgLock.packages) ||
    !pkgLock.packages[""] ||
    typeof pkgLock.packages[""] !== "object" ||
    !("version" in pkgLock.packages[""])
  ) {
    log.err("Error parsing package-lock.json");
    process.exit();
  }

  const versionUpdate = pkgJson.version !== version;

  pkgJson.version = version;
  pkgLock.version = version;
  pkgLock.packages[""].version = version;

  log.info("Updating package files...");
  try {
    fs.writeFileSync(PKG_JSON_FILE, `${JSON.stringify(pkgJson, null, 2)}\n`);
    log.info("package.json updated");
    fs.writeFileSync(PKG_LOCK_FILE, `${JSON.stringify(pkgLock, null, 2)}\n`);
    log.info("package-lock.json updated");
  } catch (err: unknown) {
    if (err && typeof err === "string") {
      log.err(err);
    } else if (err && typeof err === "object" && "message" in err) {
      if ("message" in err) {
        const code = "code" in err ? err.code : "ERROR";
        log.err(`[${code}] ${err.message}`);
      } else {
        log.err(JSON.stringify(err));
      }
    } else {
      log.err("An unknown error occurred.");
    }
    process.exit();
  }

  return versionUpdate;
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
  log.msg(`Updating version to ${chalk.magenta(version)}`);
  version = parseVersion(version);
  await updatePackageVersion(version);
  if (opts.commit || (typeof opts.commit === "undefined" && (await question("Create commit?")))) {
    if (!opts.files) {
      opts.files = ["package.json", "package-lock.json"];
    }
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
