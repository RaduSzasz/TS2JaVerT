import {
    isAnyType, isClassType,
    isInterfaceType, isObjectLiteralType,
    isPrimitiveType,
    isStringLiteralType, isUnionType,
    Type,
} from "../typescript/Types";
import { Variable } from "../typescript/Variable";
import { CustomPredicate } from "./CustomPredicate";
import { Disjunction } from "./Disjunction";
import { Emp } from "./Emp";
import { HardcodedStringAssertion } from "./HardcodedStringAssertion";
import { SeparatingConjunctionList } from "./SeparatingConjunctionList";
import { TypesPredicate } from "./TypesPredicate";

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
    ObjectPrototype,
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

export function typeToAssertion(name: string, type: Type): Assertion {
    if (isPrimitiveType(type)) {
        return new TypesPredicate(name, type.typeFlag);
    } else if (isStringLiteralType(type)) {
        return new HardcodedStringAssertion(`${name} === "${type.str}"`);
    } else if (isAnyType(type)) {
        return new Emp();
    } else if (isInterfaceType(type)) {
        return new CustomPredicate(type.name, name);
    } else if (isObjectLiteralType(type)) {
        return type.objectLiteralType.toAssertion(name);
    } else if (isClassType(type)) {
        return type.cls.getAssertion(name);
    } else if (isUnionType(type)) {
        return new Disjunction(type.types.map((t) => new Variable(name, t).toAssertion()));
    }
    throw new Error(`Cannot convert type ${type.typeFlag} to assertion`);
}
