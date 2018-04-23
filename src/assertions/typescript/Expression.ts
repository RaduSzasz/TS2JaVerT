import * as ts from "typescript";
import { find, flatten, uniq } from "lodash";
import { Variable } from "./Variable";


export function visitExpressionForCapturedVars(node: ts.Node, outerScope: Variable[], currentScope: Variable[]): Variable[] {
    const visitExpressionPreservingTypeEnvs = (node: ts.Node) => visitExpressionForCapturedVars(node, outerScope, currentScope);
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
        return [];
    } else if (ts.isIdentifier(node)) {
        if (find(currentScope, Variable.nameMatcher(node.text))) {
            return []
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
        return uniq(flatten(node.properties.map(property => {
            if (ts.isPropertyAssignment(property)) {
                return visitExpressionPreservingTypeEnvs(property)
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
            ...flatten(node.arguments.map(visitExpressionPreservingTypeEnvs))
        ]);
    } else {
        throw new Error(`Node of kind ${node.kind} is not an expected Expression`);
    }
}
