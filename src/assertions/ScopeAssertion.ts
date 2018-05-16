import { AssertionKind, AssertionObject } from "./Assertion";

export class ScopeAssertion extends AssertionObject {
    constructor(private variable: string, private logicalVariable: string) {
        super(AssertionKind.Scope);
    }

    public toString(): string {
        return `Scope(${this.variable}, ${this.logicalVariable})`;
    }
}
