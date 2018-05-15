import { Assertion } from "../Assertion";
import { Variable } from "../typescript/Variable";

export class DataProp implements Assertion {
    constructor(
        private obj: string,
        private fieldName: string,
        private logicalVariable: Variable,
        private logicalFieldName: boolean = false
    ) { }

    public toString() {
        const fieldName = this.logicalFieldName ? this.fieldName : `"${this.fieldName}"`;
        return `DataProp(${this.obj}, ${fieldName}, ${this.logicalVariable.name})`;
    }
}
