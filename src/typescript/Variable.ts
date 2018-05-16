import * as ts from "typescript";
import * as uuid from "uuid";
import { Assertion } from "../assertions/Assertion";
import { CustomPredicate } from "../assertions/CustomPredicate";
import { Disjunction } from "../assertions/Disjunction";
import { Emp } from "../assertions/Emp";
import { HardcodedStringAssertion } from "../assertions/HardcodedStringAssertion";
import { ScopeAssertion } from "../assertions/ScopeAssertion";
import { SeparatingConjunctionList } from "../assertions/SeparatingConjunctionList";
import { TypesPredicate } from "../assertions/TypesPredicate";
import { Class } from "./Class";
import { Function } from "./functions/Function";
import { Program } from "./Program";
import {
    isAnyType, isClassType,
    isInterfaceType, isObjectLiteralType,
    isPrimitiveType, isStringLiteralType, isUnionType,
    Type,
    TypeFlags,
    typeFromTSType,
} from "./Types";

export class Variable {
    public static fromDeclaration(
        declaration: ts.ParameterDeclaration | ts.PropertyDeclaration | ts.VariableDeclaration | ts.PropertySignature,
        program: Program,
    ): Variable {
        const checker = program.getTypeChecker();
        const nameSymbol = checker.getSymbolAtLocation(declaration.name);

        if (!nameSymbol) {
            throw new Error("Cannot create Variable! Cannot retrieve variable name symbol");
        } else if (!declaration.type) {
            throw new Error("Cannot create Variable! Property declaration has no associated type node");
        }
        return new Variable(nameSymbol.name, typeFromTSType(declaration.type, program));
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

    constructor(public name: string, protected readonly type: Type) { }

    public isFunction(): this is Function {
        return false;
    }

    public getType(): Type {
        return this.type;
    }

    public toAssertion(): Assertion {
        const { name, type } = this;
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
            return new Disjunction(type.types.map((t) => new Variable(this.name, t).toAssertion()));
        }

        throw new Error(`Cannot convert type ${this.type.typeFlag} to assertion`);
    }

    public toAssertionExtractingScope(): Assertion {
        const logicalVariable = Variable.logicalVariableFromVariable(this);
        return new SeparatingConjunctionList([
            new ScopeAssertion(this.name, logicalVariable.name),
            logicalVariable.toAssertion(),
        ]);
    }
}
