import {JavertLogicalVariable} from "../variables/JavertLogicalVariable";
import {JavertObject} from "../variables/JavertObject";
import {Predicate} from "./Predicate";

class JSObject implements Predicate {
    constructor(private obj: JavertObject, private proto: JavertObject | JavertLogicalVariable | string) {}

    public toString() {
        return `JSObject(${this.obj.toString()}, ${this.protoToString()}`;
    }

    private protoToString() {
        if (typeof this.proto === "string") {
            return this.proto;
        }
        return this.proto.toString();
    }

}
