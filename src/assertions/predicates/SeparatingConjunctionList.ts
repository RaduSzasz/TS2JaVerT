import { Assertion } from "../Assertion";
import { Emp } from "./Emp";

export class SeparatingConjunctionList implements Assertion {
    constructor(private conjuncts: Assertion[]) { }

    public toString() {
        return this.conjuncts
                    .map((conjunct) => conjunct.toString())
                    .filter((strConjunct) => strConjunct)
                    .join(" * ") || (new Emp().toString());
    }
}
