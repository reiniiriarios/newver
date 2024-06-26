#!/usr/bin/env node

import yargs, { ArgumentsCamelCase } from "yargs";
import { hideBin } from "yargs/helpers";
import newver, { NewVersionOptions } from "./newver.js";

yargs(hideBin(process.argv))
  .scriptName("newver")
  .usage("Usage: $0 <version> [options]")
  .help("help")
  .alias("help", "h")
  .version(false)
  .option("commit", {
    alias: "c",
    describe: "Create a commit",
    type: "boolean",
  })
  .option("tag", {
    alias: "t",
    describe: "Tag new commit",
    type: "boolean",
  })
  .option("push", {
    alias: "p",
    describe: "Push new commit (and tag)",
    type: "boolean",
  })
  .option("prefix", {
    alias: "x",
    describe: "Conventional commit prefix",
    type: "string",
  })
  .implies("tag", "commit")
  .implies("push", "commit")
  .option("ignore-regression", {
    alias: "i",
    describe: "Don't warn about version regression",
    type: "boolean",
  })
  .option("files", {
    alias: "f",
    describe: "Files to update version in",
    type: "array",
  })
  .option("data-paths", {
    alias: "d",
    describe: "Paths of objects in files to set version",
    type: "array",
  })
  .command(
    "* <version>",
    "",
    (argv) => {
      argv
        .positional("version", {
          describe: "New version",
          type: "string",
        })
        .demandOption("version");
    },
    (args: ArgumentsCamelCase<NewVersionOptions & { version: string }>) => {
      const { version, _: _, $0: _$0, ...opts } = args;
      // trim possible quotes
      if (opts.prefix) {
        opts.prefix = opts.prefix.replace(/^['"]/, "").replace(/['"]$/, "");
      }
      if (opts.files) {
        opts.files = opts.files.map((f) => f.replace(/^['"]/, "").replace(/['"]$/, ""));
      }
      if (opts.dataPaths) {
        opts.dataPaths = opts.dataPaths.map((d) => d.replace(/^['"]/, "").replace(/['"]$/, ""));
      }
      newver(version, opts);
    },
  )
  .strict()
  .recommendCommands()
  .parse();
