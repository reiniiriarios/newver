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
```

For option details:

```sh
newver --help
```

### Example output

```
$ newver --commit=false 1.2.3
Updating version to 1.2.3
▸ package.json updated
▸ package-lock.json updated

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
  quiet: true,
  commit: true,
  prefix: "chore(release)",
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
