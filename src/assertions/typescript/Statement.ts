import * as ts from "typescript";
import { uniq } from "lodash";
import { UnexpectedASTNode } from "./exceptions/UnexpectedASTNode";
import { visitExpression } from "./Expression";

export interface FunctionBodyVariableUsage {
    varsUsed: string[];
    varsDeclared: string[];
}

export function visitStatement(node: ts.Node, checker: ts.TypeChecker): FunctionBodyVariableUsage {
    const visitStatementWithChecker = (node: ts.Node) => visitStatement(node, checker);
    if (ts.isVariableStatement(node)) {
        // var x = bla, y = akjshd;
        console.log("VARIABLE STATEMENT");
        return visitStatementWithChecker(node.declarationList);
    }
    else if (ts.isVariableDeclarationList(node)) {
        // x = bla, y = aksjhf
        console.log("VARIABLE DECLARATION LIST");
        return node.getChildren()
            .map(visitStatementWithChecker)
            .reduce((prev: FunctionBodyVariableUsage, curr: FunctionBodyVariableUsage) => {
                return {
                    varsUsed: uniq([...prev.varsUsed, ...curr.varsUsed]),
                    varsDeclared: uniq([...prev.varsDeclared, ...curr.varsDeclared])
                };
            });
    } else if (ts.isVariableDeclaration(node)) {
        /// x = bla
        console.log("VARIABLE DECLARATION");
        if (node.initializer) {
            // Over here it's important to look for identifiers
            visitExpression(node.initializer);
        }
        const declaredSymbol = checker.getSymbolAtLocation(node.name);
        // Variable.fromTsSymbol(declaredSymbol, checker);
        return {
            varsUsed: visitExpression(node.initializer),
            varsDeclared: [declaredSymbol.name],
        };
    } else if (ts.isIfStatement(node)) {
        const thenBodyVariableUsage = visitStatementWithChecker(node.thenStatement);
        const elseBodyVariableUsage = node.elseStatement && visitStatementWithChecker(node.elseStatement);
        return {
            varsUsed: [
                ...visitExpression(node.expression),
                ...thenBodyVariableUsage.varsUsed,
                ...elseBodyVariableUsage.varsUsed,
            ],
            varsDeclared: [
                ...thenBodyVariableUsage.varsDeclared,
                ...elseBodyVariableUsage.varsDeclared,
            ]
        };
    } else if (ts.isWhileStatement(node)) {
        const whileBodyVariableUsage = visitStatementWithChecker(node.statement);
        return {
            varsUsed: [
                ...visitExpression(node.expression),
                ...whileBodyVariableUsage.varsUsed,
            ],
            varsDeclared: whileBodyVariableUsage.varsDeclared,
        };
    } else if (ts.isReturnStatement(node)) {
        /// return a;
        console.log("RETURN STATEMENT");
        return {
            varsUsed: node.expression && visitExpression(node.expression),
            varsDeclared: [],
        };
    } else {
        throw new UnexpectedASTNode(node.parent, node);
    }

}
