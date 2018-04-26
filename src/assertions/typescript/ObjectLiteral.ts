import * as ts from "typescript";
import { Assertion } from "../Assertion";
import { DataProp } from "../predicates/DataProp";
import { FunctionObject } from "../predicates/FunctionObject";
import { JSObject } from "../predicates/JSObject";
import { SeparatingConjunctionList } from "../predicates/SeparatingConjunctionList";
import { Variable } from "./Variable";

enum ObjectType {
    RegularObject,
    Function,
    Constructor,
}

export class ObjectLiteral {
    private static readonly CALL_SIGNATURE_NAME = "__call";
    private static readonly CONSTRUCTOR_SIGNATURE_NAME = "__new";

    private objectType: ObjectType;
    private regularFields: Variable[] = [];

    constructor(members: ts.SymbolTable, checker: ts.TypeChecker) {
        this.objectType = ObjectType.RegularObject;
        members.forEach(((value: ts.Symbol, key: ts.__String) => {
            if (key === ObjectLiteral.CALL_SIGNATURE_NAME) {
                this.objectType = ObjectType.Function;
            } else if (key === ObjectLiteral.CONSTRUCTOR_SIGNATURE_NAME) {
                this.objectType = ObjectType.Constructor;
            } else {
                this.regularFields.push(Variable.fromTsSymbol(value, checker));
            }
        }));
    }

    public toAssertion(o: string): Assertion {
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

    private getObjectAssertion(o: string): Assertion {
        if (this.objectType === ObjectType.Constructor || this.objectType === ObjectType.Function) {
            return new FunctionObject(o);
        }
        const protoObject = Variable.protoLogicalVariable();
        return new JSObject(o, protoObject);
    }
}
