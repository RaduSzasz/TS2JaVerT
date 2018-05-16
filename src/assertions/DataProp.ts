import { AssertionKind, AssertionObject } from "./Assertion";
import { Variable } from "../typescript/Variable";

export class DataProp extends AssertionObject {
    constructor(
        private obj: string,
        private fieldName: string,
        private logicalVariable: Variable,
        private logicalFieldName: boolean = false,
    ) {
        super(AssertionKind.DataProp);
    }

    public toString() {
        const fieldName = this.logicalFieldName ? this.fieldName : `"${this.fieldName}"`;
        return `DataProp(${this.obj}, ${fieldName}, ${this.logicalVariable.name})`;
    }
}
