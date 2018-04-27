import { find, flatten, uniq } from "lodash";
import * as ts from "typescript";
import { Function } from "./Function";
import { Program } from "./Program";
import { visitStatementToFindCapturedVars, visitStatementToFindDeclaredVars } from "./Statement";
import { Variable } from "./Variable";

export function visitExpressionForCapturedVars(
    node: ts.Node,
    outerScope: Variable[],
    currentScope: Variable[],
    program: Program,
): Variable[] {

    const visitExpressionPreservingTypeEnvs
        = (n: ts.Node) => visitExpressionForCapturedVars(n, outerScope, currentScope, program);
    if (!node || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
        return [];
    } else if (ts.isIdentifier(node)) {
        if (find(currentScope, Variable.nameMatcher(node.text))) {
            return [];
        }
        const capturedVar = find(outerScope, Variable.nameMatcher(node.text));
        if (!capturedVar) {
            throw new Error(`Identifier not present in current or outer scope.`);
        }
        return [capturedVar];
    } else if (ts.isPropertyAccessExpression(node)) {
        // node represents something like a.b; not a["b"]
        return visitExpressionPreservingTypeEnvs(node.expression);
    } else if (ts.isElementAccessExpression(node)) {
        // node represents something like a["b"] or a[x]
        return uniq([
            ...visitExpressionPreservingTypeEnvs(node.expression),
            ...visitExpressionPreservingTypeEnvs(node.argumentExpression),
        ]);
    } else if (ts.isBinaryExpression(node)) {
        return uniq([
            ...visitExpressionPreservingTypeEnvs(node.left),
            ...visitExpressionPreservingTypeEnvs(node.right),
        ]);
    } else if (ts.isObjectLiteralExpression(node)) {
        return uniq(flatten(node.properties.map((property) => {
            if (ts.isPropertyAssignment(property)) {
                return visitExpressionPreservingTypeEnvs(property);
            } else {
                throw new Error(`Object literal expression contains child of kind ${property.kind}`);
            }
        })));
    } else if (ts.isPropertyAssignment(node)) {
        // x: 3
        return visitExpressionPreservingTypeEnvs(node.initializer);
    } else if (ts.isCallExpression(node)) {
        /// f(a, b), where f, a, b can all be more complicated expressions
        return uniq([
            ...visitExpressionPreservingTypeEnvs(node.expression),
            ...flatten(node.arguments.map(visitExpressionPreservingTypeEnvs)),
        ]);
    } else if (ts.isFunctionExpression(node)) {
        const func: Function = Function.fromTSNode(node, program, "NameTBD");
        const funcStatements = node.body.statements;

        const declaredWithinFunc: Variable[] = flatten(
            funcStatements.map((statement) => visitStatementToFindDeclaredVars(statement, program))
        );

        const withinFuncOuterScope = [...outerScope, ...currentScope];
        const withinFuncCurrScope = [...func.getParams(), ...declaredWithinFunc];
        const capturedVars = uniq(flatten(
            funcStatements.map((statement) => visitStatementToFindCapturedVars(
                statement,
                program,
                withinFuncOuterScope,
                withinFuncCurrScope,
            ))));

        func.setCapturedVars(capturedVars);
        return capturedVars;
    } else {
        throw new Error(`Node of kind ${node.kind} is not an expected Expression`);
    }
}
