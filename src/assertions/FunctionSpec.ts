import { flatMap } from "lodash";
import { Assertion } from "./Assertion";
import { SeparatingConjunctionList } from "./SeparatingConjunctionList";

export interface FunctionSpec {
    pre: SeparatingConjunctionList;
    post: (thisAssertion: Assertion | undefined) => SeparatingConjunctionList;
    id: string;
}

export function printFunctionSpec(funcSpec: FunctionSpec) {
    const pre = funcSpec.pre.toDisjunctiveNormalForm();

    const specs = flatMap(pre.disjuncts, (preAssertion) =>
        funcSpec.post(preAssertion.getThisAssertion()).toDisjunctiveNormalForm().disjuncts
            .map((postAssertion) => ({
                post: postAssertion,
                pre: preAssertion,
            })),
    );

    return `
        @id ${funcSpec.id}

        ${specs.map((spec) => `
        @pre ${spec.pre.toString()}
        @post ${spec.post.toString()}`)}
`;
}
