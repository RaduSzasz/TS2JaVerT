import { Assertion } from "../Assertion";

export class SeparatingConjunctionList implements Assertion {
    constructor(private conjuncts: Assertion[]) { }

    public toString() {
        return this.conjuncts
                    .map((conjunct) => conjunct.toString())
                    .join(" * ");
    }
}
