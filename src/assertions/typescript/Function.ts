import * as ts from "typescript";
import {Type, typeFromParamAndReturnType, typeFromTSType} from "./Types";
import { Variable } from "./Variable";

export class Function extends Variable {
    private capturedVars: Variable[];

    private constructor(private returnType: Type,
                        private params: Variable[],
                        name: string) {
        super(name, typeFromParamAndReturnType(params, returnType));
    }

    public static fromFunctionDeclaration(node: ts.FunctionDeclaration, checker: ts.TypeChecker): Function {
        const signature = checker.getSignatureFromDeclaration(node);
        const name = checker.getSymbolAtLocation(node.name).name;
        const tsReturnType: ts.Type = checker.getReturnTypeOfSignature(signature);
        const returnType = typeFromTSType(tsReturnType);
        const params: Variable[] = signature
            .getParameters()
            .map(param => Variable.fromTsSymbol(param, checker));

        return new Function(returnType, params, name);
    }

    getReturnType(): Type {
        return this.returnType;
    }

    isNamed(): boolean {
        // != instead of !== on purpose to cover for null and ""
        return this.name != undefined;
    }

    getName(): string {
        return this.name;
    }
}
