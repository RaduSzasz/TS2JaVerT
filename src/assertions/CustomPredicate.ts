import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class CustomPredicate extends AssertionObject {
    constructor(private predicateName: string, private varName: string) {
        super (AssertionKind.Custom);
    }

    public toString() {
        return `${this.predicateName}(${this.varName})`;
    }

    public getThisAssertion() {
        if (this.varName.startsWith("this")) {
            return this;
        }
        return undefined;
    }
}
