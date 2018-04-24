import { Predicate } from "./predicates/Predicate";

export class Assertion {
    public conjuncts: Predicate[];

    public toString() {
        this.conjuncts
            .map((conjunct) => conjunct.toString())
            .join(" * ");
    }
}
