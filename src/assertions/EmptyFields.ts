import { AssertionKind, AssertionObject } from "./Assertion";

export const EMPTY_SET: string[] = [];

export class EmptyFields extends AssertionObject {
    constructor(private varName: string, private fieldSet: string[]) {
        super(AssertionKind.EmptyFields);
    }

    public toString() {
        return `empty_fields(${this.varName}, -{ ${this.fieldSet.join(", ")} }-)`;
    }
}
