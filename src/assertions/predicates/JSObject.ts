import { Assertion } from "../Assertion";
import { Variable } from "../typescript/Variable";

export class JSObject implements Assertion {
    constructor(private obj: string, private proto: Variable | "Object.prototype") {}

    public toString() {
        return `JSObject(${this.obj}, ${this.protoToString()})`;
    }

    private protoToString() {
        if (this.proto === "Object.prototype") {
            return this.proto;
        }
        return this.proto.name;
    }

}
