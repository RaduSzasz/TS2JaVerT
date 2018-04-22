import * as ts from "typescript";
import {Type, typeFromTSType} from "./Types";
import {Variable} from "./Variable";
import {UnexpectedASTNode} from "./exceptions/UnexpectedASTNode";
import { flatten, uniq } from "lodash";

export class Function {
    private constructor(private returnType: Type, private params: Variable[]) {}

    public static fromFunctionDeclaration(node: ts.FunctionDeclaration, checker: ts.TypeChecker): Function {
        console.log("Analysing Function");
        const signature = checker.getSignatureFromDeclaration(node);
        const tsReturnType: ts.Type = checker.getReturnTypeOfSignature(signature);
        const returnType = typeFromTSType(tsReturnType);
        const params: Variable[] = signature
            .getParameters()
            .map(param => Variable.fromTsSymbol(param, checker));
        node.body.forEachChild(node => visitStatement(node, checker));

        return new Function(returnType, params);
    }

    getType(): Type {
        return this.returnType;
    }
}

interface FunctionBodyVariableUsage {
    varsUsed: string[];
    varsDeclared: string[];
}

function visitStatement(node: ts.Node, checker: ts.TypeChecker): FunctionBodyVariableUsage {
    const visitStatementWithChecker = (node: ts.Node) => visitStatement(node, checker);
    if (ts.isVariableStatement(node)) {
        // var x = bla, y = akjshd;
        console.log("VARIABLE STATEMENT");
        return visitStatementWithChecker(node.declarationList);
    }
    else if (ts.isVariableDeclarationList(node)) {
        // x = bla, y = aksjhf
        console.log("VARIABLE DECLARATION LIST");
        return node.getChildren()
            .map(visitStatementWithChecker)
            .reduce((prev: FunctionBodyVariableUsage, curr: FunctionBodyVariableUsage) => {
                return {
                    varsUsed: uniq([...prev.varsUsed, ...curr.varsUsed]),
                    varsDeclared: uniq([...prev.varsDeclared, ...curr.varsDeclared])
                };
            });
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
        console.log("RETURN STATEMENT");
        return {
            varsUsed: node.expression && visitExpression(node.expression),
            varsDeclared: [],
        };
    } else {
        throw new UnexpectedASTNode(node.parent, node);
    }

}

function visitExpression(node: ts.Node): string[] {
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
        // Intentionally left empty
        return [];
    } else if (ts.isIdentifier(node)) {
        console.log("Found identifier " + node.text);
        return [node.text];
    } else if (ts.isPropertyAccessExpression(node)) {
        console.log("PROPERTY ACCESS");
        // node represents something like a.b; not a["b"]
        console.log({ ...node, parent: undefined });
        return visitExpression(node.expression);
    } else if (ts.isElementAccessExpression(node)) {
        // node represents something like a["b"] or a[x]
        return [
            ...visitExpression(node.expression),
            ...visitExpression(node.argumentExpression)
        ];
    } else if (ts.isBinaryExpression(node)) {
        console.log("BINARY EXPRESSION");
        return [
            ...visitExpression(node.left),
            ...visitExpression(node.right)
        ];
    } else if (ts.isObjectLiteralExpression(node)) {
        console.log("OBJECT LITERAL");
        return flatten(node.properties.map(property => {
            if (ts.isPropertyAssignment(property)) {
                return visitExpression(property)
            } else {
                throw new UnexpectedASTNode(node, property);
            }
        }));
    } else if (ts.isPropertyAssignment(node)) {
        // x: 3
        console.log("PROPERTY ASSIGNMENT");
        return visitExpression(node.initializer);
    } else if (ts.isCallExpression(node)) {
        /// f(a, b), where f, a, b can all be more complicated expressions
        return [
            ...visitExpression(node.expression),
            ...flatten(node.arguments.map(visitExpression))
        ];
    } else {
        console.log("UNKNOWN EXPRESSION");
        console.log({ ...node, parent: undefined });
        throw new UnexpectedASTNode(node.parent, node);
    }
}

