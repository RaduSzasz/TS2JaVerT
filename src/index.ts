import * as yargs from "yargs";
import { Program } from "./typescript/Program";

const args = yargs
    .requiresArg("input")
    .option("omit", {
        array: true,
        coerce: (omittedParamsStr: string[]) => {
            return omittedParamsStr.map((arg) => {
                const splitArg = arg.split(":");

                if (splitArg.length !== 2) {
                    throw new Error("Id must be of shape id:paramName");
                }

                return {
                    id: splitArg[0],
                    param: splitArg[1],
                };
            });
        },
    })
    .argv;

const omittedParams: Map<string, string[]> = new Map();
(args.omit || []).forEach(({ id, param }: { id: string, param: string }) => {
    omittedParams.set(id, (omittedParams.get(id) || []).concat(param));
});
const program = new Program(args.input, omittedParams);
program.print();
