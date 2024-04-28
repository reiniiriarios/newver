import chalk from "chalk";

export default {
  msg: (message: string) => process.stdout.write(`${message}\n`),
  info: (message: string) => process.stdout.write(`${chalk.blue("▸")} ${message}\n`),
  cmd: (message: string) => process.stdout.write(`${chalk.cyan("▸")} ${message}\n`),
  err: (message: string) => process.stderr.write(chalk.red(`${message.trim()}\n`)),
  stdout: (message: string) =>
    message.trim().length ? process.stdout.write(`${chalk.gray(message.trim().replace(/[\r\n\s]*$/gm, ""))}\n`) : null,
  stderr: (message: string) =>
    message.trim().length ? process.stderr.write(`${chalk.red(message.trim().replace(/[\r\n\s]*$/gm, ""))}\n`) : null,
};
