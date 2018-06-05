import { Assertion } from "./Assertion";
import { SeparatingConjunctionList } from "./SeparatingConjunctionList";

export interface FunctionSpec {
    pre: SeparatingConjunctionList;
    post: (thisAssertion: Assertion | undefined) => SeparatingConjunctionList;
    id: string;
}

export function printFunctionSpec(funcSpec: FunctionSpec) {
    const pre = funcSpec.pre.toDisjunctiveNormalForm();

    const specs = pre.disjuncts.map((preAssertion) => ({
            post: funcSpec.post(preAssertion.getThisAssertion())
                .toDisjunctiveNormalForm()
                .disjuncts
                .map((d) => d.toString())
                .join(";\n"),
            pre: preAssertion,
        }));

    return `
        @id ${funcSpec.id}
        ${specs.map((spec) => `
        @pre ${spec.pre.toString()}
        @post ${spec.post.toString()}`).join("\n")}
`;
}
