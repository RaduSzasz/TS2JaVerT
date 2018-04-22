import * as ts from "typescript";
import { flatten, uniq } from "lodash";
import { UnexpectedASTNode } from "./exceptions/UnexpectedASTNode";


export function visitExpression(node: ts.Node): string[] {
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
        // Intentionally left empty
        return [];
    } else if (ts.isIdentifier(node)) {
        return [node.text];
    } else if (ts.isPropertyAccessExpression(node)) {
        // node represents something like a.b; not a["b"]
        return visitExpression(node.expression);
    } else if (ts.isElementAccessExpression(node)) {
        // node represents something like a["b"] or a[x]
        return uniq([
            ...visitExpression(node.expression),
            ...visitExpression(node.argumentExpression)
        ]);
    } else if (ts.isBinaryExpression(node)) {
        return uniq([
            ...visitExpression(node.left),
            ...visitExpression(node.right)
        ]);
    } else if (ts.isObjectLiteralExpression(node)) {
        return uniq(flatten(node.properties.map(property => {
            if (ts.isPropertyAssignment(property)) {
                return visitExpression(property)
            } else {
                throw new UnexpectedASTNode(node, property);
            }
        })));
    } else if (ts.isPropertyAssignment(node)) {
        // x: 3
        return visitExpression(node.initializer);
    } else if (ts.isCallExpression(node)) {
        /// f(a, b), where f, a, b can all be more complicated expressions
        return uniq([
            ...visitExpression(node.expression),
            ...flatten(node.arguments.map(visitExpression))
        ]);
    } else {
        throw new UnexpectedASTNode(node.parent, node);
    }
}
