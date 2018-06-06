import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class FunctionObject extends AssertionObject {
    constructor(private obj: string, private id?: string, private scopeChain?: string) {
        super(AssertionKind.FunctionObject);
    }

    public toString() {
        const id = this.id ? `"${this.id}"` : "_";
        const scopeChain = this.scopeChain || "_";
        return `JSFunctionObject(${this.obj}, ${id}, ${scopeChain}, _, _)`;
    }
}
