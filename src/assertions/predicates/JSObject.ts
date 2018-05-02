import { Assertion } from "../Assertion";

export class JSObject implements Assertion {
    /**
     * @param {string} obj
     * @param {string} proto either the name of the logical variable denoting the prototype of
     *      obj or the string Object.prototype
     */
    constructor(private obj: string, private proto: string) {}

    public toString() {
        return `JSObject(${this.obj}, ${this.proto})`;
    }
}
