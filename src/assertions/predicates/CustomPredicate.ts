import { Assertion } from "../Assertion";

export class CustomPredicate implements Assertion {
    constructor(private predicateName: string, private varName: string) { }

    public toString() {
        return `${this.predicateName}(${this.varName})`;
    }
}
