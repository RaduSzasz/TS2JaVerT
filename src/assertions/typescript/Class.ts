import { chain, find, isEqual, map } from "lodash";
import * as ts from "typescript";
import { Assertion } from "../Assertion";
import { printFunctionSpec } from "../FunctionSpec";
import { CustomPredicate } from "../predicates/CustomPredicate";
import { DataProp } from "../predicates/DataProp";
import { JSObject } from "../predicates/JSObject";
import { NonePredicate } from "../predicates/NonePredicate";
import { SeparatingConjunctionList } from "../predicates/SeparatingConjunctionList";
import { visitExpressionForCapturedVars } from "./Expression";
import { Function } from "./functions/Function";
import { createAndAnalyseFunction } from "./functions/FunctionCreator";
import { Program } from "./Program";
import { Variable } from "./Variable";

export class Class {
    public static visitClass(
        node: ts.ClassDeclaration,
        classOuterScope: Variable[],
        program: Program,
    ): Variable[] {
        const checker = program.getTypeChecker();
        if (!node.name || !checker.getSymbolAtLocation(node.name)) {
            throw new Error("Failure while trying to visit class! Cannot retrieve class symbol");
        }
        const className = checker.getSymbolAtLocation(node.name)!.name;

        const classVar = program.getClass(className);
        node.members.map((member) => {
            if (ts.isConstructorDeclaration(member)) {
                return createAndAnalyseFunction(
                    member,
                    program,
                    classOuterScope,
                    (constr) => { classVar.setConstructor(constr); },
                    classVar,
                ).getCapturedVars();
            } else if (ts.isMethodDeclaration(member)) {
                return createAndAnalyseFunction(
                    member,
                    program,
                    classOuterScope,
                    (method) => {
                        program.addFunction(member, method);
                        classVar.addMethod(method);
                    },
                    classVar,
                ).getCapturedVars();
            } else if (ts.isPropertyDeclaration(member)) {
                const declaredField = Variable.fromPropertyDeclaration(member, program);
                classVar.addField(declaredField);
                if (member.initializer) {
                    const expressionAnalysis =
                        visitExpressionForCapturedVars(member.initializer, classOuterScope, [], program);
                    if (expressionAnalysis.funcDef) {
                        program.addFunction(member, expressionAnalysis.funcDef);
                    }
                    return expressionAnalysis.capturedVars;
                }
                return [];
            }
            throw new Error("Unexpected member in class");
        });

        return [];
    }

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
    }

    public readonly name: string;
    private inheritingClassName: string | undefined;

    private constr: Function | undefined;
    private inheritingFrom: Class | undefined;
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
        if (classSymbol) {
            this.name = classSymbol.name;
        } else {
            throw new Error("Can not initialize class. Class symbol is false");
        }

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
                if (parentType) {
                    this.inheritingClassName = parentType.name;
                } else {
                    throw new Error("Can not find name associated with parent class");
                }
            }
        }

    }

    public addField(field: Variable): void {
        this.properties.push(field);
    }

    public addMethod(method: Function): void {
        this.methods.push(method);
    }

    public getProtoPredicate(): string {
        const currProto = "proto";
        const parentProto = "parentProto";
        const fPlus = this.determineFPlus();
        const predDef = `${this.getProtoPredicateName()}(${currProto}, ${parentProto})`;
        const predicate = new SeparatingConjunctionList([
            new JSObject(currProto, parentProto),
            ...fPlus.map((field) => new NonePredicate(currProto, field)),
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
        const nPlus = this.determineNPlus();
        return `
        ${this.getInstancePredicateName()}(${o}, ${proto}):
            ${new SeparatingConjunctionList([
            new JSObject(o, proto),
            ...nPlus.map((namedMethod) => new NonePredicate(o, namedMethod)),
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
        return new CustomPredicate(
            protoPredName,
            `${protoLogicalVariableName}, ${
                this.inheritingFrom
                    ? this.inheritingFrom.getProtoLogicalVariableName()
                    : "Object.prototype"}`,
        );
    }

    public getName(): string {
        return this.name;
    }

    public getConstructorSpec(): string {
        if (!this.constr) {
            throw new Error("Can not get constructor spec. No constructor set for class.");
        }

        return printFunctionSpec(this.constr.generateAssertion());
    }

    private setConstructor(constr: Function): void {
        if (this.constr) {
            throw new Error("Can not set constructor. Class has already set it once.");
        }

        this.constr = constr;
    }

    private updateAncestorsAndDescendants(): boolean {
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

    private determineNPlus(): string[] {
        return chain([this, ...this.ancestors])
            .flatMap((cls) => cls.methods)
            .map((method) => method.name)
            .uniq()
            .value();
    }

    private determineFPlus(): string[] {
        return chain([this, ...this.descendants])
            .flatMap((cls) => cls.properties)
            .map((property) => property.name)
            .uniq()
            .value();
    }
}
