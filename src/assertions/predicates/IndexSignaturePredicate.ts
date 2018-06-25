import { Type } from "../../typescript/Types";
import { Variable } from "../../typescript/Variable";
import { Assertion } from "../Assertion";
import { CustomPredicate } from "../CustomPredicate";
import { DataProp } from "../DataProp";
import { HardcodedStringAssertion } from "../HardcodedStringAssertion";
import { SeparatingConjunctionList } from "../SeparatingConjunctionList";

export class IndexSignaturePredicate {
    constructor(private name: string, private type: Type) { }

    public toAssertion(varName: string, fields: string): Assertion {
        return new CustomPredicate(this.name, varName, fields);
    }

    public getPredicate(): string {
        const o = "o";
        const allFields = "fields";
        const fieldName = "#f";
        const otherFields = "#fields'";
        const logicalVar = new Variable("#v", this.type);

        const def1 = new HardcodedStringAssertion(`(${allFields} == -{ }-)`);

        const def2 = new SeparatingConjunctionList([
            new HardcodedStringAssertion(`(${allFields} == -u- (-{ ${fieldName} }-, ${otherFields}))`),
            new DataProp(o, fieldName, logicalVar, true),
            logicalVar.toAssertion(),
            new CustomPredicate(this.name, o, otherFields),
        ]);
        return `
        @pred ${this.name}(${o}, ${allFields}):
            [base] ${def1.toString()},
            [rec] ${def2.toString()};
`;
    }
}
