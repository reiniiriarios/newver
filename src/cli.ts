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
  .option("files", {
    alias: "f",
    describe: "Files to update version in.",
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
      newver(version, opts);
    },
  )
  .strict()
  .recommendCommands()
  .parse();
