import * as ts from "typescript";
import { Assertion, typeToAssertion } from "../assertions/Assertion";
import { Emp } from "../assertions/Emp";
import { FunctionObject } from "../assertions/FunctionObject";
import { HardcodedStringAssertion } from "../assertions/HardcodedStringAssertion";
import { ScopeAssertion } from "../assertions/ScopeAssertion";
import { SeparatingConjunctionList } from "../assertions/SeparatingConjunctionList";
import { Class } from "./Class";
import { Function } from "./functions/Function";
import { Program } from "./Program";
import { createOptionalType, isAnyType, Type, TypeFlags, typeFromTSType } from "./Types";

export interface AssignedVariable {
    assignedVar: Variable;
    parameter: boolean;
}

export class Variable {
    public static fromDeclaration(
        declaration: ts.ParameterDeclaration | ts.PropertyDeclaration | ts.VariableDeclaration | ts.PropertySignature,
        program: Program,
    ): Variable {
        const checker = program.getTypeChecker();
        const nameSymbol = checker.getSymbolAtLocation(declaration.name);
        const optional = !ts.isVariableDeclaration(declaration) && declaration.questionToken;

        if (!nameSymbol) {
            throw new Error("Cannot create Variable! Cannot retrieve variable name symbol");
        } else if (!declaration.type) {
            throw new Error("Cannot create Variable! Property declaration has no associated type node");
        }

        const varType = typeFromTSType(declaration.type, program);
        return new Variable(nameSymbol.name, optional ? createOptionalType(varType) : varType);
    }

    public static newReturnVariable(type: Type): Variable {
        return new Variable("ret", type);
    }

    public static logicalVariableFromVariable(variable: Variable) {
        return new Variable(`#${variable.name}`, variable.type);
    }

    public static protoLogicalVariable(t?: Class) {
        const name = (t && `#${t.name}proto`) || "_";
        // Not sure if Void is the best way to go here.
        return new Variable(name, { typeFlag: TypeFlags.Void });
    }

    public static nameMatcher(name: string) {
        return (variable: Variable) => variable.name === name;
    }

    constructor(public name: string, protected readonly type: Type) { }

    public isFunction(): this is Function {
        return false;
    }

    public isLogicalVariable(): boolean {
        return this.name !== "" && this.name.charAt(0) === "#";
    }

    public toAssertion(): Assertion {
        if (this.isLogicalVariable()) {
            return typeToAssertion(this.name, this.type);
        }

        const logicalVariable = Variable.logicalVariableFromVariable(this);
        return isAnyType(this.type)
            ? new Emp()
            : new SeparatingConjunctionList([
                    new HardcodedStringAssertion(`(${this.name} == ${logicalVariable.name})`),
                    typeToAssertion(logicalVariable.name, logicalVariable.type),
            ]);
    }

    public toAssertionExtractingScope(): Assertion {
        if (this.isFunction()) {
            return new FunctionObject(this.name, this.id);
        }
        const logicalVariable = Variable.logicalVariableFromVariable(this);
        return new SeparatingConjunctionList([
            new ScopeAssertion(this.name, logicalVariable.name),
            logicalVariable.toAssertion(),
        ]);
    }
}
