import { flatMap } from "lodash";
import { Assertion, AssertionKind, AssertionObject, isDisjunction } from "./Assertion";

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
}
