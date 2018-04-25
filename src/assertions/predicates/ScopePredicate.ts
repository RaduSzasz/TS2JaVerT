import { Assertion } from "../Assertion";
import { Variable } from "../typescript/Variable";

export class ScopePredicate implements Assertion {
    constructor(private variable: Variable, private logicalVariable: Variable) { }

    public toString(): string {
        return `Scope(${this.variable.name}, ${this.logicalVariable.name})`;
    }
}
