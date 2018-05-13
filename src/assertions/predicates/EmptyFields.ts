import { Assertion } from "../Assertion";

export const EMPTY_SET: string[] = [];

export class EmptyFields implements Assertion {
    constructor(private varName: string, private fieldSet: string[]) {}

    public toString() {
        return `empty_fields(${this.varName}, -{ ${this.fieldSet.join(", ")} }-)`;
    }
}
