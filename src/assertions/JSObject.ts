import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class JSObject extends AssertionObject {
    /**
     * @param {string} obj
     * @param {string} proto either the name of the logical variable denoting the prototype of
     *      obj or the string Object.prototype
     */
    constructor(private obj: string, private proto: string) {
        super(AssertionKind.JSObject);
    }

    public toString() {
        return `JSObjWithProto(${this.obj}, ${this.proto})`;
    }
}
