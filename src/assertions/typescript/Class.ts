import { chain, find, isEqual, map } from "lodash";
import * as ts from "typescript";
import { Assertion } from "../Assertion";
import { CustomPredicate } from "../predicates/CustomPredicate";
import { DataProp } from "../predicates/DataProp";
import { JSObject } from "../predicates/JSObject";
import { NonePredicate } from "../predicates/NonePredicate";
import { SeparatingConjunctionList } from "../predicates/SeparatingConjunctionList";
import { Function } from "./Function";
import { Program } from "./Program";
import { Variable } from "./Variable";

export class Class {
    public static resolveParents(classMap: { [className: string]: Class }) {
        map(classMap, (classVar) => {
            if (classVar.inheritingClassName) {
                classVar.inheritingFrom = classMap[classVar.inheritingClassName];
            }
        });
    }

    public static resolveAncestorsAndDescendents(classMap: { [className: string]: Class }) {
        while (map(classMap, (classVar) => classVar.updateAncestorsAndDescendants()).some((val) => val)) {
            // Intentionally blank
        }

        map(classMap, (classVar) => {
            classVar.fPlus = classVar.determineFPlus();
            classVar.nPlus = classVar.determineNPlus();
        });
    }

    public static getAllAncestors(classes: Class[]): Class[] {
        return chain(classes)
            .flatMap((cls) => cls.ancestors)
            .uniq()
            .value();
    }

    public readonly name: string;
    private inheritingClassName: string;

    private fPlus: string[];
    private nPlus: string[];
    private inheritingFrom: Class;
    private methods: Function[] = [];
    private properties: Variable[] = [];
    private ancestors: Class[] = [this];
    private descendants: Class[] = [this];

    constructor(node: ts.ClassDeclaration, program: Program) {
        if (!node.name) {
            throw new Error("Only named class declarations are supported");
        }

        const checker = program.getTypeChecker();
        const classSymbol = checker.getSymbolAtLocation(node.name);
        this.name = classSymbol.name;

        if (node.heritageClauses) {
            // We only need to care about extends clauses because the implements has already been
            // taken care of by tsc
            const extendsClause = find(node.heritageClauses,
                (heritageClause) => heritageClause.token === ts.SyntaxKind.ExtendsKeyword);

            if (extendsClause) {
                if (extendsClause.types.length !== 1) {
                    throw new Error("A class should extend either 0 or 1 other classes");
                }

                const parentType = checker.getSymbolAtLocation(extendsClause.types[0].expression);
                this.inheritingClassName = parentType.name;
            }
        }

        node.members.map((member) => {
            if (ts.isConstructorDeclaration(member)) {
                // Constructor does not matter yet: We need F+ and N+ before we can spit out the
                // constructor
            } else if (ts.isMethodDeclaration(member)) {
                const symbol = checker.getSymbolAtLocation(member.name);
                this.methods.push(
                    Function.fromTSNode(member, program, symbol.getName()),
                );
            } else if (ts.isPropertyDeclaration(member)) {
                this.properties.push(Variable.fromPropertyDeclaration(member, program));
            } else {
                throw new Error("Unexpected member in class");
            }
        });
    }

    public getProtoPredicate(): string {
        const currProto = "proto";
        const parentProto = this.inheritingFrom ? "parentProto" : "Object.prototype";
        const predDef = `${this.getProtoPredicateName()}(${this.inheritingFrom ?
            [currProto, parentProto].join(", ") :
            currProto
        })`;
        const predicate = new SeparatingConjunctionList([
            new JSObject(currProto, parentProto),
            ...this.fPlus.map((field) => new NonePredicate(currProto, field)),
            ...this.methods.map((method) => new SeparatingConjunctionList([
                new DataProp(currProto, method.getName(), Variable.logicalVariableFromVariable(method)),
                Function.logicalVariableFromFunction(method).toAssertion(),
            ])),
        ]);
        return `
        ${predDef}:
            ${predicate.toString()}
`;
    }

    public getInstancePredicate(): string {
        const o = "o";
        const proto = "proto";
        return `
        ${this.getInstancePredicateName()}(${o}, ${proto}):
            ${new SeparatingConjunctionList([
            new JSObject(o, proto),
            ...this.nPlus.map((namedMethod) => new NonePredicate(o, namedMethod)),
            ...this.properties.map((prop) => new SeparatingConjunctionList([
                new DataProp(o, prop.name, Variable.logicalVariableFromVariable(prop)),
                Variable.logicalVariableFromVariable(prop).toAssertion(),
            ])),
        ]).toString()}
`;
    }

    public getInstancePredicateName(): string {
        return this.name;
    }

    public getProtoPredicateName(): string {
        return `${this.name}Proto`;
    }

    public getProtoLogicalVariableName(): string {
        return `#${this.name}proto`;
    }

    public getAssertion(instanceName: string): Assertion {
        const instancePredName = this.getInstancePredicateName();
        const protoLogicalVariable = this.getProtoLogicalVariableName();
        return new CustomPredicate(instancePredName, `${instanceName}, ${protoLogicalVariable}`);
    }

    public getProtoAssertion(): Assertion {
        const protoPredName = this.getProtoPredicateName();
        const protoLogicalVariableName = this.getProtoLogicalVariableName();
        if (this.inheritingFrom) {
            return new CustomPredicate(
                protoPredName,
                `${protoLogicalVariableName}, ${this.inheritingFrom.getProtoLogicalVariableName()}`);
        }
        return new CustomPredicate(
            protoPredName,
            protoLogicalVariableName,
        );
    }

    public updateAncestorsAndDescendants(): boolean {
        if (this.inheritingFrom) {
            let didUpdate: boolean = false;
            const inSubtree = [this, ...this.descendants];
            const above = [this, ...this.inheritingFrom.ancestors];
            if (!isEqual(this.inheritingFrom.descendants, inSubtree)) {
                this.inheritingFrom.descendants = inSubtree;
                didUpdate = true;
            }
            if (!isEqual(this.ancestors, above)) {
                this.ancestors = above;
                didUpdate = true;
            }
            return didUpdate;
        }
        return false;
    }

    public determineNPlus(): string[] {
        return chain([this, ...this.ancestors])
            .flatMap((cls) => cls.methods)
            .map((method) => method.name)
            .uniq()
            .value();
    }

    public determineFPlus(): string[] {
        return chain([this, ...this.descendants])
            .flatMap((cls) => cls.properties)
            .map((property) => property.name)
            .uniq()
            .value();
    }

    public getName(): string {
        return this.name;
    }
}
