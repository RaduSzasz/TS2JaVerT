import { compact, defaults } from "lodash";
import { Assertion } from "../../assertions/Assertion";
import { FunctionObject } from "../../assertions/FunctionObject";
import { FunctionSpec } from "../../assertions/FunctionSpec";
import { SeparatingConjunctionList } from "../../assertions/SeparatingConjunctionList";
import { Class } from "../Class";
import { Program } from "../Program";
import { Type, typeFromParamAndReturnType } from "../Types";
import { Variable } from "../Variable";

export interface SpecOptions {
    includeProtoConstructorAssertions: boolean;
    includeThisAssertion: boolean;
    omittedParams: string[];
}

const DEFAULT_SPEC_OPTIONS: SpecOptions = {
    includeProtoConstructorAssertions: true,
    includeThisAssertion: true,
    omittedParams: [],
};

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
                : name);
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

    public generateAssertion(options: Partial<SpecOptions> = DEFAULT_SPEC_OPTIONS): FunctionSpec {
        const pre = this.generatePreCondition(options);
        const post = this.generatePostCondition(options);

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

    protected generatePreCondition(options: Partial<SpecOptions> = DEFAULT_SPEC_OPTIONS): SeparatingConjunctionList {
        if (!this.capturedVars) {
            throw new Error("Can not generate pre-condition before determining captured vars");
        }

        options = defaults(options, DEFAULT_SPEC_OPTIONS);
        const protoAssertion = options.includeProtoConstructorAssertions &&
            this.program.getAllProtosAndConstructorsAssertion(this.classVar, true);

        const paramAssertions: Assertion[] = this.params.map((param) => param.toAssertion());

        const capturedVariableAssertions: Assertion[]
            = this.capturedVars.map((capturedVar) => capturedVar.toAssertionExtractingScope());

        const thisAssertion = this.classVar && options.includeThisAssertion &&
            this.classVar.getAssertion("this");

        return new SeparatingConjunctionList(compact([
            protoAssertion,
            thisAssertion,
            ...paramAssertions,
            ...capturedVariableAssertions,
        ]));
    }

    protected generatePostCondition(options: Partial<SpecOptions> = DEFAULT_SPEC_OPTIONS) {
        const { capturedVars, classVar, params, program, returnType } = this;
        const {
            omittedParams,
            includeProtoConstructorAssertions,
            includeThisAssertion,
        } = defaults(options, DEFAULT_SPEC_OPTIONS);

        if (!capturedVars) {
            throw new Error("Can not generate post-condition before determining captured vars");
        }

        const protoAssertion = includeProtoConstructorAssertions &&
            program.getAllProtosAndConstructorsAssertion(this.classVar);

        const capturedVariableAssertions: Assertion[]
            = capturedVars.map((capturedVar) => capturedVar.toAssertionExtractingScope());

        const paramAssertions: Assertion[]
            = params
                .filter((param) => omittedParams.indexOf(param.name) === -1)
                .map((param) => Variable.logicalVariableFromVariable(param).toAssertion());

        const ret = Variable.newReturnVariable(returnType);

        return (thisAssertion: Assertion | undefined) => {
            if (includeThisAssertion && ((thisAssertion && !classVar) || (classVar && !thisAssertion))) {
                throw new Error("Class variable and this assertion must both be either falsey or truthy");
            }
            return new SeparatingConjunctionList(compact([
                protoAssertion,
                omittedParams.indexOf("this") === -1 && includeThisAssertion && thisAssertion,
                ...paramAssertions,
                ...capturedVariableAssertions,
                omittedParams.indexOf("ret") === -1 && ret.toAssertion(),
            ]));
        };
    }
}
