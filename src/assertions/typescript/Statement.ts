import { difference, find, flatten, uniq } from "lodash";
import * as ts from "typescript";
import { Class } from "./Class";
import { visitExpressionForCapturedVars } from "./Expression";
import { Function } from "./functions/Function";
import { createAndAnalyseFunction, setCapturedVars } from "./functions/FunctionCreator";
import { Program } from "./Program";
import {Variable} from "./Variable";

export function visitStatementToFindDeclaredVars(
    node: ts.Node | undefined,
    program: Program,
): Variable[] {
    const checker = program.getTypeChecker();
    if (!node ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isReturnStatement(node) ||
        ts.isExpressionStatement(node)
    ) {
        return [];
    } else if (ts.isVariableStatement(node)) {
        return visitStatementToFindDeclaredVars(node.declarationList, program);
    } else if (ts.isVariableDeclarationList(node)) {
        return flatten(
            node.declarations.map((declaration) => visitStatementToFindDeclaredVars(declaration, program)),
        );
    } else if (ts.isVariableDeclaration(node)) {
        const declaredSymbol = checker.getSymbolAtLocation(node.name);
        if (!declaredSymbol) {
            throw new Error("Cannot retrieve variable name symbol");
        }
        return [Variable.fromTsSymbol(declaredSymbol, program)];
    } else if (ts.isFunctionDeclaration(node)) {
        return [createAndAnalyseFunction(node, program)];
    } else if (ts.isIfStatement(node)) {
        return [
            ...visitStatementToFindDeclaredVars(node.thenStatement, program),
            ...visitStatementToFindDeclaredVars(node.elseStatement, program),
        ];
    } else if (ts.isWhileStatement(node)) {
        return visitStatementToFindDeclaredVars(node.statement, program);
    }
    throw new Error(`Unexpected node type ${node.kind} when looking for declared vars`);
}

export function visitStatementToFindCapturedVars(
    node: ts.Node | undefined,
    program: Program,
    outerScope: Variable[],
    currentScope: Variable[]): Variable[] {
    const checker = program.getTypeChecker();
    const visitStatement = (n: ts.Node | undefined) =>
        visitStatementToFindCapturedVars(n, program, outerScope, currentScope);
    if (!node || ts.isInterfaceDeclaration(node)) {
        // TODO: Classes can contain captured vars. It's not good practice, but it is possible.
        return [];
    } else if (ts.isVariableStatement(node)) {
        return visitStatement(node.declarationList);
    } else if (ts.isVariableDeclarationList(node)) {
        return uniq(flatten(node.declarations.map(visitStatement)));
    } else if (ts.isVariableDeclaration(node)) {
        if (node.initializer) {
            const expressionAnalysis =
                visitExpressionForCapturedVars(node.initializer, outerScope, currentScope, program);
            if (expressionAnalysis.funcDef) {
                const varStatement = node.parent!.parent;
                if (!varStatement || !ts.isVariableStatement(varStatement)) {
                    throw new Error("Parent of variable declaration is not variable statement");
                }
                program.addFunction(varStatement, expressionAnalysis.funcDef);
            }
            return expressionAnalysis.capturedVars;
        }
        return [];
    } else if (ts.isFunctionDeclaration(node)) {
        // Current function should be declared in the current scope.
        const nameSymbol = node.name && checker.getSymbolAtLocation(node.name);
        if (!nameSymbol) {
            throw new Error("Cannot find function captured vars! Cannot retrieve function name");
        }
        const functionName = nameSymbol.name;
        const funcVar: Function = find(currentScope, Variable.nameMatcher(functionName)) as Function;
        if (!funcVar) {
            throw new Error("Current function declaration is not detected in current scope");
        }
        setCapturedVars(funcVar, program, [...currentScope, ...outerScope], node);
        program.addFunction(node, funcVar);
        return difference(funcVar.getCapturedVars(), currentScope);
    } else if (ts.isIfStatement(node)) {
        return uniq(flatten([
            ...visitStatement(node.thenStatement),
            ...visitStatement(node.elseStatement),
        ]));
    } else if (ts.isClassDeclaration(node)) {
        const classScope = [...currentScope, ...outerScope];
        return Class.visitClass(node, classScope, program);
    } else if (ts.isWhileStatement(node)) {
        return visitStatement(node.statement);
    } else if (ts.isReturnStatement(node)) {
        return visitExpressionForCapturedVars(node.expression, outerScope, currentScope, program).capturedVars;
    } else if (ts.isExpressionStatement(node)) {
        return visitExpressionForCapturedVars(node.expression, outerScope, currentScope, program).capturedVars;
    }
    throw new Error(`Unexpected node type ${node.kind} in visitStatementAndExtractVars`);
}
