import path from "path";
import shell from "shelljs";

shell.rm("-Rf", path.join(path.resolve("./"), "dist"));
