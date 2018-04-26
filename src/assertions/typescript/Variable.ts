import * as ts from "typescript";
import { Assertion } from "../Assertion";
import { CustomPredicate } from "../predicates/CustomPredicate";
import { Emp } from "../predicates/Emp";
import { ScopePredicate } from "../predicates/ScopePredicate";
import { SeparatingConjunctionList } from "../predicates/SeparatingConjunctionList";
import { True } from "../predicates/True";
import { TypesPredicate } from "../predicates/TypesPredicate";
import { Class } from "./Class";
import { Function } from "./Function";
import { Interface } from "./Interface";
import {
    isAnyType,
    isInterfaceType,
    isPrimitiveType,
    Type,
    TypeFlags,
    typeFromTSType
} from "./Types";

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

    public static logicalVariableFromVariable(variable: Variable) {
        return new Variable(`#${variable.name}`, variable.type);
    }

    public static protoLogicalVariable(t: Interface | Class) {
        // Not sure if Void is the best way to go here.
        return new Variable(`#${t.name}proto`, { typeFlag: TypeFlags.Void });
    }

    public static nameMatcher(name: string) {
        return (variable: Variable) => variable.name === name;
    }

    constructor(public name: string, protected type: Type) { }

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
        } else if (isInterfaceType(type)) {
            return new CustomPredicate(type.name, name);
        }
    }

    public toAssertionExtractingScope(): Assertion {
        const logicalVariable = Variable.logicalVariableFromVariable(this);
        return new SeparatingConjunctionList([
            new ScopePredicate(this, logicalVariable),
            logicalVariable.toAssertion(),
        ]);
    }
}
