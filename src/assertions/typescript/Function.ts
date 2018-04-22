import * as ts from "typescript";
import { Type, typeFromTSType } from "./Types";
import { Variable } from "./Variable";
import { visitStatement } from "./Statement";

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
