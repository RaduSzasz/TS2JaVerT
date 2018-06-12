import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class GlobalVar extends AssertionObject {
    constructor(private readonly v: string, private readonly logical: string) {
        super(AssertionKind.GlobalVar);
    }

    public toString() {
        return `GlobalVar("${this.v}", ${this.logical})`;
    }
}
