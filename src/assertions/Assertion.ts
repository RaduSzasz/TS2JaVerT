import {
    isAnyType, isClassType,
    isInterfaceType, isObjectLiteralType,
    isPrimitiveType,
    isStringLiteralType, isThisType, isUnionType,
    Type,
} from "../typescript/Types";
import { CustomPredicate } from "./CustomPredicate";
import { Disjunction } from "./Disjunction";
import { Emp } from "./Emp";
import { HardcodedStringAssertion } from "./HardcodedStringAssertion";
import { JSObject } from "./JSObject";
import { SeparatingConjunctionList } from "./SeparatingConjunctionList";
import { TypesPredicate } from "./TypesPredicate";

export enum AssertionKind {
    AllProtos,
    Custom,
    DataProp,
    Disjunction,
    Emp,
    EmptyFields,
    ForbiddenFields,
    FunctionPrototype,
    FunctionObject,
    GlobalObject,
    GlobalVar,
    HardcodedString,
    InSetAssertion,
    JSObject,
    None,
    ObjectPrototype,
    Pi,
    Scope,
    SeparatingConjunction,
    Types,
}

export interface Assertion {
    kind: AssertionKind;
    toString(): string;
    getThisAssertion(): Assertion | undefined;
}

export function isSeparatingConjunction(assertion: Assertion): assertion is SeparatingConjunctionList {
    return assertion.kind === AssertionKind.SeparatingConjunction;
}

export function isDisjunction(assertion: Assertion): assertion is Disjunction {
    return assertion.kind === AssertionKind.Disjunction;
}

export function isEmp(assertion: Assertion): assertion is Emp {
    return assertion.kind === AssertionKind.Emp;
}

export function isJSObject(assertion: Assertion): assertion is JSObject {
    return assertion.kind === AssertionKind.JSObject;
}

export function typeToAssertion(name: string, type: Type): Assertion {
    if (isPrimitiveType(type)) {
        return new TypesPredicate(name, type.typeFlag);
    } else if (isStringLiteralType(type)) {
        return new HardcodedStringAssertion(`(${name} == "${type.str}")`);
    } else if (isAnyType(type)) {
        return new Emp();
    } else if (isInterfaceType(type)) {
        return new CustomPredicate(type.name, name);
    } else if (isObjectLiteralType(type)) {
        return type.objectLiteralType.toAssertion(name);
    } else if (isClassType(type)) {
        return type.cls.getAssertion(name);
    } else if (isUnionType(type)) {
        return new Disjunction(type.types.map((t) => typeToAssertion(name, t)));
    } else if (isThisType(type)) {
        return new HardcodedStringAssertion(`(${name} == this)`);
    }
    throw new Error(`Cannot convert type ${type.typeFlag} to assertion`);
}
