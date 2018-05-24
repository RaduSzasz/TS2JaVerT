import { flatMap } from "lodash";
import { Assertion, AssertionKind, isDisjunction } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class Disjunction extends AssertionObject {
    public disjuncts: Assertion[];

    constructor(disjuncts: Assertion[]) {
        super(AssertionKind.Disjunction);

        this.disjuncts = flatMap(
            disjuncts,
            (conj) => isDisjunction(conj) ? conj.disjuncts : [conj]);
    }

    public toString(): string {
        throw new Error("Should never convert a disjunction to string!!");
    }

    public getThisAssertion(): Assertion | undefined {
        throw new Error("Should never try get the type of this in a disjunction");
    }
}
