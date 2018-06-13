import { flatMap } from "lodash";
import { Class } from "../../typescript/Class";
import { CURR_SCOPE_LOGICAL } from "../../typescript/Program";
import { AssertionKind } from "../Assertion";
import { AssertionObject } from "../AssertionObject";
import { FunctionPrototype } from "../FunctionPrototype";
import { GlobalObject } from "../GlobalObject";
import { GlobalVar } from "../GlobalVar";
import { ObjectPrototype } from "../ObjectPrototype";

export class AllProtosPredicate extends AssertionObject {
    public static toPredicate(classes: { [className: string]: Class }): string {
        const params = flatMap(classes, (cls) => [
            cls.getConstructorParamName(),
            cls.getProtoParamName(),
            cls.getScopeParamName(),
        ]);

        const assertions = [
            ...flatMap(classes, (cls) => [
                cls.getProtoAndConstructorAssertion(false, true),
                new GlobalVar(cls.name, cls.getConstructorParamName()),
            ]),
            new ObjectPrototype(),
            new FunctionPrototype(),
            new GlobalObject(),
        ];

        return `
        @pred ${AllProtosPredicate.PRED_NAME}(${params.join(", ")}):
            ${assertions.map((a) => a.toString()).join(" *\n\t\t\t")};`;
    }

    private static readonly PRED_NAME = "AllProtosAndConstructors";

    constructor(
        private readonly classes: { [className: string]: Class },
        private readonly currClass: Class | undefined,
    ) {
        super(AssertionKind.AllProtos);
    }

    public toString() {
        const params = flatMap(this.classes, (cls) => [
            cls.getConstructorLogicalVariableName(),
            cls.getProtoLogicalVariableName(),
            this.currClass === cls
                ? CURR_SCOPE_LOGICAL
                : cls.getScopeLogicalVariableName(),
        ]);
        return `${AllProtosPredicate.PRED_NAME}(${params.join(", ")})`;
    }
}
