import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class Emp extends AssertionObject {
    constructor() {
        super(AssertionKind.Emp);
    }

    public toString() {
        return "emp";
    }
}
