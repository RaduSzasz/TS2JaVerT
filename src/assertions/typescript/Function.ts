import * as ts from "typescript";
import {Type, typeFromTSType} from "./Types";
import {Variable} from "./Variable";
import {UnexpectedASTNode} from "./exceptions/UnexpectedASTNode";

export class Function {
    private constructor(private returnType: Type, private params: FunctionParam[]) {}

    public static fromFunctionDeclaration(node: ts.FunctionDeclaration, checker: ts.TypeChecker): Function {
        console.log("Analysing Function");
        const signature = checker.getSignatureFromDeclaration(node);
        const tsReturnType: ts.Type = checker.getReturnTypeOfSignature(signature);
        const returnType = typeFromTSType(tsReturnType);
        const params = signature
            .getParameters()
            .map(param => Variable.fromTsSymbol(param, checker));
        node.body.forEachChild(node => visitStatement(node, checker));

        return new Function(returnType, undefined);
    }

    getType(): Type {
        return this.returnType;
    }


}

function visitStatement(node: ts.Node, checker: ts.TypeChecker) {
    if (ts.isVariableStatement(node)) {
        console.log("VARIABLE STATEMENT");
        visitStatement(node.declarationList, checker);
    }
    else if (ts.isVariableDeclarationList(node)) {
        console.log("VARIABLE DECLARATION LIST");
        node.forEachChild(node => visitStatement(node, checker));
    } else if (ts.isVariableDeclaration(node)) {
        console.log("VARIABLE DECLARATION");
        if (node.initializer) {
            // Over here it's important to look for identifiers
            visitExpression(node.initializer);
        }
        const declaredSymbol = checker.getSymbolAtLocation(node.name);
        Variable.fromTsSymbol(declaredSymbol, checker);
    } else if (ts.isReturnStatement(node)) {
        console.log("RETURN STATEMENT");
        visitExpression(node.expression);
    } else {
        console.log("UNKNOWN STATEMENT");
    }
    console.log("EXITING STATEMENT");
}

function visitExpression(node: ts.Node) {
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
        // Intentionally left empty
    } else if (ts.isIdentifier(node)) {
        console.log("Found identifier " + node.text);
    } else if (ts.isPropertyAccessExpression(node)) {
        console.log("PROPERTY ACCESS");
        // node represents something like a.b; not a["b"]
        console.log({ ...node, parent: undefined });
        visitExpression(node.expression);
    } else if (ts.isElementAccessExpression(node)) {
        // node represents something like a["b"] or a[x]
        visitExpression(node.expression);
        visitExpression(node.argumentExpression);
    } else if (ts.isBinaryExpression(node)) {
        console.log("BINARY EXPRESSION");
        visitExpression(node.left);
        visitExpression(node.right);
    } else if (ts.isObjectLiteralExpression(node)) {
        console.log("OBJECT LITERAL");
        node.properties.map(property => {
            if (ts.isPropertyAssignment(property)) {
                visitExpression(property)
            } else {
                throw new UnexpectedASTNode(node, property);
            }
        });
    } else if (ts.isPropertyAssignment(node)) {
        // x: 3
        console.log("PROPERTY ASSIGNMENT");
        visitExpression(node.initializer);
    } else if (ts.isCallExpression(node)) {
        /// f(a, b), where f, a, b can all be more complicated expressions
        visitExpression(node.expression);
        node.arguments.map(arg => visitExpression(arg));
    }
    else {
        console.log("UNKNOWN EXPRESSION");
        console.log({ ...node, parent: undefined });
    }
    console.log("EXITING EXPRESSION");
}

class FunctionParam {
    constructor(private name: string, private type: Type) {}
}