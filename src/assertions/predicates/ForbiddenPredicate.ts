import { AssertionKind } from "../Assertion";
import { AssertionObject } from "../AssertionObject";
import { NoneAssertion } from "../NoneAssertion";
import { SeparatingConjunctionList } from "../SeparatingConjunctionList";

export class ForbiddenPredicate extends AssertionObject {
    public static toPredicate(): string {
        const o = "o";
        const def = new SeparatingConjunctionList(
            ForbiddenPredicate.FORBIDDEN_FIELD_NAMES.map((forbiddenField) =>
                new NoneAssertion(o, forbiddenField)));
        return `
        @pred ${ForbiddenPredicate.PREDICATE_NAME}(${o}):
            ${def};`;
    }

    private static readonly PREDICATE_NAME = "AbsentFields";
    private static readonly FORBIDDEN_FIELD_NAMES = [
        "hasOwnProperty",
    ];

    constructor(private o: string) {
        super(AssertionKind.ForbiddenFields);
    }

    public toString(): string {
        return `AbsentFields(${this.o})`;
    }
}
