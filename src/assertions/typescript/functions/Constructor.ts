import * as uuid from "uuid";
import { Assertion } from "../../Assertion";
import { FunctionSpec } from "../../FunctionSpec";
import { Emp } from "../../predicates/Emp";
import { EMPTY_SET, EmptyFields } from "../../predicates/EmptyFields";
import { JSObject } from "../../predicates/JSObject";
import { SeparatingConjunctionList } from "../../predicates/SeparatingConjunctionList";
import { Class } from "../Class";
import { Program } from "../Program";
import { Type } from "../Types";
import { Variable } from "../Variable";
import { Function } from "./Function";

export class Constructor extends Function {
    constructor(program: Program,
                returnType: Type,
                params: Variable[],
                name: string,
                classVar: Class,
    ) {
        super(program, returnType, params, name, classVar);
    }

    public generateAssertion(): FunctionSpec {
        return { pre: this.generatePre(), post: new Emp(), id: uuid.v4() };
    }

    private generatePre(): Assertion {
        const classVar = this.classVar;
        if (!classVar) {
            throw new Error("Constructors must have associated class variable. Something went wrong!");
        }
        this.classVar = undefined;
        const regularFunctionPre = super.generatePreCondition();
        this.classVar = classVar;

        return new SeparatingConjunctionList([
            regularFunctionPre,
            new JSObject("this", classVar.getProtoLogicalVariableName()),
            new EmptyFields("this", EMPTY_SET),
        ])
    }
}
