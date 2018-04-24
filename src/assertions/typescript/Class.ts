import { find } from "lodash";
import * as ts from "typescript";
import { UnexpectedASTNode } from "./exceptions/UnexpectedASTNode";
import { Variable } from "./Variable";

export class Class {
    private name: string;
    private inheritingClassName: string;
    private inheritingFrom: Class;
    private methods: Function[] = [];
    private properties: Variable[] = [];

    constructor(node: ts.ClassDeclaration, checker: ts.TypeChecker) {
        if (!node.name) {
            throw new Error("Only named class declarations are supported");
        }

        const classSymbol = checker.getSymbolAtLocation(node.name);
        if (classSymbol) { // TODO: When is this false?
            const constructorType = checker.getTypeOfSymbolAtLocation(classSymbol, classSymbol.valueDeclaration);
            constructorType.getConstructSignatures().map((constructorSignatures) => {
                // TODO: Fill this in
            });
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
                this.inheritingClassName = parentType.name;
            }
        }

        node.members.map((member) => {
            if (ts.isConstructorDeclaration(member)) {
                // TODO: What should we do about the constructor?
            } else if (ts.isMethodDeclaration(member)) {
                // TODO: What should we do about methods? They are similar to Function. Can we reuse?
            } else if (ts.isPropertyDeclaration(member)) {
                this.properties.push(Variable.fromPropertyDeclaration(member, checker));
            } else {
                throw new UnexpectedASTNode(node, member);
            }
        });
    }

    public getName(): string {
        return this.name;
    }
}
