import * as ts from "typescript";
import { find } from "lodash";
import {UnexpectedASTNode} from "./exceptions/UnexpectedASTNode";
import {Variable} from "./Variable";
import {visitExpression} from "./Expression";

export class Class {
    private name: string;
    private inheritingClassName: string;
    private inheritingFrom: Class;
    private methods: Function[] = [];
    private properties: Variable[] = [];

    constructor(node: ts.ClassDeclaration, checker: ts.TypeChecker) {
        if (!node.name) {
            throw "Only named class declarations are supported";
        }

        const classSymbol = checker.getSymbolAtLocation(node.name);
        if (classSymbol) { // TODO: When is this false?
            const constructorType = checker.getTypeOfSymbolAtLocation(classSymbol, classSymbol.valueDeclaration);
            constructorType.getConstructSignatures().map(constructorSignatures => {
                // TODO: Fill this in
            });
        }

        if (node.heritageClauses) {
            // We only need to care about extends clauses because the implements has already been
            // taken care of by tsc
            const extendsClause = find(node.heritageClauses,
                    heritageClause => heritageClause.token === ts.SyntaxKind.ExtendsKeyword);

            if (extendsClause) {
                if (extendsClause.types.length !== 1) {
                    throw "A class should extend either 0 or 1 other classes";
                }

                const parentType = checker.getSymbolAtLocation(extendsClause.types[0].expression);
                this.inheritingClassName = parentType.name;
            }
        }

        node.members.map(member => {
            if (ts.isConstructorDeclaration(member)) {

            } else if (ts.isMethodDeclaration(member)) {

            } else if (ts.isPropertyDeclaration(member)) {
                this.properties.push(Variable.fromPropertyDeclaration(member, checker));
                if (member.initializer) {
                    visitExpression(member.initializer);
                }
            } else {
                throw new UnexpectedASTNode(node, member);
            }
        });
    }

    getName(): string {
        return this.name;
    }

}