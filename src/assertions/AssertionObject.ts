import { Assertion, AssertionKind } from "./Assertion";

export abstract class AssertionObject implements Assertion {
    public kind: AssertionKind;
    protected constructor(kind: AssertionKind) {
        this.kind = kind;
    }

    public getThisAssertion(): Assertion | undefined {
        return undefined;
    }
}
