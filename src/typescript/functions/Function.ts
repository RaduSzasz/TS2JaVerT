import { compact } from "lodash";
import * as uuid from "uuid";
import { Assertion } from "../../assertions/Assertion";
import { FunctionSpec } from "../../assertions/FunctionSpec";
import { FunctionObject } from "../../assertions/FunctionObject";
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

    private capturedVars: Variable[] | undefined;
    private readonly id: string;

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

    public getCapturedVars(): Variable[] | undefined {
        return this.capturedVars && [...this.capturedVars];
    }

    protected generatePreCondition(): Assertion {
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

    private generatePostCondition(pre: Assertion): Assertion {
        const ret = Variable.newReturnVariable(this.returnType);
        return new SeparatingConjunctionList([pre, ret.toAssertion()]);
    }
}
