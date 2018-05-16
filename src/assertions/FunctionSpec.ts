import { flatMap } from "lodash";
import { SeparatingConjunctionList } from "./SeparatingConjunctionList";

export interface FunctionSpec {
    pre: SeparatingConjunctionList;
    post: SeparatingConjunctionList;
    id: string;
}

export function printFunctionSpec(funcSpec: FunctionSpec) {
    const pre = funcSpec.pre.toDisjunctiveNormalForm();
    const post = funcSpec.post.toDisjunctiveNormalForm();

    const specs = flatMap(pre.disjuncts, (preAssertion) =>
        post.disjuncts.map((postAssertion) => ({
            post: postAssertion,
            pre: preAssertion,
        })),
    );

    return `
        @id ${funcSpec.id}

        ${specs.map((spec) => `
            @pre ${spec.pre.toString()}
            @post ${spec.post.toString()}
`)}
`;
}
