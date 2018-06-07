import { difference, find, flatMap, flatten, uniq } from "lodash";
import * as ts from "typescript";
import { Class } from "./Class";
import { visitExpressionForCapturedVars, visitExpressionToFindAssignments } from "./Expression";
import { Function } from "./functions/Function";
import {
    createAndAnalyseFunction,
    getFunctionScope,
    setCapturedVars,
} from "./functions/FunctionCreator";
import { Program } from "./Program";
import {Variable} from "./Variable";

export function visitStatementToFindDeclaredVars(
    node: ts.Node | undefined,
    program: Program,
): Variable[] {
    const visitStatement = (n: ts.Node | undefined) => visitStatementToFindDeclaredVars(n, program);
    if (!node ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isReturnStatement(node) ||
        ts.isExpressionStatement(node)
    ) {
        return [];
    } else if (ts.isVariableStatement(node)) {
        return visitStatement(node.declarationList);
    } else if (ts.isVariableDeclarationList(node)) {
        return flatMap(node.declarations, visitStatement);
    } else if (ts.isVariableDeclaration(node)) {
        const declaredVar = Variable.fromDeclaration(node, program);
        if (node.initializer) {
            if (node.parent && ts.isVariableDeclarationList(node.parent) &&
                node.parent.parent && ts.isVariableStatement(node.parent.parent)) {

                program.addAssignments(node.parent.parent, [{
                    assignedVar: declaredVar,
                    parameter: false,
                }]);
            } else {
                throw new Error("Variable declaration was not child of variable statement. Something went wrong");
            }
        }
        return [declaredVar];
    } else if (ts.isFunctionDeclaration(node)) {
        return [createAndAnalyseFunction(node, program)];
    } else if (ts.isIfStatement(node)) {
        return [
            ...visitStatement(node.thenStatement),
            ...visitStatement(node.elseStatement),
        ];
    } else if (ts.isWhileStatement(node)) {
        return visitStatement(node.statement);
    } else if (ts.isBlock(node)) {
        return flatMap(node.statements, visitStatement);
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
    if (!node || ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node)) {
        return [];
    } else if (ts.isVariableStatement(node)) {
        return visitStatement(node.declarationList);
    } else if (ts.isVariableDeclarationList(node)) {
        return uniq(flatMap(node.declarations, visitStatement));
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
    } else if (ts.isWhileStatement(node)) {
        return visitStatement(node.statement);
    } else if (ts.isReturnStatement(node)) {
        return visitExpressionForCapturedVars(node.expression, outerScope, currentScope, program).capturedVars;
    } else if (ts.isExpressionStatement(node)) {
        const expressionAnalysis =
            visitExpressionForCapturedVars(node.expression, outerScope, currentScope, program);

        if (expressionAnalysis.funcDef) {
            program.addFunction(node, expressionAnalysis.funcDef);
        }

        return expressionAnalysis.capturedVars;
    } else if (ts.isBlock(node)) {
        return uniq(flatMap(node.statements, visitStatement));
    }
    throw new Error(`Unexpected node type ${node.kind} in visitStatementAndExtractVars`);
}

export function visitStatementToFindAssignments(
    node: ts.Node | undefined,
    program: Program,
    params: Variable[],
    outerScope: Variable[],
    currentScope: Variable[]): void {

    const checker = program.getTypeChecker();
    const visitStatement = (n: ts.Node | undefined) =>
        visitStatementToFindAssignments(n, program, params, outerScope, currentScope);

    if (!node || ts.isInterfaceDeclaration(node)) {
        return;
    } else if (ts.isVariableStatement(node)) {
        visitStatement(node.declarationList);
    } else if (ts.isVariableDeclarationList(node)) {
        node.declarations.forEach(visitStatement);
    } else if (ts.isVariableDeclaration(node)) {
        if (node.initializer) {
            if (node.parent && ts.isVariableDeclarationList(node.parent) &&
                node.parent.parent && ts.isVariableStatement(node.parent.parent)) {

                program.addAssignments(
                    node.parent.parent,
                    visitExpressionToFindAssignments(
                        node.initializer,
                        params,
                        outerScope,
                        currentScope,
                        program,
                        program.getFunction(node.parent.parent),
                    ),
                );
            } else {
                throw new Error("Variable declaration was not child of variable statement. Something went wrong");
            }
        }
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
        const funcScope = getFunctionScope(funcVar, program, node);
        node.body!.statements.map((statement) => visitStatementToFindAssignments(
            statement,
            program,
            funcVar.getParams(),
            [...currentScope, ...outerScope],
            funcScope,
        ));
    } else if (ts.isIfStatement(node)) {
        visitStatement(node.thenStatement);
        visitStatement(node.elseStatement);
    } else if (ts.isClassDeclaration(node)) {
        const classScope = [...currentScope, ...outerScope];

        Class.visitClass(node, classScope, program, {
            constructorDeclarationVisitor: (declaration, _1, classOuterScope) => {
                const constrVar = program.getFunction(declaration);
                if (!constrVar) {
                    throw new Error("No function associated with constructor declaration");
                } else if (!declaration.body) {
                    throw new Error("Constructor declaration has no body");
                }
                const constrScope = getFunctionScope(constrVar, program, declaration);
                declaration.body.statements.map((statement) => visitStatementToFindAssignments(
                    statement,
                    program,
                    constrVar.getParams(),
                    classOuterScope,
                    constrScope,
                ));
            },
            methodDeclarationVisitor: (declaration, _1, classOuterScope) => {
                const methodVar = program.getFunction(declaration);
                if (!methodVar) {
                    throw new Error("No function associated with constructor declaration");
                } else if (!declaration.body) {
                    throw new Error("Constructor declaration has no body");
                }
                const constrScope = getFunctionScope(methodVar, program, declaration);
                declaration.body.statements.map((statement) => visitStatementToFindAssignments(
                    statement,
                    program,
                    methodVar.getParams(),
                    classOuterScope,
                    constrScope,
                ));
            },
            propertyVisitor: (declaration, _1, classOuterScope) => {
                const funcVar = program.getFunction(declaration);
                if (!funcVar) {
                    return;
                }

                if (!declaration.initializer || !ts.isFunctionExpression(declaration.initializer)) {
                    throw new Error("Property has associated function variable but no initializer");
                }

                const funcScope = getFunctionScope(funcVar, program, declaration.initializer);
                declaration.initializer.body.statements
                    .map((statement) => visitStatementToFindAssignments(
                        statement,
                        program,
                        funcVar.getParams(),
                        classOuterScope,
                        funcScope,
                    ));
            },
        });
    } else if (ts.isWhileStatement(node)) {
        visitStatement(node.statement);
    } else if (ts.isReturnStatement(node)) {
        program.addAssignments(
            node,
            visitExpressionToFindAssignments(node.expression, params, outerScope, currentScope, program),
        );
    } else if (ts.isExpressionStatement(node)) {
        program.addAssignments(
            node,
            visitExpressionToFindAssignments(
                node.expression,
                params,
                outerScope,
                currentScope,
                program,
                program.getFunction(node),
            ),
        );
    } else if (ts.isBlock(node)) {
        node.statements.forEach(visitStatement);
    } else {
        throw new Error(`Unexpected node type ${node.kind} when marking assignments`);
    }
}
