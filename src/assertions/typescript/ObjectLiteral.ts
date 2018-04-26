import * as ts from "typescript";
import { Assertion } from "../Assertion";
import { DataProp } from "../predicates/DataProp";
import { FunctionObject } from "../predicates/FunctionObject";
import { JSObject } from "../predicates/JSObject";
import { SeparatingConjunctionList } from "../predicates/SeparatingConjunctionList";
import { Type, typeFromTSType } from "./Types";
import { Variable } from "./Variable";

enum ObjectType {
    RegularObject,
    Function,
    Constructor,
}

export class ObjectLiteral {
    private static readonly CALL_SIGNATURE_NAME = "__call";
    private static readonly CONSTRUCTOR_SIGNATURE_NAME = "__new";
    private static readonly INDEX_SIGNATURE_NAME = "__index";

    private objectType: ObjectType;
    private indexingType: Type;
    private regularFields: Variable[] = [];

    constructor(members: ts.SymbolTable, program: ts.Program) {
        const checker = program.getTypeChecker();
        this.objectType = ObjectType.RegularObject;
        members.forEach(((value: ts.Symbol, key: ts.__String) => {
            if (key === ObjectLiteral.CALL_SIGNATURE_NAME) {
                this.objectType = ObjectType.Function;
            } else if (key === ObjectLiteral.CONSTRUCTOR_SIGNATURE_NAME) {
                this.objectType = ObjectType.Constructor;
            } else if (key === ObjectLiteral.INDEX_SIGNATURE_NAME) {
                if (value.declarations.length !== 1) {
                    throw new Error("More than one indexing signature declaration.");
                }
                [this.indexingType] = value.declarations.map((declaration: ts.IndexSignatureDeclaration) =>
                        typeFromTSType(checker.getTypeFromTypeNode(declaration.type), program));
            } else {
                this.regularFields.push(Variable.fromTsSymbol(value, program));
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
