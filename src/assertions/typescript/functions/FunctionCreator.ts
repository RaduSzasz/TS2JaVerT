import { flatMap, uniq } from "lodash";
import * as ts from "typescript";
import { Class } from "../Class";
import { Program } from "../Program";
import { visitStatementToFindCapturedVars, visitStatementToFindDeclaredVars } from "../Statement";
import { Type, typeFromTSType } from "../Types";
import { Variable } from "../Variable";
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
    const name = ts.isConstructorDeclaration(node)
        ? "constructor"
        : checker.getSymbolAtLocation(node.name).name;

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
    return new Function(program, returnType, params, name, classVar);

    // TODO: Add constructor and method here
}
