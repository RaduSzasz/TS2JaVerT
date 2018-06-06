import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class FunctionPrototype extends AssertionObject {
    public constructor() {
        super(AssertionKind.FunctionPrototype);
    }

    public toString() {
        return "FunctionPrototype()";
    }
}
