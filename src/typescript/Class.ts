import { chain, find, flatMap, isEqual, map } from "lodash";
import * as ts from "typescript";
import { Assertion } from "../assertions/Assertion";
import { CustomPredicate } from "../assertions/CustomPredicate";
import { DataProp } from "../assertions/DataProp";
import { Disjunction } from "../assertions/Disjunction";
import { printFunctionSpec } from "../assertions/FunctionSpec";
import { JSObject } from "../assertions/JSObject";
import { NoneAssertion } from "../assertions/NoneAssertion";
import { SeparatingConjunctionList } from "../assertions/SeparatingConjunctionList";
import { Function } from "./functions/Function";
import { Program } from "./Program";
import { Variable } from "./Variable";

export interface ClassVisitor<T> {
    constructorDeclarationVisitor: (
        declaration: ts.ConstructorDeclaration,
        classVar: Class,
        outerScope: Variable[]) => T;
    methodDeclarationVisitor: (declaration: ts.MethodDeclaration, classVar: Class, outerScope: Variable[]) => T;
    propertyVisitor: (declaration: ts.PropertyDeclaration, classVar: Class, classOuterScope: Variable[]) => T;
}

export class Class {
    public static visitClass<T>(
        node: ts.ClassDeclaration,
        classOuterScope: Variable[],
        program: Program,
        visitor: ClassVisitor<T>,
    ): T[] {
        const checker = program.getTypeChecker();
        if (!node.name || !checker.getSymbolAtLocation(node.name)) {
            throw new Error("Failure while trying to visit class! Cannot retrieve class symbol");
        }
        const className = checker.getSymbolAtLocation(node.name)!.name;

        const classVar = program.getClass(className);
        return node.members.map((member) => {
            if (ts.isConstructorDeclaration(member)) {
                return visitor.constructorDeclarationVisitor(member, classVar, classOuterScope);
            } else if (ts.isMethodDeclaration(member)) {
                return visitor.methodDeclarationVisitor(member, classVar, classOuterScope);
            } else if (ts.isPropertyDeclaration(member)) {
                return visitor.propertyVisitor(member, classVar, classOuterScope);
            }
            throw new Error("Unexpected member in class");
        });
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

        map(classMap, (classVar) =>
            classVar.properties = flatMap(classVar.ancestors, (ancestor) => ancestor.properties),
        );
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

    public doesClassInherit(): boolean {
        return this.inheritingFrom !== undefined;
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
        const predDef = `${this.getProtoPredicateName()}(+${currProto}, ${parentProto})`;
        const predicate = new SeparatingConjunctionList([
            new JSObject(currProto, parentProto),
            ...fPlus.map((field) => new NoneAssertion(currProto, field)),
            ...this.methods.map((method) => new SeparatingConjunctionList([
                new DataProp(currProto, method.getName(), Variable.logicalVariableFromVariable(method)),
                Function.logicalVariableFromFunction(method).toAssertion(),
            ])),
        ]);
        return `
        @pred ${predDef}:
            ${predicate.toString()};`;
    }

    public getInstancePredicate(): string {
        const o = "o";
        const proto = "proto";
        const nPlus = this.determineNPlus();
        const predAssertion: Disjunction = new SeparatingConjunctionList([
            new JSObject(o, proto),
            ...nPlus.map((namedMethod: string) => new NoneAssertion(o, namedMethod)),
            ...this.properties.map((prop) => {
                const logicalVar = Variable.logicalVariableFromVariable(prop);
                return new SeparatingConjunctionList([
                    new DataProp(o, prop.name, logicalVar),
                    logicalVar.toAssertion(),
                ]);
            }),
        ]).toDisjunctiveNormalForm();
        return `
        @pred ${this.getInstancePredicateName()}(+${o}, ${proto}):
            ${predAssertion.disjuncts.map((def) => def.toString()).join(",\n")};`;
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
        return new Disjunction(this.descendants.map((descendant) =>
            descendant.getExactAssertion(instanceName),
        ));
    }

    public getExactAssertion(instanceName: string, protoLogicalVariable?: string): Assertion {
        const instancePredName = this.getInstancePredicateName();
        protoLogicalVariable = protoLogicalVariable || this.getProtoLogicalVariableName();
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
                    : "$lobj_proto"}`,
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

    public setConstructor(constr: Function): void {
        if (this.constr) {
            throw new Error("Can not set constructor. Class has already set it once.");
        }

        this.constr = constr;
    }

    public getDescendantProtosSet(): string[] {
        return this.descendants.map((d) => d.getProtoLogicalVariableName());
    }

    private updateAncestorsAndDescendants(): boolean {
        if (this.inheritingFrom) {
            let didUpdate: boolean = false;
            const inSubtree = [this.inheritingFrom, ...this.descendants];
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
