import { compact } from "lodash";
import * as ts from "typescript";
import { Assertion } from "../Assertion";
import { DataProp } from "../predicates/DataProp";
import { FunctionObject } from "../predicates/FunctionObject";
import { IndexSignaturePredicate } from "../predicates/IndexSignaturePredicate";
import { JSObject } from "../predicates/JSObject";
import { SeparatingConjunctionList } from "../predicates/SeparatingConjunctionList";
import { Program } from "./Program";
import { typeFromTSType } from "./Types";
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
    private indexSignature: IndexSignaturePredicate | undefined;
    private regularFields: Variable[] = [];

    constructor(members: ts.SymbolTable, program: Program) {
        const checker = program.getTypeChecker();
        this.objectType = ObjectType.RegularObject;
        members.forEach(((value: ts.Symbol, key: ts.__String) => {
            if (key === ObjectLiteral.CALL_SIGNATURE_NAME) {
                this.objectType = ObjectType.Function;
            } else if (key === ObjectLiteral.CONSTRUCTOR_SIGNATURE_NAME) {
                this.objectType = ObjectType.Constructor;
            } else if (key === ObjectLiteral.INDEX_SIGNATURE_NAME) {
                if (!value.declarations || value.declarations.length !== 1) {
                    throw new Error("Must have one or no index signature declaration.");
                }
                const [indexingType] = value.declarations.map((declaration) => {
                    if (ts.isIndexSignatureDeclaration(declaration) && declaration.type) {
                        return typeFromTSType(checker.getTypeFromTypeNode(declaration.type), program);
                    }
                    throw new Error(`Cannot find indexing type. Received ${declaration.kind} TS node`);
                });
                this.indexSignature = program.addIndexingSignature(indexingType);
            } else {
                this.regularFields.push(Variable.fromTsSymbol(value, program));
            }
        }));
    }

    public toAssertion(o: string): Assertion {
        // The type of o is irrelevant; we will never use it
        return new SeparatingConjunctionList(compact([
            this.getObjectAssertion(o),
            this.indexSignature && this.indexSignature.toAssertion(o, "hasOwnProperty"),
            ...this.regularFields.map((field: Variable) => {
                const logicalVariable = Variable.logicalVariableFromVariable(field);
                return new SeparatingConjunctionList([
                    new DataProp(o, field.name, logicalVariable),
                    logicalVariable.toAssertion(),
                ]);
            }),
        ]));
    }

    private getObjectAssertion(o: string): Assertion {
        if (this.objectType === ObjectType.Constructor || this.objectType === ObjectType.Function) {
            return new FunctionObject(o);
        }
        const protoObject = Variable.protoLogicalVariable();
        return new JSObject(o, protoObject.name);
    }
}
