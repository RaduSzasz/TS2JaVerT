import { difference, find, flatten, uniq } from "lodash";
import * as ts from "typescript";
import { visitExpressionForCapturedVars } from "./Expression";
import { Function } from "./Function";
import {Variable} from "./Variable";

export interface FunctionBodyVariableUsage {
    varsUsed: string[];
    varsDeclared: string[];
}

export function getCapturedVarsNames(usage: FunctionBodyVariableUsage): string[] {
    return difference(usage.varsUsed, usage.varsDeclared);
}

export function visitStatementToFindDeclaredVars(node: ts.Node, program: ts.Program): Variable[] {
    const checker = program.getTypeChecker();
    if (!node || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isReturnStatement(node)) {
        return [];
    } else if (ts.isVariableStatement(node)) {
        return visitStatementToFindDeclaredVars(node.declarationList, program);
    } else if (ts.isVariableDeclarationList(node)) {
        return flatten(
            node.declarations.map((declaration) => visitStatementToFindDeclaredVars(declaration, program)),
        );
    } else if (ts.isVariableDeclaration(node)) {
        const declaredSymbol = checker.getSymbolAtLocation(node.name);
        return [Variable.fromTsSymbol(declaredSymbol, program)];
    } else if (ts.isFunctionDeclaration(node)) {
        return [Function.fromFunctionDeclaration(node, program)];
    } else if (ts.isIfStatement(node)) {
        return [
            ...visitStatementToFindDeclaredVars(node.thenStatement, program),
            ...visitStatementToFindDeclaredVars(node.elseStatement, program),
        ];
    } else if (ts.isWhileStatement(node)) {
        return visitStatementToFindDeclaredVars(node.statement, program);
    } else {
        throw new Error(`Unexpected node type ${node.kind} when looking for declared vars`);
    }
}

export function visitStatementToFindCapturedVars(
    node: ts.Node,
    program: ts.Program,
    outerScope: Variable[],
    currentScope: Variable[]): Variable[] {
    const checker = program.getTypeChecker();
    const visitStatement = (n: ts.Node) => visitStatementToFindCapturedVars(n, program, outerScope, currentScope);
    if (!node || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
        // TODO: Classes can contain captured vars. It's not good practice, but it is possible.
        return [];
    } else if (ts.isVariableStatement(node)) {
        return visitStatement(node.declarationList);
    } else if (ts.isVariableDeclarationList(node)) {
        uniq(flatten(node.declarations.map(visitStatement)));
    } else if (ts.isVariableDeclaration(node)) {
        if (node.initializer) {
            return visitExpressionForCapturedVars(node.initializer, outerScope, currentScope);
        }
    } else if (ts.isFunctionDeclaration(node)) {
        // Current function should be declared in the current scope.
        const functionName = checker.getSymbolAtLocation(node.name).name;
        const functionVar: Function = find(currentScope, Variable.nameMatcher(functionName)) as Function;
        if (!functionVar) {
            throw new Error("Current function declaration is not detected in current scope");
        }
        const funcStatements = node.body.statements;
        const declaredWithinFunc: Variable[] = flatten(
            funcStatements.map((statement) => visitStatementToFindDeclaredVars(statement, program)),
        );
        // TODO: Consider this should perhaps be a method on functions
        const withinFuncOuterScope = [...outerScope, ...currentScope];
        const withinFuncCurrScope = [...functionVar.getParams(), ...declaredWithinFunc];
        const capturedVars: Variable[] = uniq(flatten(
            funcStatements.map((statement) => visitStatementToFindCapturedVars(
                statement,
                program,
                withinFuncOuterScope,
                withinFuncCurrScope,
            ))));

        functionVar.setCapturedVars(capturedVars);
        return capturedVars;
    } else if (ts.isIfStatement(node)) {
        return uniq(flatten([
            ...visitStatement(node.thenStatement),
            ...visitStatement(node.elseStatement),
        ]));
    } else if (ts.isWhileStatement(node)) {
        return visitStatement(node.statement);
    } else if (ts.isReturnStatement(node)) {
        return visitExpressionForCapturedVars(node.expression, outerScope, currentScope);
    } else {
        throw new Error(`Unexpected node type ${node.kind} in visitStatementAndExtractVars`);
    }

}
