import { AssertionKind, AssertionObject } from "./Assertion";

export class FunctionObject extends AssertionObject {
    constructor(private obj: string, private id?: string) {
        super(AssertionKind.FunctionObject);
    }

    public toString() {
        return `FunctionObject(${this.obj}, ${this.id || "_"}, _)`;
    }
}