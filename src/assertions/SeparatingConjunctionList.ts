import { flatMap } from "lodash";
import { Assertion, AssertionKind, AssertionObject, isSeparatingConjunction } from "./Assertion";
import { Emp } from "./Emp";

export class SeparatingConjunctionList extends AssertionObject {
    private conjuncts: Assertion[];

    constructor(conjuncts: Assertion[]) {
        super(AssertionKind.SeparatingConjunction);

        this.conjuncts = flatMap(
            conjuncts,
            (conj) => isSeparatingConjunction(conj) ? conj.conjuncts : [conj]);
    }

    public toString() {
        return this.conjuncts
                    .map((conjunct) => conjunct.toString())
                    .filter((strConjunct) => strConjunct)
                    .join(" * ") || (new Emp().toString());
    }
}
