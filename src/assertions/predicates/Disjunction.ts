import { Assertion } from "../Assertion";

export class Disjunction implements Assertion {
    constructor(public assertions: Assertion[]) { }

    public toString(): string {
        throw new Error("Should never convert a disjunction to string!!");
    }
}
