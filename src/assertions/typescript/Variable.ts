import * as ts from "typescript";
import uuid = require("uuid");
import { Assertion } from "../Assertion";
import { CustomPredicate } from "../predicates/CustomPredicate";
import { Emp } from "../predicates/Emp";
import { ScopePredicate } from "../predicates/ScopePredicate";
import { SeparatingConjunctionList } from "../predicates/SeparatingConjunctionList";
import { True } from "../predicates/True";
import { TypesPredicate } from "../predicates/TypesPredicate";
import { Class } from "./Class";
import { Function } from "./Function";
import { Program } from "./Program";
import {
    isAnyType,
    isInterfaceType, isObjectLiteralType,
    isPrimitiveType,
    Type,
    TypeFlags,
    typeFromTSType,
} from "./Types";

export class Variable {
    public static fromTsSymbol(symbol: ts.Symbol, program: Program): Variable {
        const name = symbol.getName();
        const checker = program.getTypeChecker();
        const type = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);

        return new Variable(name, typeFromTSType(type, program));
    }

    public static fromPropertyDeclaration(
        propertyDeclaration: ts.PropertyDeclaration,
        program: Program,
    ): Variable {
        const checker = program.getTypeChecker();
        const propertyType: ts.Type = checker.getTypeAtLocation(propertyDeclaration);
        const nameSymbol = checker.getSymbolAtLocation(propertyDeclaration.name);

        return new Variable(nameSymbol.name, typeFromTSType(propertyType, program));
    }

    public static newReturnVariable(type: Type): Variable {
        return new Variable("ret", type);
    }

    public static logicalVariableFromVariable(variable: Variable) {
        return new Variable(`#${variable.name}`, variable.type);
    }

    public static protoLogicalVariable(t?: Class) {
        const name = (t && t.name) || uuid.v4();
        // Not sure if Void is the best way to go here.
        return new Variable(`#${name}proto`, { typeFlag: TypeFlags.Void });
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
        } else if (isObjectLiteralType(type)) {
            return type.objectLiteralType.toAssertion(name);
        }

        throw new Error(`Can not convert type ${this.type.typeFlag} to assertion`);
    }

    public toAssertionExtractingScope(): Assertion {
        const logicalVariable = Variable.logicalVariableFromVariable(this);
        return new SeparatingConjunctionList([
            new ScopePredicate(this, logicalVariable),
            logicalVariable.toAssertion(),
        ]);
    }
}
