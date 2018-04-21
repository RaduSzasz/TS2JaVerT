import { Predicate } from "./predicates/Predicate";

class Assertion {
    conjuncts: Predicate[];

    public toString() {
        this.conjuncts
            .map(conjunct => conjunct.toString())
            .join(' * ');
    }
}
