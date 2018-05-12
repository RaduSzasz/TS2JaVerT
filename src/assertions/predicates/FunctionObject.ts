import { Assertion } from "../Assertion";

export class FunctionObject implements Assertion {
    constructor(private obj: string, private id?: string) { }

    public toString() {
        return `FunctionObject(${this.obj}, ${this.id || "_"}, _)`;
    }
}
