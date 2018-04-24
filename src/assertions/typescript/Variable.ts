import * as ts from "typescript";
import { Assertion } from "../Assertion";
import { Emp } from "../predicates/Emp";
import { True } from "../predicates/True";
import { TypesPredicate } from "../predicates/TypesPredicate";
import { Function } from "./Function";
import { isAnyType, isPrimitiveType, Type, TypeFlags, typeFromTSType } from "./Types";

export class Variable {
    public static fromTsSymbol(symbol: ts.Symbol, checker: ts.TypeChecker): Variable {
        const name = symbol.getName();
        const type = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);

        return new Variable(name, typeFromTSType(type));
    }

    public static fromPropertyDeclaration(
        propertyDeclaration: ts.PropertyDeclaration,
        checker: ts.TypeChecker,
    ): Variable {
        const propertyType: ts.Type = checker.getTypeAtLocation(propertyDeclaration);
        const nameSymbol = checker.getSymbolAtLocation(propertyDeclaration.name);

        return new Variable(nameSymbol.name, typeFromTSType(propertyType));
    }

    public static newReturnVariable(type: Type): Variable {
        return new Variable("ret", type);
    }

    public static nameMatcher(name: string) {
        return (variable: Variable) => variable.name === name;
    }

    constructor(protected name: string, protected type: Type) { }

    public isFunction(): this is Function {
        return false;
    }

    public toAssertion(): Assertion {
        const { name, type } = this;
        if (isPrimitiveType(type)) {
            if (type.typeFlag === TypeFlags.Void) {
                return new Emp();
            }
            return new TypesPredicate(name, type.typeFlag);
        } else if (isAnyType(type)) {
            return new True();
        }
    }
}
