import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class NoneAssertion extends AssertionObject {
    constructor(private o: string, private field: string) {
        super (AssertionKind.None);
    }

    public toString(): string {
        return `((${this.o}, "${this.field}") -> none)`;
    }
}
