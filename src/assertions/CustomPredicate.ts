import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class CustomPredicate extends AssertionObject {
    private readonly varNames: string[];
    constructor(private predicateName: string, ...varNames: string[]) {
        super (AssertionKind.Custom);
        this.varNames = varNames;
    }

    public toString() {
        return `${this.predicateName}(${this.varNames.join(", ")})`;
    }

    public getThisAssertion() {
        const [first] = this.varNames;
        if (first === "this") {
            return this;
        }
        return undefined;
    }
}
