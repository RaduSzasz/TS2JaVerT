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
    public static logicalVariableFromFunction(func: Function): Function {
        return new Function(
            func.program,
            func.returnType,
            func.params,
            `#${func.name}`,
            func.classVar,
            func.id);
    }

    public readonly id: string;
    private capturedVars: Variable[] | undefined;

    constructor(protected program: Program,
                private returnType: Type,
                private params: Variable[],
                name: string,
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

    public generateAssertion(): FunctionSpec {
        const pre = this.generatePreCondition();
        const post = this.generatePostCondition();

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

    public getCapturedVars(): Variable[] | undefined {
        return this.capturedVars && [...this.capturedVars];
    }

    protected generatePreCondition(): SeparatingConjunctionList {
        if (!this.capturedVars) {
            throw new Error("Can not generate pre-condition before determining captured vars");
        }
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

    protected generatePostCondition(): (thisAssertion: Assertion | undefined) => SeparatingConjunctionList {
        if (!this.capturedVars) {
            throw new Error("Can not generate post-condition before determining captured vars");
        }
        const protoAssertion = this.program.getPrototypeAssertion();
        const paramAssertions: Assertion[]
            = this.params
                .map((param) => Variable.logicalVariableFromVariable(param).toAssertion());
        const capturedVariableAssertions: Assertion[]
            = this.capturedVars
                .map((capturedVar) => capturedVar.toAssertionExtractingScope());
        const ret = Variable.newReturnVariable(this.returnType);
        return (thisAssertion: Assertion | undefined) => {
            if ((thisAssertion && !this.classVar) || (this.classVar && !thisAssertion)) {
                throw new Error("Class variable and this assertion must both be either falsey or truthy");
            }
            return new SeparatingConjunctionList(compact([
                protoAssertion,
                thisAssertion,
                ...paramAssertions,
                ...capturedVariableAssertions,
                ret.toAssertion(),
            ]));
        };
    }
}
