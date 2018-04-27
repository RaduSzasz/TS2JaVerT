import { Assertion } from "../Assertion";

export class HardcodedStringAssertion implements Assertion {
    constructor(private text: string) {}

    public toString() {
        return this.text;
    }
}
