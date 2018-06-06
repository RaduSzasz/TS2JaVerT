import { compact } from "lodash";
import * as uuid from "uuid";
import { Assertion } from "../../assertions/Assertion";
import { FunctionObject } from "../../assertions/FunctionObject";
import { FunctionSpec } from "../../assertions/FunctionSpec";
import { SeparatingConjunctionList } from "../../assertions/SeparatingConjunctionList";
import { Class } from "../Class";
import { Program } from "../Program";
import { Type, typeFromParamAndReturnType } from "../Types";
import { Variable } from "../Variable";

export class Function extends Variable {
    public static logicalVariableFromFunction(func: Function, scopeChain?: string): Function {
        return new Function(
            func.program,
            func.returnType,
            func.params,
            `#${func.name}`,
            scopeChain,
            func.classVar,
            func.id);
    }

    public readonly id: string;
    private capturedVars: Variable[] | undefined;

    constructor(protected program: Program,
                private returnType: Type,
                private params: Variable[],
                name: string,
                private scopeChain?: string,
                protected classVar?: Class,
                id?: string,
    ) {
        super(name, typeFromParamAndReturnType(params, returnType));
        this.id = id ||
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

    public getName(): string {
        return this.name;
    }

    public getParams(): Variable[] {
        return [...this.params];
    }

    public setCapturedVars(capturedVars: Variable[]) {
        this.capturedVars = capturedVars;
    }

    public generateAssertion(omittedParams: string[] = []): FunctionSpec {
        const pre = this.generatePreCondition();
        const post = this.generatePostCondition(omittedParams);

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
            this.scopeChain,
        );
    }

    public getCapturedVars(): Variable[] | undefined {
        return this.capturedVars && [...this.capturedVars];
    }

    protected generatePreCondition(scopeChain: string = ""): SeparatingConjunctionList {
        if (!this.capturedVars) {
            throw new Error("Can not generate pre-condition before determining captured vars");
        }

        scopeChain = scopeChain || (this.classVar ? "$$scope" : "");
        const protoAssertion = this.program.getAllProtosAndConstructorsAssertion(scopeChain);
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

    protected generatePostCondition(omittedParams: string[] = [], scopeChain: string = "") {
        const { capturedVars, classVar, params, program, returnType } = this;
        if (!capturedVars) {
            throw new Error("Can not generate post-condition before determining captured vars");
        }
        scopeChain = scopeChain || (this.classVar ? "$$scope" : "");
        const protoAssertion = program.getAllProtosAndConstructorsAssertion(scopeChain);
        const capturedVariableAssertions: Assertion[]
            = capturedVars
                .map((capturedVar) => capturedVar.toAssertionExtractingScope());
        const paramAssertions: Assertion[]
            = params
                .filter((param) => omittedParams.indexOf(param.name) === -1)
                .map((param) => Variable.logicalVariableFromVariable(param).toAssertion());
        const ret = Variable.newReturnVariable(returnType);
        return (thisAssertion: Assertion | undefined) => {
            if ((thisAssertion && !classVar) || (classVar && !thisAssertion)) {
                throw new Error("Class variable and this assertion must both be either falsey or truthy");
            }
            return new SeparatingConjunctionList(compact([
                protoAssertion,
                omittedParams.indexOf("this") === -1 && thisAssertion,
                ...paramAssertions,
                ...capturedVariableAssertions,
                omittedParams.indexOf("ret") === -1 && ret.toAssertion(),
            ]));
        };
    }
}
