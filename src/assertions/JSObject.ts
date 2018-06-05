import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class JSObject extends AssertionObject {
    /**
     * @param {string} obj
     * @param {string} proto either the name of the logical variable denoting the prototype of
     *      obj or the string Object.prototype
     */
    constructor(public readonly obj: string, public readonly proto: string) {
        super(AssertionKind.JSObject);
    }

    public toString() {
        return `JSObjWithProto(${this.obj}, ${this.proto})`;
    }

    public getThisAssertion() {
        if (this.obj === "this") {
            return this;
        }

        return undefined;
    }
}
