import { Variable } from "../typescript/Variable";
import { AssertionKind } from "./Assertion";
import { AssertionObject } from "./AssertionObject";

export class PiPred extends AssertionObject {
    constructor(
        private readonly obj: string,
        private readonly fieldName: string,
        private readonly logicalVar: Variable,
    ) {
        super(AssertionKind.Pi);
    }

    public toString() {
        const { obj, fieldName, logicalVar } = this;
        return `Pi(${obj}, "${fieldName}", ${logicalVar.name}, _, _, _)`;
    }
}
