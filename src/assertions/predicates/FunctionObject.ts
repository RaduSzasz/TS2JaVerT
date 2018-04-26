import { Assertion } from "../Assertion";

export class FunctionObject implements Assertion {
    constructor(private obj: string) { }

    public toString() {
        return `FunctionObject(${this.obj}, _, _, _)`;
    }
}
