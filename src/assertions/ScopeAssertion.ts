import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class ScopeAssertion extends AssertionObject {
    constructor(private variable: string, private logicalVariable: string) {
        super(AssertionKind.Scope);
    }

    public toString(): string {
        return `scope(${this.variable} : ${this.logicalVariable})`;
    }
}
