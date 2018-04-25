import * as ts from "typescript";
import { Assertion } from "../Assertion";
import { DataProp } from "../predicates/DataProp";
import { FunctionObject } from "../predicates/FunctionObject";
import { JSObject } from "../predicates/JSObject";
import { SeparatingConjunctionList } from "../predicates/SeparatingConjunctionList";
import { TypeFlags } from "./Types";
import { Variable } from "./Variable";

enum InterfaceType {
    RegularObject,
    Function,
    Constructor,
}

export class Interface {
    private static readonly CALL_SIGNATURE_NAME = "__call";
    private static readonly CONSTRUCTOR_SIGNATURE_NAME = "__new";
    public readonly name: string;
    private interfaceType: InterfaceType;
    private regularFields: Variable[] = [];

    constructor(node: ts.InterfaceDeclaration, checker: ts.TypeChecker) {
        const interfaceSymbol = checker.getSymbolAtLocation(node.name);
        this.name = interfaceSymbol.name;
        this.interfaceType = InterfaceType.RegularObject;
        interfaceSymbol.members.forEach(((value: ts.Symbol, key: ts.__String) => {
            if (key === Interface.CALL_SIGNATURE_NAME) {
                this.interfaceType = InterfaceType.Function;
            } else if (key === Interface.CONSTRUCTOR_SIGNATURE_NAME) {
                this.interfaceType = InterfaceType.Constructor;
            } else {
                this.regularFields.push(Variable.fromTsSymbol(value, checker));
            }
        }));
    }

    public getName(): string {
        return this.name;
    }

    public toPredicate(): string {
        const o: Variable = new Variable("o", { typeFlag: TypeFlags.Any });
        return `
            ${this.name}(${o.name}) :
                ${this.toAssertion(o)}
`;
    }

    private toAssertion(o: Variable): Assertion {
        // The type of o is irrelevant; we will never use it
        return new SeparatingConjunctionList([
            this.getObjectAssertion(o),
            ...this.regularFields.map((field: Variable) => {
                const logicalVariable = Variable.logicalVariableFromVariable(field);
                return new SeparatingConjunctionList([
                    new DataProp(o, field, logicalVariable),
                    logicalVariable.toAssertion(),
                ]);
            }),
        ]);
    }

    private getObjectAssertion(o: Variable): Assertion {
        if (this.interfaceType === InterfaceType.Constructor || this.interfaceType === InterfaceType.Function) {
            return new FunctionObject(o);
        }
        const protoObject = Variable.protoLogicalVariable(this);
        return new JSObject(o, protoObject);
    }
}
