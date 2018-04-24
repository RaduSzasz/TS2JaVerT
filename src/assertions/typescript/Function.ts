import * as ts from "typescript";
import * as uuid from "uuid";
import { Assertion } from "../Assertion";
import { FunctionSpec } from "../FunctionSpec";
import { Type, typeFromParamAndReturnType, typeFromTSType } from "./Types";
import { Variable } from "./Variable";

export class Function extends Variable {

    public static fromFunctionDeclaration(node: ts.FunctionDeclaration, checker: ts.TypeChecker): Function {
        const signature = checker.getSignatureFromDeclaration(node);
        const name = checker.getSymbolAtLocation(node.name).name;
        const tsReturnType: ts.Type = checker.getReturnTypeOfSignature(signature);
        const returnType = typeFromTSType(tsReturnType);
        const params: Variable[] = signature
            .getParameters()
            .map((param) => Variable.fromTsSymbol(param, checker));

        return new Function(returnType, params, name);
    }

    private capturedVars: Variable[];

    private constructor(private returnType: Type,
                        private params: Variable[],
                        name: string) {
        super(name, typeFromParamAndReturnType(params, returnType));
    }

    public getReturnType(): Type {
        return this.returnType;
    }

    public isNamed(): boolean {
        return this.name !== undefined && this.name !== null && this.name !== "";
    }

    public getName(): string {
        return this.name;
    }

    public getParams(): Variable[] {
        return this.params;
    }

    public setCapturedVars(capturedVars: Variable[]) {
        this.capturedVars = capturedVars;
    }

    public generateAsserion(): FunctionSpec {
        const pre: Assertion = this.generatePreCondition();
        const post: Assertion = this.generatePostCondition(pre);
        return {
            post,
            pre,
            uuid: uuid.v4(),
        };
    }

    private generatePreCondition(): Assertion {
        const paramAssertions: Assertion[] = this.params.map(param => param.toAssertion());

        // TODO: Fill this in
        return undefined;
    }

    private generatePostCondition(pre: Assertion): Assertion {
        // TODO: Fill this guy in
        return undefined;
    }
}
