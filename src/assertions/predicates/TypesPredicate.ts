import {Assertion} from "../Assertion";
import {TypeFlags} from "../typescript/Types";

const PRIMITIVE_TYPE_NAMES = {
    [TypeFlags.Number]: "Num",
    [TypeFlags.Boolean]: "Bool",
    [TypeFlags.String]: "Str",
    [TypeFlags.Void]: "Undef",
    [TypeFlags.Undefined]: "Undef",
};
type PrimitiveType = TypeFlags.Number | TypeFlags.Boolean | TypeFlags.String | TypeFlags.Undefined | TypeFlags.Void;

export class TypesPredicate implements Assertion {
    constructor(
        private name: string,
        private typeFlag: PrimitiveType,
    ) { }

    public toString() {
        return `types(${this.name}: ${PRIMITIVE_TYPE_NAMES[this.typeFlag]})`;
    }
}
