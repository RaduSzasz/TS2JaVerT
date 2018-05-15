import { NonePredicate } from "./NonePredicate";
import { SeparatingConjunctionList } from "./SeparatingConjunctionList";

export class ForbiddenPredicate {
    public static toPredicate(): string {
        const o = "o";
        const def = new SeparatingConjunctionList(
            ForbiddenPredicate.FORBIDDEN_FIELD_NAMES.map((forbiddenField) =>
                new NonePredicate(o, forbiddenField)));
        return `
        ${ForbiddenPredicate.PREDICATE_NAME}(${o}) =
            ${def}
`;
    }

    private static readonly PREDICATE_NAME = "AbsentFields";
    private static readonly FORBIDDEN_FIELD_NAMES = [
        "hasOwnProperty",
    ];

    constructor(private o: string) { }

    public toString(): string {
        return `AbsentFields(${this.o})`;
    }
}
