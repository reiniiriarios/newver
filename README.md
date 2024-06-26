# 🔥 newver

[![latest version](https://img.shields.io/npm/v/@reiniiriarios/newver?label=latest)](https://www.npmjs.com/package/@reiniiriarios/newver)
[![downloads](https://img.shields.io/npm/dt/@reiniiriarios/newver)](https://www.npmjs.com/package/@reiniiriarios/newver)
![types: Typescript](https://img.shields.io/badge/types-Typescript-blue)
![build](https://img.shields.io/github/actions/workflow/status/reiniiriarios/newver/publish.yaml)

A silly little script to help quickly update a version in package files, then commit, tag, and push.
Useful when, like me, you use tagged releases and push versions manually and frequently.

## Getting Started

```
npm i --save-dev @reiniiriarios/newver
```

package.json:

```json
{
  "scripts": {
    "bump": "newver --commit=true"
  }
}
```

```sh
npm run bump 1.2.3
```

## CLI Usage

```sh
newver <version> [options]
newver 1.2.3
newver 1.2.3 -c
newver 1.2.3 --commit
newver --commit 1.2.3
newver 1.2.3 --commit=true --tag=false --push=true --prefix="chore(release)"
newver -cptx "chore(release)" 1.2.3
newver 1.2.3 --files=path/to/file.ext --files=path/to/another/file.ext
newver --files=path/to/file.json --data-paths=package.info.version 1.2.3
```

For option details:

```sh
newver --help
```

### Example output

```
$ newver -ct --prefix=chore(release) 1.0.3
Updating version to 1.0.3
▸ package.json updated
▸ package-lock.json updated
▸ git add package.json package-lock.json
▸ git commit -m "chore(release): update version to 1.0.3"
[main 999def8] chore(release): update version to 1.0.3
 2 files changed, 3 insertions(+), 3 deletions(-)
▸ git tag v1.0.3
▸ Push to origin? (Y/n) y
▸ git push
To https://github.com/reiniiriarios/newver.git
   2dba8e8..999def8  main -> main
▸ git push origin v1.0.3
To https://github.com/reiniiriarios/newver.git
 * [new tag]         v1.0.3 -> v1.0.3
```

```
$ newver --commit=false 1.0.0
Updating version to 1.0.0
▸ Version 1.0.0 is older than version 1.2.3 in package.json. Proceed? (Y/n) y
▸ package.json updated
▸ Version 1.0.0 is older than version 1.2.3 in package-lock.json. Proceed? (Y/n) y
▸ package-lock.json updated
```

## Script Usage

```ts
#!/usr/bin/env node
import newver from "@reiniiriarios/newver";

newver(process.args.pop(), {
  commit: true,
  prefix: "chore(release)",
  ignoreRegression: false,
  files: ["package.json", "package-lock.json", "path/to/another/file.json"],
});
```

## Supported data formats

- `.json`
- `.yaml` / `.yml`
- `.toml`

Other formats are find-and-replace.

## Supported auto-magical files

These will be looked for automatically in the project's root directory. Other files may be
specified manually.

- package.json
- package-lock.json
- Cargo.toml
- snapcraft.yaml
- tauri.config.json
- wails.json
- go.mod
