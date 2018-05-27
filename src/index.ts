import * as yargs from "yargs";
import { Program } from "./typescript/Program";

const args = yargs
    .requiresArg("input")
    .argv;

console.time("program-total");
const program = new Program(args.input);
program.print();
console.timeEnd("program-total");
