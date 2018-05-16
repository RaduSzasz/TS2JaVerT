import { Disjunction } from "./Disjunction";
import { SeparatingConjunctionList } from "./SeparatingConjunctionList";

export enum AssertionKind {
    Custom,
    DataProp,
    Disjunction,
    Emp,
    EmptyFields,
    ForbiddenFields,
    FunctionObject,
    HardcodedString,
    JSObject,
    None,
    Scope,
    SeparatingConjunction,
    Types,
}

export interface Assertion {
    kind: AssertionKind;
    toString(): string;
}

export function isSeparatingConjunction(assertion: Assertion): assertion is SeparatingConjunctionList {
    return assertion.kind === AssertionKind.SeparatingConjunction;
}

export function isDisjunction(assertion: Assertion): assertion is Disjunction {
    return assertion.kind === AssertionKind.Disjunction;
}
