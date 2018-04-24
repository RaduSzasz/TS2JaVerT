import * as yargs from "yargs";
import { Program } from "./assertions/typescript/Program";

const args = yargs
    .requiresArg("input")
    .argv;

const program = new Program(args.input);
program.determineGamma();
program.findAllClasses();
program.determineCapturedVars();
program.placeAssertions();
program.print();
