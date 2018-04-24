import { Assertion } from "../Assertion";
import { Type } from "../typescript/Types";

export class HasType implements Assertion {
    constructor(private varName: string, private varType: Type) { }

    public toString() {
        return `HasType(`;
    }
}