import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class InSetAssertion extends AssertionObject {
    public constructor(private element: string, private set: string[]) {
        super(AssertionKind.InSetAssertion);
    }

    public toString() {
        return `(${this.element} --e-- -{ ${this.set.join(", ")} }-)`;
    }
}
