import { FunctionSpec } from "../../FunctionSpec";
import { Class } from "../Class";
import { Program } from "../Program";
import { Type } from "../Types";
import { Variable } from "../Variable";
import { Function } from "./Function";

export class Constructor extends Function {
    constructor(program: Program,
                returnType: Type,
                params: Variable[],
                name: string,
                classVar?: Class,
    ) {
        super(program, returnType, params, name, classVar);
    }

    public generateAssertion(): FunctionSpec {
        return undefined;
    }
}
