import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class FunctionObject extends AssertionObject {
    constructor(private obj: string, private id?: string) {
        super(AssertionKind.FunctionObject);
    }

    public toString() {
        return `JSFunctionObject(${this.obj}, ${this.id || "_"}, _, _, _)`;
    }
}
