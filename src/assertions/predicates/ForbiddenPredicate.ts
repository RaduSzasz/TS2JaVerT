import { CustomPredicate } from "./CustomPredicate";
import { Emp } from "./Emp";
import { HardcodedStringAssertion } from "./HardcodedStringAssertion";
import { NonePredicate } from "./NonePredicate";
import { SeparatingConjunctionList } from "./SeparatingConjunctionList";

export class ForbiddenPredicate {
    public static toPredicate(): string {
        const forbidden = "forbidden";
        const field = "#f";
        const otherFields = "#forbidden'";
        const o = "o";
        const def1 = new SeparatingConjunctionList([
            new HardcodedStringAssertion(`${forbidden} == []`),
            new Emp(),
        ]);
        const def2 = new SeparatingConjunctionList([
            new HardcodedStringAssertion(`${forbidden} == ${field} :: ${otherFields}`),
            new NonePredicate(o, field),
            new CustomPredicate(this.PREDICATE_NAME, `${o}, ${otherFields}`),
        ]);
        return `
        ${ForbiddenPredicate.PREDICATE_NAME}(${o}, ${forbidden}) =
            [def1] ${def1.toString()}
            [def2] ${def2.toString()}
`;
    }

    private static readonly PREDICATE_NAME = "AbsentFields";

    constructor(private o: string, private forbidden: string) { }

    public toString(): string {
        return `AbsentFields(${this.o}, ${this.forbidden})`;
    }
}
