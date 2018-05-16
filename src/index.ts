import * as yargs from "yargs";
import { Program } from "./typescript/Program";

const args = yargs
    .requiresArg("input")
    .argv;

const program = new Program(args.input);
program.print();
