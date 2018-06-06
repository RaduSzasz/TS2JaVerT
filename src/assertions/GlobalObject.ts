import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class GlobalObject extends AssertionObject {
    constructor() {
        super(AssertionKind.GlobalObject);
    }

    public toString() {
        return "GlobalObject()";
    }
}
