import { AssertionKind, AssertionObject } from "./Assertion";

export class Emp extends AssertionObject {
    constructor() {
        super(AssertionKind.Emp);
    }

    public toString() {
        return "emp";
    }
}
