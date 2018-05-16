import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class HardcodedStringAssertion extends AssertionObject {
    constructor(private text: string) {
        super(AssertionKind.HardcodedString);
    }

    public toString() {
        return this.text;
    }
}
