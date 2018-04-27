import { Assertion } from "../Assertion";
import { Variable } from "../typescript/Variable";

export class DataProp implements Assertion {
    constructor(private obj: string, private fieldName: string, private logicalVariable: Variable) { }

    public toString() {
        return `DataProp(${this.obj}, ${this.fieldName}, ${this.logicalVariable.name})`;
    }
}
