import { compact, difference, find, flatMap, map, uniq } from "lodash";
import * as ts from "typescript";
import { Function } from "./functions/Function";
import { createAndAnalyseFunction } from "./functions/FunctionCreator";
import { Program } from "./Program";
import { visitStatementToFindAssignments } from "./Statement";
import { Variable } from "./Variable";

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
    outerScope: Variable[],
    currentScope: Variable[],
    program: Program): Variable[] {

    const visitExpression = (n: ts.Node | undefined) =>
        visitExpressionToFindAssignments(n, outerScope, currentScope, program);

    if (!node ||
        ts.isStringLiteral(node) ||
        ts.isNumericLiteral(node) ||
        ts.isIdentifier(node) ||
        node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword ||
        (ts.isToken(node) && node.kind === ts.SyntaxKind.ThisKeyword)) {

        return [];
    } else if (ts.isPropertyAccessExpression(node)) {
        return visitExpression(node.expression);
    } else if (ts.isElementAccessExpression(node)) {
        return visitExpression(node.expression);
    } else if (ts.isObjectLiteralExpression(node)) {
        return uniq(flatMap(node.properties, (property) => {
            if (ts.isPropertyAssignment(property)) {
                return visitExpression(property);
            } else {
                throw new Error(`Object literal expression contains child of kind ${property.kind}`);
            }
        }));
    } else if (ts.isPropertyAssignment(node)) {
        return visitExpression(node.initializer);
    } else if (ts.isCallExpression(node)) {
        return uniq([
            ...visitExpression(node.expression),
            ...flatMap(node.arguments, visitExpression),
        ]);
    } else if (ts.isParenthesizedExpression(node)) {
        return visitExpression(node.expression);
    } else if (ts.isNewExpression(node)) {
        if (node.arguments) {
            return flatMap(node.arguments, visitExpression);
        } else {
            throw new Error("New expression had no args. When does this happen?");
        }
    } else if (ts.isAsExpression(node)) {
        return visitExpression(node.expression);
    } else if (ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isIdentifier(node.left)
    ) {
        const assignedVar = find(currentScope, Variable.nameMatcher(node.left.text))
            || find(outerScope, Variable.nameMatcher(node.left.text));
        if (!assignedVar) {
            throw new Error(`Cannot find ${node.left.text} in scope`);
        }
        return uniq([assignedVar, ...visitExpression(node.right)]);
    } else if (ts.isBinaryExpression(node)) {
        return uniq([
            ...visitExpression(node.left),
            ...visitExpression(node.right),
        ]);
    } else if (ts.isFunctionExpression(node)) {
        visitStatementToFindAssignments(node.body, program, outerScope, currentScope);
        return [];
    }
    throw new Error(`Node of kind ${node.kind} is not an expected Expression`);
}
