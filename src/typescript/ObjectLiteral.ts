import { compact } from "lodash";
import * as ts from "typescript";
import { Assertion } from "../assertions/Assertion";
import { FunctionObject } from "../assertions/FunctionObject";
import { JSObject } from "../assertions/JSObject";
import { PiPred } from "../assertions/PiPred";
import { ForbiddenPredicate } from "../assertions/predicates/ForbiddenPredicate";
import { IndexSignaturePredicate } from "../assertions/predicates/IndexSignaturePredicate";
import { SeparatingConjunctionList } from "../assertions/SeparatingConjunctionList";
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
                        return typeFromTSType(declaration.type, program);
                    }
                    throw new Error(`Cannot find indexing type. Received ${declaration.kind} TS node`);
                });
                this.indexSignature = program.addIndexingSignature(indexingType);
            } else if (value.valueDeclaration && (ts.isPropertySignature(value.valueDeclaration)
                || ts.isPropertyDeclaration(value.valueDeclaration))) {
                this.regularFields.push(Variable.fromDeclaration(value.valueDeclaration, program));
            } else {
                throw new Error("Unexpected member type in object literal type");
            }
        }));
    }

    public toAssertion(o: string): SeparatingConjunctionList {
        // The type of o is irrelevant; we will never use it
        return new SeparatingConjunctionList(compact([
            this.getObjectAssertion(o),
            this.indexSignature && new SeparatingConjunctionList([
                this.indexSignature.toAssertion(o, `${o}_fields`),
                new ForbiddenPredicate(o),
            ]),
            ...this.regularFields.map((field: Variable) => {
                const logicalVariable = Variable.logicalVariableFromVariable(field);
                return new SeparatingConjunctionList([
                    new PiPred(o, field.name, logicalVariable),
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
