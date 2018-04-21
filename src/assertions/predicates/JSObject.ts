import {Predicate} from "./Predicate";
import {JavertObject} from "../variables/JavertObject";
import {JavertLogicalVariable} from "../variables/JavertLogicalVariable";

class JSObject implements Predicate {
    constructor(private obj: JavertObject, private proto: JavertObject | JavertLogicalVariable | string) {}

    private protoToString() {
        if (typeof this.proto === "string") {
            return this.proto;
        }
        return this.proto.toString();
    }

    toString() {
        return `JSObject(${this.obj.toString()}, ${this.protoToString()}`;
    }
}