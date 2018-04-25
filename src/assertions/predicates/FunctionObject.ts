import { Assertion } from "../Assertion";
import { Variable } from "../typescript/Variable";

export class FunctionObject implements Assertion {
    constructor(private obj: Variable) { }

    public toString() {
        return `FunctionObject(${this.obj.name}, _, _, _)`;
    }
}
