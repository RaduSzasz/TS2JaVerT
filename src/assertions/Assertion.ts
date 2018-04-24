import { Predicate } from "./predicates/Predicate";

export class Assertion {
    conjuncts: Predicate[];

    public toString() {
        this.conjuncts
            .map(conjunct => conjunct.toString())
            .join(' * ');
    }
}
