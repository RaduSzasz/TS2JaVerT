import * as yargs from "yargs";
import { Program } from "./assertions/typescript/Program";

const args = yargs
    .requiresArg("file")
    .argv;

const program = new Program(args.file);
program.determineGamma();
program.findAllClasses();
program.determineCapturedVars();

