import { find, isEqual, map } from "lodash";
import * as ts from "typescript";
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
    }

    public readonly name: string;
    private inheritingClassName: string;

    private inheritingFrom: Class;
    private methods: Function[] = [];
    private properties: Variable[] = [];
    private ancestors: Class[] = [];
    private descendants: Class[] = [];

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
                    Function.fromTSNode(member, program, `${classSymbol.name}.${symbol.getName()}`),
                );
            } else if (ts.isPropertyDeclaration(member)) {
                this.properties.push(Variable.fromPropertyDeclaration(member, program));
            } else {
                throw new Error("Unexpected member in class");
            }
        });
    }

    public updateAncestorsAndDescendants(): boolean {
        if (this.inheritingFrom) {
            let didUpdate: boolean = false;
            const inSubtree = [this, ...this.descendants];
            const above = [this.inheritingFrom, ...this.inheritingFrom.ancestors];
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

    public getName(): string {
        return this.name;
    }
}
