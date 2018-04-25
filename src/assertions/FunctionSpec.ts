import { Assertion } from "./Assertion";

export interface FunctionSpec {
    pre: Assertion;
    post: Assertion;
    uuid: string;
}

export function printFunctionSpec(funcSpec: FunctionSpec) {
    return `
        @id ${funcSpec.uuid}

        @pre ${funcSpec.pre.toString()}
        @post ${funcSpec.post.toString()}
`;
}
