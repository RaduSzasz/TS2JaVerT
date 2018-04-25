import { Assertion } from "../Assertion";
import { Variable } from "../typescript/Variable";

export class DataProp implements Assertion {
    constructor(private obj: Variable, private field: Variable, private logicalVariable: Variable) { }

    public toString() {
        return `DataProp(${this.obj.name}, ${this.field.name}, ${this.logicalVariable.name})`;
    }
}
