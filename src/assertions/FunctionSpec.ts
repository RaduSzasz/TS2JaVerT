import { Assertion } from "./Assertion";

export interface FunctionSpec {
    pre: Assertion;
    post: Assertion;
    uuid: string;
}