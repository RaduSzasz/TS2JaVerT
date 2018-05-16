import { AssertionKind, AssertionObject } from "./Assertion";

export class CustomPredicate extends AssertionObject {
    constructor(private predicateName: string, private varName: string) {
        super (AssertionKind.Custom);
    }

    public toString() {
        return `${this.predicateName}(${this.varName})`;
    }
}
