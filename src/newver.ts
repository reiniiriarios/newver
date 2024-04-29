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
  ignoreRegression: boolean;
};

type JsonMap = { [key: string]: AnyJson };
type JsonArray = boolean[] | number[] | string[] | JsonMap[] | Date[];
type AnyJson = boolean | number | string | JsonMap | Date | JsonArray | JsonArray[];
type FileData = { name: string; path: string };

const defaultFiles = [
  "package.json",
  "package-lock.json",
  "Cargo.toml",
  "snapcraft.yaml",
  "wails.json",
  "go.mod",
  // ??
];

/**
 * Update version in files and, optionally, commit, tag, and push.
 *
 * @param {string} version New version
 * @param {Partial<NewVersionOptions>} opts Options, see `newver --help`
 */
export default async function newver(version: string, opts: Partial<NewVersionOptions> = {}) {
  const files: FileData[] = [];
  const processedFiles: FileData[] = [];

  // Main
  await (async function () {
    log.quiet = !!opts.quiet;
    log.msg(`Updating version to ${chalk.magenta(version)}`);

    // Version
    // eslint-disable-next-line no-useless-escape
    if (!version || !/^v?\d+\.\d+\.\d+(?:\.\d+)?(?:-[a-z0-9\-\.\+])?$/i.test(version)) {
      log.err(`Invalid new version. Usage: ${chalk.yellow("newver <version> [options]")}`);
      log.err(`More information: ${chalk.underline("https://semver.org/")}`);
      return;
    }
    version = version.replace(/^v/i, "");

    // Files
    if (!opts.files) {
      for (const file of defaultFiles) {
        const filepath = normalizePath(file);
        if (fs.existsSync(filepath)) {
          files.push({ name: file, path: filepath });
        }
      }
      if (!files.length) {
        log.err("No applicable package files found.");
        log.err(
          `Specify with ${chalk.yellow("newver <version> --files=path/to/file.ext --files=path/to/another/file.ext")}`,
        );
        process.exit(1);
      }
    } else {
      for (const file of opts.files) {
        const filepath = normalizePath(file);
        if (!fs.existsSync(filepath)) {
          log.err(`File not found: ${chalk.redBright(file)}`);
          process.exit(1);
        }
        files.push({ name: file, path: filepath });
      }
    }

    // Parse
    for (const file of files) {
      if (file.name.endsWith("go.mod")) {
        // Find and replace
        const contents = await getContents(file);
        const updatedContents = await setGoModVersion(contents, file);
        if (!updatedContents) {
          log.info(`No update to ${chalk.green(file.name)}`);
        } else {
          saveContents(file, updatedContents);
        }
      } else {
        // Parse data
        const data = await getData(file);
        if (!(await setVersion(data, file))) {
          log.info(`No update to ${chalk.green(file.name)}`);
        } else {
          if (file.name.endsWith("package-lock.json") && !setPkgLockVersion(data)) {
            log.err(`Error setting secondary version in ${chalk.redBright(file.name)}`);
            process.exit(1);
          }
          saveData(file, data);
        }
      }
    }
    if (!processedFiles.length) {
      process.exit();
    }

    // Git
    if (opts.commit || (typeof opts.commit === "undefined" && (await question("Create commit?")))) {
      await gitCommit();
      if (opts.tag || (typeof opts.commit === "undefined" && (await question("Create tag?")))) {
        await gitTag();
      }
      if (opts.push || (typeof opts.push === "undefined" && (await question("Push to origin?")))) {
        await gitPush();
        if (opts.tag) {
          await gitPushTag();
        }
      }
    }
  })();

  /**
   * Normalize a file path to an absolute path.
   *
   * @param {string} file
   * @returns {string} normalized path
   */
  function normalizePath(file: string): string {
    // Make absolute if relative.
    if (!file.match(/^(?:\/|[a-z]:[/\\])/i)) {
      file = path.join(PROJ_ROOT, file);
    }
    return file;
  }

  /**
   * Get data from file.
   *
   * @param {FileData} file
   * @returns {Promise<string>} File contents
   */
  async function getContents(file: FileData): Promise<string> {
    return new Promise(function (resolve, _reject) {
      try {
        fs.readFile(file.path, "utf-8", (err, contents) => {
          if (err) {
            log.err(`[${err.code}] ${err.message}`);
            process.exit(1);
          }
          resolve(contents);
        });
      } catch (err: unknown) {
        log.exception(err);
        process.exit(1);
      }
    });
  }

  /**
   * Get data from file.
   *
   * @param {FileData} file
   * @returns {Promise<JsonMap>} File data as object
   */
  async function getData(file: FileData): Promise<JsonMap> {
    return new Promise(function (resolve, _reject) {
      try {
        getContents(file).then((contents) => {
          if (file.name.endsWith(".json")) {
            resolve(JSON.parse(contents));
            return;
          }
          if (file.name.endsWith(".yaml") || file.name.endsWith(".yml")) {
            const data = yaml.load(contents);
            if (data && typeof data === "object") {
              resolve(data as JsonMap);
              return;
            }
            log.err(`Error parsing ${chalk.redBright(file.name)}`);
            process.exit(1);
          }
          if (file.name.endsWith(".toml")) {
            const data = toml.parse(contents);
            if (data && typeof data === "object") {
              resolve(data);
              return;
            }
            log.err(`Error parsing ${chalk.redBright(file.name)}`);
            process.exit(1);
          }
          log.err(`Unsupported filetype: ${chalk.redBright(file.name)}`);
          process.exit(1);
        });
      } catch (err: unknown) {
        log.exception(err);
        process.exit(1);
      }
    });
  }

  /**
   * Save data to file.
   *
   * @param {FileData} file
   * @param {JsonMap} data
   */
  function saveData(file: FileData, data: JsonMap): void {
    try {
      let contents: string = "";
      if (file.name.endsWith(".json")) {
        contents = JSON.stringify(data, null, 2);
      } else if (file.name.endsWith(".yaml") || file.name.endsWith(".yml")) {
        contents = yaml.dump(data);
      } else if (file.name.endsWith(".toml")) {
        contents = toml.stringify(data);
      }
      if (!contents) {
        log.err(`Unsupported filetype: ${chalk.redBright(file.name)}`);
        process.exit(1);
      }
      saveContents(file, contents);
    } catch (err: unknown) {
      log.exception(err);
      process.exit(1);
    }
  }

  /**
   * Save data to file.
   *
   * @param {FileData} file
   * @param {string} contents
   */
  function saveContents(file: FileData, contents: string): void {
    try {
      if (!contents.endsWith("\n")) {
        contents = `${contents}\n`;
      }
      fs.writeFileSync(file.path, contents);
      processedFiles.push(file);
      log.info(`${chalk.green(file.name)} updated`);
    } catch (err: unknown) {
      log.exception(err);
      process.exit(1);
    }
  }

  /**
   * Compare two versions.
   *
   * @param {string} v1 Current version
   * @param {string} v2 New version
   * @returns {number} 0: equal, > 0: v1 is the newer version; < 0: v2 is the newer version
   */
  function cmpVersions(v1: string, v2: string): number {
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

  /**
   * Confirm version change for a specific file.
   *
   * @param {string} v1 Current version
   * @param {string} v2 New version
   * @param {FileData} file
   * @returns {Promise<boolean>} Version for this file should be updated
   */
  async function confirmVersionChange(v1: string, v2: string, file: FileData): Promise<boolean> {
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
    if (!opts.ignoreRegression && cmpVersions(v1v, v2v) > 0) {
      if (
        !(await question(
          `Version ${chalk.magenta(v2)} is older than version ${chalk.magenta(v1)} in ${chalk.green(file.name)}. Proceed?`,
        ))
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Set version to data in specified file.
   *
   * Automatically looks for version based on predefined probable/common locations.
   *
   * @param {JsonMap} data
   * @param {FileData} file
   * @returns {boolean} Version was updated
   */
  async function setVersion(data: JsonMap, file: FileData): Promise<boolean> {
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

  /**
   * Set secondary version in package-lock.json data.
   *
   * data.packages[""].version = version
   *
   * @param {JsonMap} data
   * @returns {boolean} Version was updated
   */
  function setPkgLockVersion(data: JsonMap): boolean {
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

  /**
   * Update version in go.mod.
   *
   * @param {string} contents File contents
   * @param {FileData} file
   * @returns {Promise<string | null>} Updated contents, or null if nothing updated.
   */
  async function setGoModVersion(contents: string, file: FileData): Promise<string | null> {
    if (!contents.match(/^module [^\s]+/m)) {
      return null;
    }
    if (contents.match(/^module [^\s]+ v.[0-9a-z\-\.\+]+/m)) {
      const currentVersion = contents.match(/^module [^\s]+ v([0-9a-z\-\.\+]+)/im);
      if (!currentVersion) {
        log.err("Unexpected error updating go.mod");
        process.exit(1);
      }

      // For module versions v2 and later, the module name must end with the major version number, such as /v2.
      const currentMajor = parseInt(currentVersion[1].split(".")[0]);
      const newMajor = parseInt(version.split(".")[0]);
      const q = `This constitutes a backwards major version change, from ${chalk.magenta(`v${currentMajor}`)} to ${chalk.magenta(`v${newMajor}`)}. Proceed?`;
      if (
        (newMajor < currentMajor && !opts.ignoreRegression && !(await question(q))) ||
        !(await confirmVersionChange(currentVersion[1], version, file))
      ) {
        return null;
      }
      if (newMajor >= 2 && newMajor > currentMajor) {
        if (newMajor > 2) {
          // Update suffix, update version.
          return contents.replace(/^(module [^\s]+)\/v[0-9] v[0-9a-z\-\.\+]+/im, `$1/v${newMajor} v${version}`);
        } else {
          // Add suffix, update version.
          return contents.replace(/^(module [^\s]+) v[0-9a-z\-\.\+]+/im, `$1/v${newMajor} v${version}`);
        }
      } else {
        // Update version.
        return contents.replace(/^(module [^\s]+) v[0-9a-z\-\.\+]+/im, `$1 v${version}`);
      }
    } else {
      // Add version.
      return contents.replace(/^(module [^\s]+)/im, `$1 v${version}`);
    }
  }

  /**
   * Ask the user a y/n question.
   *
   * Defaults to yes if nothing entered.
   *
   * @param {string} q Question
   * @returns {Promise<boolean>} Answer (y/n)
   */
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

  /**
   * Run a git command ang log output to user.
   *
   * @param {string} cmd Git command
   * @returns {Promise<void>}
   */
  function gitExec(cmd: string): Promise<void> {
    cmd = `git ${cmd}`;
    log.cmd(cmd);
    return new Promise(function (resolve, _reject) {
      exec(cmd, (err, stdout, stderr) => {
        if (stdout) {
          log.stdout(stdout);
        }
        if (stderr) {
          if (!err || !err.message.includes(stderr)) {
            // [sic] git outputs some non-error information to stderr
            log.stdout(stderr);
          }
        }
        if (err) {
          log.err(`[${err.code}] ${err.message}`);
          process.exit(1);
        }
        resolve();
      });
    });
  }

  /**
   * Commit files that were changed.
   *
   * @returns {Promise<void>}
   */
  async function gitCommit(): Promise<void> {
    await gitExec(`add ${processedFiles.map((f) => f.name).join(" ")}`);
    const prefix = opts.prefix ? `${opts.prefix}: ` : "";
    await gitExec(`commit -m "${prefix}update version to ${version}"`);
  }

  /**
   * git tag {tag}
   *
   * @returns {Promise<void>}
   */
  async function gitTag(): Promise<void> {
    await gitExec(`tag v${version}`);
  }

  /**
   * git push
   *
   * @returns {Promise<void>}
   */
  async function gitPush(): Promise<void> {
    await gitExec("push");
  }

  /**
   * git push origin {tag}
   *
   * @returns {Promise<void>}
   */
  async function gitPushTag(): Promise<void> {
    await gitExec(`push origin v${version}`);
  }
}
