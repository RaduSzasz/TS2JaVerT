import {Assertion} from "../Assertion";
import {TypeFlags} from "../typescript/Types";

const PRIMITIVE_TYPE_NAMES = {
    [TypeFlags.Number]: "Num",
    [TypeFlags.Boolean]: "Bool",
    [TypeFlags.String]: "Str",
};

export class TypesPredicate implements Assertion {
    constructor(
        private name: string,
        private typeFlag: TypeFlags.Number | TypeFlags.Boolean | TypeFlags.String,
    ) { }

    public toString() {
        return `types(${this.name}: ${PRIMITIVE_TYPE_NAMES[this.typeFlag]})`;
    }
}
