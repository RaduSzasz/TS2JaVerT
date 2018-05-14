import { flatMap, uniq } from "lodash";
import * as ts from "typescript";
import * as uuid from "uuid";
import { Class } from "../Class";
import { Program } from "../Program";
import { visitStatementToFindCapturedVars, visitStatementToFindDeclaredVars } from "../Statement";
import { Type, typeFromTSType } from "../Types";
import { Variable } from "../Variable";
import { Constructor } from "./Constructor";
import { Function } from "./Function";

export function createAndAnalyseFunction(
    node: ts.FunctionDeclaration | ts.FunctionExpression | ts.MethodDeclaration | ts.ConstructorDeclaration,
    program: Program,
    outerScope?: Variable[],
    callback?: (funcVar: Function) => void,
    classVar?: Class,
): Function {
    const checker = program.getTypeChecker();
    const signature = checker.getSignatureFromDeclaration(node);
    if (!signature) {
        throw new Error("Cannot create Function! Unable to retrieve signature");
    }
    const name = getFunctionName(node, program);
    const tsReturnType: ts.Type = checker.getReturnTypeOfSignature(signature);
    const returnType = typeFromTSType(tsReturnType, program);
    const params: Variable[] = signature
        .getParameters()
        .map((param) => Variable.fromTsSymbol(param, program));

    const funcVar = createFunctionInstance(
        node,
        program,
        returnType,
        params,
        name,
        classVar,
    );

    if (outerScope) {
        setCapturedVars(funcVar, program, outerScope, node);
    }
    if (callback) {
        callback(funcVar);
    }

    return funcVar;
}

export function setCapturedVars(
    func: Function,
    program: Program,
    outerScope: Variable[],
    node: ts.FunctionDeclaration | ts.FunctionExpression | ts.MethodDeclaration | ts.ConstructorDeclaration,
) {
    if (!node.body) {
        throw new Error("Cannot check function captured variables. No body associated with the function");
    }
    const statements = node.body.statements;
    const declaredWithinFunc = flatMap(statements,
        (statement) => visitStatementToFindDeclaredVars(statement, program));

    const withinFuncCurrScope = [...func.getParams(), ...declaredWithinFunc];
    const capturedVars: Variable[] = uniq(
        flatMap(statements, (statement) => visitStatementToFindCapturedVars(
            statement,
            program,
            outerScope,
            withinFuncCurrScope,
        )));
    func.setCapturedVars(capturedVars);
}

function createFunctionInstance(
    node: ts.FunctionDeclaration | ts.FunctionExpression | ts.MethodDeclaration | ts.ConstructorDeclaration,
    program: Program,
    returnType: Type,
    params: Variable[],
    name: string,
    classVar?: Class,
): Function {
    if (ts.isConstructorDeclaration(node)) {
        if (!classVar) {
            throw new Error("Constructors must have associated class variable. Something went wrong!");
        }
        return new Constructor(program, returnType, params, name, classVar);
    }
    return new Function(program, returnType, params, name, classVar);
}

function getFunctionName(
    node: ts.FunctionDeclaration | ts.FunctionExpression | ts.MethodDeclaration | ts.ConstructorDeclaration,
    program: Program,
) {
    if (ts.isConstructorDeclaration(node)) {
        return "constructor";
    } else if (ts.isFunctionExpression(node)) {
        return uuid.v4();
    } else if (node.name) {
        const checker = program.getTypeChecker();
        const nameSymbol = checker.getSymbolAtLocation(node.name);
        if (nameSymbol) {
            return nameSymbol.name;
        }
    }
    throw new Error("Unable to determine name of non-constructor signature");
}
