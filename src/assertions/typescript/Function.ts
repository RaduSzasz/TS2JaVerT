import { compact } from "lodash";
import * as ts from "typescript";
import * as uuid from "uuid";
import { Assertion } from "../Assertion";
import { FunctionSpec } from "../FunctionSpec";
import { FunctionObject } from "../predicates/FunctionObject";
import { SeparatingConjunctionList } from "../predicates/SeparatingConjunctionList";
import { Class } from "./Class";
import { Program } from "./Program";
import { Type, typeFromParamAndReturnType, typeFromTSType } from "./Types";
import { Variable } from "./Variable";

export class Function extends Variable {
    public static logicalVariableFromFunction(func: Function): Function {
        return new Function(
            func.program,
            func.returnType,
            func.params,
            `#${func.name}`,
            func.classVar,
            func.id);
    }

    public static fromTSNode(
        node: ts.FunctionDeclaration | ts.FunctionExpression | ts.MethodDeclaration,
        program: Program,
        name?: string,
        classVar?: Class,
    ): Function {
        const checker = program.getTypeChecker();
        const signature = checker.getSignatureFromDeclaration(node);
        name = name || checker.getSymbolAtLocation(node.name).name;
        const tsReturnType: ts.Type = checker.getReturnTypeOfSignature(signature);
        const returnType = typeFromTSType(tsReturnType, program);
        const params: Variable[] = signature
            .getParameters()
            .map((param) => Variable.fromTsSymbol(param, program));

        return new Function(program, returnType, params, name, classVar);
    }

    private capturedVars: Variable[];

    private constructor(private program: Program,
                        private returnType: Type,
                        private params: Variable[],
                        name: string,
                        private classVar?: Class,
                        private readonly id?: string,
    ) {
        super(name, typeFromParamAndReturnType(params, returnType));
        this.id = this.id ||
            (this.classVar
                ? `${this.classVar.getName()}_${this.name}`
                : uuid.v4());
    }

    public isFunction(): this is Function {
        return true;
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

    public generateAssertion(): FunctionSpec {
        const pre: Assertion = this.generatePreCondition();
        const post: Assertion = this.generatePostCondition(pre);
        return {
            id: this.id,
            post,
            pre,
        };
    }

    public toAssertion(): Assertion {
        return new FunctionObject(
            this.name,
            this.classVar ? this.id : undefined,
        );
    }

    private generatePreCondition(): Assertion {
        const protoAssertion = this.program.getPrototypeAssertion();
        const paramAssertions: Assertion[] = this.params.map((param) => param.toAssertion());
        const capturedVariableAssertions: Assertion[]
            = this.capturedVars
                    .map((capturedVar) => capturedVar.toAssertionExtractingScope());

        return new SeparatingConjunctionList(compact([
            protoAssertion,
            (this.classVar ? this.classVar.getAssertion("this") : undefined),
            ...paramAssertions,
            ...capturedVariableAssertions,
        ]));
    }

    private generatePostCondition(pre: Assertion): Assertion {
        const ret = Variable.newReturnVariable(this.returnType);
        return new SeparatingConjunctionList([pre, ret.toAssertion()]);
    }
}
