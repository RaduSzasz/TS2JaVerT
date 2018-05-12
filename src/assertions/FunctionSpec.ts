import { Assertion } from "./Assertion";

export interface FunctionSpec {
    pre: Assertion;
    post: Assertion;
    id: string;
}

export function printFunctionSpec(funcSpec: FunctionSpec) {
    return `
        @id ${funcSpec.id}

        @pre ${funcSpec.pre.toString()}
        @post ${funcSpec.post.toString()}
`;
}
