import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export const EMPTY_SET: string[] = [];

export class EmptyFields extends AssertionObject {
    constructor(private varName: string, private fieldSet: string[]) {
        super(AssertionKind.EmptyFields);
    }

    public toString() {
        return `empty_fields(${this.varName} : -{ ${this.fieldSet.map((f) => `"${f}"`).join(", ")} }-)`;
    }
}
