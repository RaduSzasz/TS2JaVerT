import { Assertion } from "../Assertion";

export class ScopePredicate implements Assertion {
    constructor(private variable: string, private logicalVariable: string) { }

    public toString(): string {
        return `Scope(${this.variable}, ${this.logicalVariable})`;
    }
}
