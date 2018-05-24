import { EMPTY_SET, EmptyFields } from "../../assertions/EmptyFields";
import { FunctionSpec } from "../../assertions/FunctionSpec";
import { JSObject } from "../../assertions/JSObject";
import { SeparatingConjunctionList } from "../../assertions/SeparatingConjunctionList";
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
        const regularFunctionSpec = super.generateAssertion();
        return {
            id: regularFunctionSpec.id,
            post: () => this.generatePost(),
            pre: this.generatePre(),
        };
    }

    private generatePre(): SeparatingConjunctionList {
        const classVar = this.classVar;
        if (!classVar) {
            throw new Error("Constructors must have associated class variable. Something went wrong!");
        }
        this.classVar = undefined;
        const regularFunctionPre = super.generatePreCondition();
        this.classVar = classVar;

        return new SeparatingConjunctionList([
            new JSObject("this", classVar.getProtoLogicalVariableName()),
            new EmptyFields("this", EMPTY_SET),
            regularFunctionPre,
        ]);
    }

    private generatePost(): SeparatingConjunctionList {
        const classVar = this.classVar;
        if (!classVar) {
            throw new Error("Constructors must have associated class variable. Something went wrong!");
        }
        this.classVar = undefined;
        const regularPostGenerator = super.generatePostCondition();
        this.classVar = classVar;

        return new SeparatingConjunctionList([
            classVar.getExactAssertion("this"),
            regularPostGenerator(undefined),
        ]);
    }
}
