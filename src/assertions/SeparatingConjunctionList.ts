import { find, flatMap } from "lodash";
import {
    Assertion,
    AssertionKind,
    isDisjunction, isEmp,
    isSeparatingConjunction,
} from "./Assertion";
import { AssertionObject } from "./AssertionObject";
import { Disjunction } from "./Disjunction";
import { Emp } from "./Emp";

export class SeparatingConjunctionList extends AssertionObject {
    private conjuncts: Assertion[];

    constructor(conjuncts: Assertion[]) {
        super(AssertionKind.SeparatingConjunction);

        this.conjuncts = flatMap(
            conjuncts.filter((conj) => !isEmp(conj)),
            (conj) => isSeparatingConjunction(conj) ? conj.conjuncts : [conj]);
    }

    public toString() {
        return this.conjuncts
                    .map((conjunct) => conjunct.toString())
                    .filter((strConjunct) => strConjunct)
                    .join(" * ") || (new Emp().toString());
    }

    public toDisjunctiveNormalForm(): Disjunction {
        return new Disjunction(
            this.conjuncts
                .reduce((prevDisjuncts: Assertion[], conj: Assertion) => {
                    if (isDisjunction(conj)) {
                        return flatMap(conj.disjuncts, (disj) =>
                            prevDisjuncts.map((dnf) =>
                                new SeparatingConjunctionList([dnf, disj])),
                        );
                    }
                    return prevDisjuncts
                        .map((dnf) => new SeparatingConjunctionList([dnf, conj]));
            }, [new SeparatingConjunctionList([])]),
        );
    }

    public getThisAssertion(): Assertion | undefined {
        return find(this.conjuncts.map((conj) => conj.getThisAssertion()));
    }
}
