import { TypeFlags } from "../typescript/Types";
import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

const PRIMITIVE_TYPE_NAMES = {
    [TypeFlags.Number]: "Num",
    [TypeFlags.Boolean]: "Bool",
    [TypeFlags.String]: "Str",
    [TypeFlags.Void]: "Empty",
    [TypeFlags.Undefined]: "Undefined",
    [TypeFlags.Null]: "Null",
};
export type PrimitiveType =
    TypeFlags.Number
    | TypeFlags.Boolean
    | TypeFlags.String
    | TypeFlags.Undefined
    | TypeFlags.Null
    | TypeFlags.Void;

export class TypesPredicate extends AssertionObject {
    constructor(
        private name: string,
        private typeFlag: PrimitiveType,
    ) {
        super(AssertionKind.Types);
    }

    public toString() {
        return `types(${this.name}: ${PRIMITIVE_TYPE_NAMES[this.typeFlag]})`;
    }
}
