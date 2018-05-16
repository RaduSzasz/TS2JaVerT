import { AssertionKind, AssertionObject } from "./Assertion";

export class HardcodedStringAssertion extends AssertionObject {
    constructor(private text: string) {
        super(AssertionKind.HardcodedString);
    }

    public toString() {
        return this.text;
    }
}
