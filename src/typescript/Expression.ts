import { compact, difference, find, flatMap, isEqual, map, uniq, uniqWith } from "lodash";
import * as ts from "typescript";
import { Function } from "./functions/Function";
import { createAndAnalyseFunction, getFunctionScope } from "./functions/FunctionCreator";
import { Program } from "./Program";
import { visitStatementToFindAssignments } from "./Statement";
import { AssignedVariable, Variable } from "./Variable";

export interface ExpressionAnalysis {
    capturedVars: Variable[];
    funcDef: Function | undefined;
}

function reduceExpressionAnalysis(currResult: ExpressionAnalysis, nextResult: ExpressionAnalysis): ExpressionAnalysis {
    return {
        capturedVars: uniq([
            ...currResult.capturedVars,
            ...nextResult.capturedVars,
        ]),
        funcDef: currResult.funcDef || nextResult.funcDef,
    };
}

const emptyFunctionAnalysis: ExpressionAnalysis = {
    capturedVars: [],
    funcDef: undefined,
};

export function visitExpressionForCapturedVars(
    node: ts.Node | undefined,
    outerScope: Variable[],
    currentScope: Variable[],
    program: Program,
): ExpressionAnalysis {
    const visitExpressionPreservingTypeEnvs
        = (n: ts.Node | undefined) => visitExpressionForCapturedVars(n, outerScope, currentScope, program);
    if (!node ||
        ts.isStringLiteral(node) ||
        ts.isNumericLiteral(node) ||
        node.kind === ts.SyntaxKind.SuperKeyword || node.kind === ts.SyntaxKind.NullKeyword ||
        node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword ||
        (ts.isToken(node) && node.kind === ts.SyntaxKind.ThisKeyword)
    ) {
        return emptyFunctionAnalysis;
    } else if (ts.isIdentifier(node)) {
        if (find(currentScope, Variable.nameMatcher(node.text)) ||
                node.originalKeywordKind ||
                node.text === "console"
        ) {
            return emptyFunctionAnalysis;
        }
        const capturedVar = find(outerScope, Variable.nameMatcher(node.text));
        if (!capturedVar) {
            throw new Error(`Identifier ${node.text} not present in current or outer scope.`);
        }
        return { capturedVars: [capturedVar], funcDef: undefined };
    } else if (ts.isPropertyAccessExpression(node)) {
        // node represents something like a.b; not a["b"]
        return visitExpressionPreservingTypeEnvs(node.expression);
    } else if (ts.isElementAccessExpression(node)) {
        // node represents something like a["b"] or a[x]
        return compact([
            visitExpressionPreservingTypeEnvs(node.expression),
            node.argumentExpression && visitExpressionPreservingTypeEnvs(node.argumentExpression),
        ]).reduce(reduceExpressionAnalysis, emptyFunctionAnalysis);
    } else if (ts.isBinaryExpression(node)) {
        return [
            visitExpressionPreservingTypeEnvs(node.left),
            visitExpressionPreservingTypeEnvs(node.right),
        ].reduce(reduceExpressionAnalysis, emptyFunctionAnalysis);
    } else if (ts.isObjectLiteralExpression(node)) {
        return node.properties
            .map((property) => {
                if (ts.isPropertyAssignment(property)) {
                    return visitExpressionPreservingTypeEnvs(property);
                } else {
                    throw new Error(`Object literal expression contains child of kind ${property.kind}`);
                }
            })
            .reduce(reduceExpressionAnalysis, emptyFunctionAnalysis);
    } else if (ts.isPropertyAssignment(node)) {
        // x: 3
        return visitExpressionPreservingTypeEnvs(node.initializer);
    } else if (ts.isCallExpression(node)) {
        /// f(a, b), where f, a, b can all be more complicated expressions
        return [
            visitExpressionPreservingTypeEnvs(node.expression),
            ...node.arguments.map(visitExpressionPreservingTypeEnvs),
        ].reduce(reduceExpressionAnalysis, emptyFunctionAnalysis);
    } else if (ts.isFunctionExpression(node)) {
        const funcVar = createAndAnalyseFunction(node, program, [...currentScope, ...outerScope]);
        return {
            capturedVars: difference(funcVar.getCapturedVars(), currentScope),
            funcDef: funcVar,
        };
    } else if (ts.isParenthesizedExpression(node)) {
        return visitExpressionPreservingTypeEnvs(node.expression);
    } else if (ts.isNewExpression(node)) {
        return map(node.arguments, visitExpressionPreservingTypeEnvs)
                .reduce(reduceExpressionAnalysis, emptyFunctionAnalysis);
    } else if (ts.isAsExpression(node)) {
        return visitExpressionPreservingTypeEnvs(node.expression);
    }
    throw new Error(`Node of kind ${node.kind} is not an expected Expression`);
}

export function visitExpressionToFindAssignments(
    node: ts.Node | undefined,
    params: Variable[],
    outerScope: Variable[],
    currentScope: Variable[],
    program: Program,
    func?: Function): AssignedVariable[] {

    if (node && func &&
        !ts.isFunctionExpression(node) &&
        !(ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken)) {

        throw new Error(`Func argument is provided, node is ${node.kind} instead of function
        expression or assignment`);
    }

    const visitExpression = (n: ts.Node | undefined) =>
        visitExpressionToFindAssignments(n, params, outerScope, currentScope, program, func);

    if (!node ||
        ts.isStringLiteral(node) ||
        ts.isNumericLiteral(node) ||
        ts.isIdentifier(node) ||
        node.kind === ts.SyntaxKind.SuperKeyword || node.kind === ts.SyntaxKind.NullKeyword ||
        node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword ||
        (ts.isToken(node) && node.kind === ts.SyntaxKind.ThisKeyword)) {

        return [];
    } else if (ts.isPropertyAccessExpression(node)) {
        return visitExpression(node.expression);
    } else if (ts.isElementAccessExpression(node)) {
        return visitExpression(node.expression);
    } else if (ts.isObjectLiteralExpression(node)) {
        return uniqWith(flatMap(node.properties, (property) => {
            if (ts.isPropertyAssignment(property)) {
                return visitExpression(property);
            } else {
                throw new Error(`Object literal expression contains child of kind ${property.kind}`);
            }
        }), isEqual);
    } else if (ts.isPropertyAssignment(node)) {
        return visitExpression(node.initializer);
    } else if (ts.isCallExpression(node)) {
        return uniqWith(compact([
            ...visitExpression(node.expression),
            ...flatMap(node.arguments, visitExpression),
        ]), isEqual);
    } else if (ts.isParenthesizedExpression(node)) {
        return visitExpression(node.expression);
    } else if (ts.isNewExpression(node)) {
        if (node.arguments) {
            return uniqWith(flatMap(node.arguments, visitExpression), isEqual);
        } else {
            throw new Error("New expression had no args. When does this happen?");
        }
    } else if (ts.isAsExpression(node)) {
        return visitExpression(node.expression);
    } else if (ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {

        const rightResult = visitExpression(node.right);
        const leftResult = visitExpressionToFindAssignments(node.left, params, outerScope, currentScope, program);

        const obj = ts.isIdentifier(node.left)
            ? node.left
            : ((ts.isPropertyAccessExpression(node.left) || ts.isElementAccessExpression(node.left))
                ? node.left.expression
                : undefined);

        if (obj && ts.isIdentifier(obj)) {
            const assignedVar = getAssignedVariable(obj.text, params, [...currentScope, ...outerScope]);
            if (!assignedVar) {
                throw new Error(`Cannot find ${obj.text} in scope`);
            }
            return uniqWith(compact([assignedVar, ...rightResult, ...leftResult]), isEqual);
        }

        return uniqWith(compact([...rightResult, ...leftResult]), isEqual);
    } else if (ts.isBinaryExpression(node)) {
        return uniqWith(compact([
            ...visitExpression(node.left),
            ...visitExpression(node.right),
        ]), isEqual);
    } else if (ts.isFunctionExpression(node)) {
        if (!func) {
            throw new Error("Function expression node encountered, but no func argument provided");
        }
        const funcScope = getFunctionScope(func, program, node);
        visitStatementToFindAssignments(
            node.body,
            program,
            func.getParams(),
            [...currentScope, ...outerScope],
            funcScope,
        );
        return [];
    }
    throw new Error(`Node of kind ${node.kind} is not an expected Expression`);
}

function getAssignedVariable(
    varName: string,
    params: Variable[],
    scope: Variable[]): AssignedVariable | undefined {

    const paramVar = find(params, Variable.nameMatcher(varName));
    if (paramVar) {
        return {
            assignedVar: paramVar,
            parameter: true,
        };
    }

    const scopeVar = find(scope, Variable.nameMatcher(varName));
    return scopeVar && {
        assignedVar: scopeVar,
        parameter: false,
    };
}
