import { find, flatMap, isEqual, map } from "lodash";
import * as ts from "typescript";
import { Assertion } from "../assertions/Assertion";
import { CustomPredicate } from "../assertions/CustomPredicate";
import { DataProp } from "../assertions/DataProp";
import { Disjunction } from "../assertions/Disjunction";
import { EmptyFields } from "../assertions/EmptyFields";
import { printFunctionSpec } from "../assertions/FunctionSpec";
import { JSObject } from "../assertions/JSObject";
import { SeparatingConjunctionList } from "../assertions/SeparatingConjunctionList";
import { Function } from "./functions/Function";
import { CURR_SCOPE_LOGICAL, OBJECT_PROTOTYPE_VAR, Program, SUPER_PARAM } from "./Program";
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
        const scopeChain = "sch";
        const predDef = `${this.getProtoPredicateName()}(+${currProto}, ${parentProto}, ${scopeChain})`;
        const predicate = new SeparatingConjunctionList([
            new JSObject(currProto, parentProto),
            new EmptyFields(currProto, this.methods.map((method) => method.getName())),
            ...this.methods.map((method) => new SeparatingConjunctionList([
                new DataProp(currProto, method.getName(), Variable.logicalVariableFromVariable(method)),
                Function.logicalVariableFromFunction(method, scopeChain).toAssertion(),
            ])),
        ]);
        return `
        @pred ${predDef}:
            ${predicate.toString()};`;
    }

    public getInstancePredicate(): string {
        const o = "o";
        const proto = "proto";
        const predAssertion: Disjunction = new SeparatingConjunctionList([
            new JSObject(o, proto),
            new EmptyFields(o, this.properties.map((prop) => prop.name)),
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

    public getConstructorPredicate(): string {
        if (!this.constr) {
            throw new Error(`Cannot generate constructor predicate for class ${this.name}!
            No constructor identified!`);
        }
        const constr = "constr";
        const proto = "proto";
        const scopeChain = "sch";
        const predName = this.getConstructorPredicateName();
        return `
        @pred ${predName}(+${constr}, ${proto}, ${scopeChain}):
            JSFunctionObjectStrong(${constr}, "${this.constr.id}", ${scopeChain}, _, ${proto});`;
    }

    public getProtoAndConstructorPredicate(): string {
        if (!this.constr) {
            throw new Error(`Cannot generate full predicate for class ${this.name}!
            No constructor identified!`);
        }

        const predName = this.getProtoAndConstructorPredicateName();
        const currProto = "proto";
        const parentProto = "parentProto";
        const constructor = "constr";
        const scopeChain = "sch";

        if (!this.inheritingFrom) {
            return `
        @pred ${predName}(${currProto}, ${parentProto}, +${constructor}, ${scopeChain}):
            sc_scope(${this.constr.id}, ${this.name} : ${constructor}, ${scopeChain}) *
            ${this.getConstructorPredicateName()}(${constructor}, ${currProto}, ${scopeChain}) *
            ${this.getProtoPredicateName()}(${currProto}, ${parentProto}, ${scopeChain});`;
        }
        const s = "s";
        return `
        @pred ${predName}(${currProto}, ${parentProto}, +${constructor}, ${scopeChain}, ${s}):
            sc_scope(${this.constr.id}, ${this.name} : ${constructor}, ${scopeChain}) *
            sc_scope(${this.constr.id}, ${SUPER_PARAM} : ${s}, ${scopeChain}) *
            ${this.getConstructorPredicateName()}(${constructor}, ${currProto}, ${scopeChain}) *
            ${this.getProtoPredicateName()}(${currProto}, ${parentProto}, ${scopeChain});`;
    }

    public getProtoAndConstructorAssertion(forItself: boolean, inPredicate: boolean): Assertion {
        const predName = this.getProtoAndConstructorPredicateName();
        const protoParam = inPredicate ? this.getProtoParamName() : this.getProtoLogicalVariableName();
        const scopeChain = inPredicate
            ? this.getScopeParamName()
            : (forItself ? CURR_SCOPE_LOGICAL : this.getScopeLogicalVariableName());
        const constructorName = inPredicate
            ? this.getConstructorParamName()
            : this.getConstructorLogicalVariableName();

        if (this.inheritingFrom) {
            const parentProtoParam = inPredicate
                ? this.inheritingFrom.getProtoParamName()
                : this.inheritingFrom.getProtoLogicalVariableName();
            const parentConstructorParam = inPredicate
                ? this.inheritingFrom.getConstructorParamName()
                : this.inheritingFrom.getConstructorLogicalVariableName();

            return new CustomPredicate(predName,
                protoParam,
                parentProtoParam,
                constructorName,
                scopeChain,
                parentConstructorParam);
        }

        return new CustomPredicate(predName,
            protoParam,
            OBJECT_PROTOTYPE_VAR,
            constructorName,
            scopeChain);
    }

    public getProtoAndConstructorPredicateName(): string {
        return `${this.name}ProtoAndConstructor`;
    }

    public getConstructorPredicateName() {
        return `${this.name}Constructor`;
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

    public getProtoParamName(): string {
        return `${this.name}proto`;
    }

    public getConstructorLogicalVariableName(): string {
        return `#${this.name}`;
    }

    public getConstructorParamName(): string {
        return this.name;
    }

    public getScopeLogicalVariableName(): string {
        return `#${this.name}scope`;
    }

    public getScopeParamName(): string {
        return `${this.name}scope`;
    }

    public getAssertion(instanceName: string): Assertion {
        return new Disjunction(this.descendants.map((descendant) =>
            descendant.getExactAssertion(instanceName),
        ));
    }

    public getExactAssertion(instanceName: string, protoLogicalVariable?: string): Assertion {
        const instancePredName = this.getInstancePredicateName();
        protoLogicalVariable = protoLogicalVariable || this.getProtoLogicalVariableName();
        return new CustomPredicate(instancePredName, instanceName, protoLogicalVariable);
    }

    public getProtoAssertion(): Assertion {
        const protoPredName = this.getProtoPredicateName();
        const protoLogicalVariableName = this.getProtoLogicalVariableName();
        return new CustomPredicate(
            protoPredName,
            protoLogicalVariableName,
            this.inheritingFrom
                ? this.inheritingFrom.getProtoLogicalVariableName()
                : OBJECT_PROTOTYPE_VAR,
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

    public getParent(): Class | undefined {
        return this.inheritingFrom;
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

    public isParentOf(c: Class): boolean {
        return c.inheritingFrom === this;
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
}
