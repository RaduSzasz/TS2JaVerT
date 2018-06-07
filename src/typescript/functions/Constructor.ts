import { compact } from "lodash";
import { Assertion, isJSObject } from "../../assertions/Assertion";
import { Disjunction } from "../../assertions/Disjunction";
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
        super(program, returnType, params, name, undefined, classVar);
    }

    public generateAssertion(): FunctionSpec {
        const regularFunctionSpec = super.generateAssertion();
        return {
            id: regularFunctionSpec.id,
            post: this.generatePost(),
            pre: this.generatePre(),
        };
    }

    private generatePre(): SeparatingConjunctionList {
        const { classVar } = this;
        if (!classVar) {
            throw new Error("Constructors must have associated class variable. Something went wrong!");
        }
        const regularFunctionPre = super.generatePreCondition({
            includeThisAssertion: false,
        });

        return new SeparatingConjunctionList([
            new Disjunction(classVar.getDescendantProtosSet().map(
                    (proto) => new JSObject("this", proto),
                )),
            new EmptyFields("this", EMPTY_SET),
            regularFunctionPre,
        ]);
    }

    private generatePost(): (thisAssertion: Assertion | undefined) => SeparatingConjunctionList {
        const { classVar } = this;
        if (!classVar) {
            throw new Error("Constructors must have associated class variable. Something went wrong!");
        }
        const regularPostCondition = this.generatePostCondition({
            includeThisAssertion: false,
        })(undefined);

        return (thisAssertion: Assertion | undefined) => {
            if (thisAssertion && isJSObject(thisAssertion)) {
                return new SeparatingConjunctionList(compact([
                    classVar.getExactAssertion("this", thisAssertion.proto),
                    regularPostCondition,
                ]));
            }
            throw new Error("This assertion was not JSObject for constructor post");
        };
    }
}
