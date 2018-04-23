import * as ts from "typescript";
import { difference, flatten, uniq } from "lodash";
import { visitExpression } from "./Expression";
import { Function } from "./Function";
import {Variable} from "./Variable";

export interface FunctionBodyVariableUsage {
    varsUsed: string[];
    varsDeclared: string[];
}

export function reduceVariableUsages(usages: FunctionBodyVariableUsage[]): FunctionBodyVariableUsage {
    return usages.reduce((prev: FunctionBodyVariableUsage, curr: FunctionBodyVariableUsage) => {
            return {
                varsUsed: uniq([...prev.varsUsed, ...curr.varsUsed]),
                varsDeclared: uniq([...prev.varsDeclared, ...curr.varsDeclared])
            };
        });
}

export function getCapturedVarsNames(usage: FunctionBodyVariableUsage): string[] {
    return difference(usage.varsUsed, usage.varsDeclared);
}

export function visitStatementToFindDeclaredVars(node: ts.Node, checker: ts.TypeChecker): Variable[] {
    if (!node || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isReturnStatement(node)) {
        return [];
    } else if (ts.isVariableStatement(node)) {
        return visitStatementToFindDeclaredVars(node.declarationList, checker);
    } else if (ts.isVariableDeclarationList(node)) {
        return flatten(
            node.declarations.map(declaration => visitStatementToFindDeclaredVars(declaration, checker))
        );
    } else if (ts.isVariableDeclaration(node)) {
        const declaredSymbol = checker.getSymbolAtLocation(node.name);
        return [Variable.fromTsSymbol(declaredSymbol, checker)];
    } else if (ts.isFunctionDeclaration(node)) {
        // TODO: This is a bit tricksy
        return [Function.fromFunctionDeclaration(node, checker)];
    } else if (ts.isIfStatement(node)) {
        return [
            ...visitStatementToFindDeclaredVars(node.thenStatement, checker),
            ...visitStatementToFindDeclaredVars(node.elseStatement, checker),
        ];
    } else if (ts.isWhileStatement(node)) {
        return visitStatementToFindDeclaredVars(node.statement, checker);
    } else {
        throw new Error(`Unexpected node type ${node.kind} when looking for declared vars`);
    }
}

export function visitStatementAndExtractVars(node: ts.Node, checker: ts.TypeChecker): FunctionBodyVariableUsage {
    const visitStatementWithChecker = (node: ts.Node) => visitStatementAndExtractVars(node, checker);
    if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
        // This is not necessarily true, especially for classes, but since we don't support nested
        // classes or things like that, it shall be fine
        return { varsUsed: [], varsDeclared: [] };
    } else if (ts.isVariableStatement(node)) {
        // var x = bla, y = akjshd;
        console.log("VARIABLE STATEMENT");
        return visitStatementWithChecker(node.declarationList);
    }
    else if (ts.isVariableDeclarationList(node)) {
        // x = bla, y = aksjhf
        console.log("VARIABLE DELCARATION LIST");
        return reduceVariableUsages(node.declarations.map(visitStatementWithChecker));
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
    } else if (ts.isFunctionDeclaration(node)) {
        console.log("Function declaration");
        const func = Function.fromFunctionDeclaration(node, checker);

        return {
            varsDeclared: [func.getName()],
            varsUsed: []
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
        return {
            varsUsed: node.expression && visitExpression(node.expression),
            varsDeclared: [],
        };
    } else {
        throw new Error(`Unexpected node type ${node.kind} in visitStatementAndExtractVars`);
    }

}
