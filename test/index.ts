import { HardcodedStringAssertion } from "../src/assertions/HardcodedStringAssertion";
import { ObjectPrototype } from "../src/assertions/ObjectPrototype";
import { ScopeAssertion } from "../src/assertions/ScopeAssertion";
import { SeparatingConjunctionList } from "../src/assertions/SeparatingConjunctionList";
import { TypesPredicate } from "../src/assertions/TypesPredicate";
import { Program } from "../src/typescript/Program";
import { TypeFlags } from "../src/typescript/Types";

describe("A suite for checking if we find identifiers in expressions", () => {
    it("should find identifier in return statement", () => {
        const sourceFileName = "test/testPrograms/IdentifierInReturn.ts";

        const program = new Program(sourceFileName, new Map());
        expect(program).toBeTruthy();

        const functions = program.getFunctions();
        expect(functions.length).toBe(1);
        const [func] = functions;
        const funcSpec = func.generateAssertion();
        expect(funcSpec.pre).toBeDefined();
        expect(funcSpec.pre).toEqual(new SeparatingConjunctionList([
            new ObjectPrototype(),
            new ScopeAssertion("y", "#y"),
            new TypesPredicate("#y", TypeFlags.Number),
        ]));
    });

    it("should not consider params as captured vars", () => {
        const sourceFileName = "test/testPrograms/NestedFuncWithCapturedParams.ts";

        const program = new Program(sourceFileName, new Map());
        expect(program).toBeTruthy();
        const functions = program.getFunctions();
        expect(functions.length).toBe(2);
        const [innerFunc, outerFunc] = program.getFunctions();
        expect(outerFunc.getName()).toEqual("f");
        expect(innerFunc.getName()).toEqual("g");
        const outerFuncSpec = outerFunc.generateAssertion();
        expect(outerFuncSpec.pre).toEqual(new SeparatingConjunctionList([
            new ObjectPrototype(),
            new HardcodedStringAssertion(`(x == #x)`),
            new TypesPredicate("#x", TypeFlags.Number),
        ]));
        const innerFuncSpec = innerFunc.generateAssertion();
        expect(innerFuncSpec.pre).toEqual(new SeparatingConjunctionList([
            new ObjectPrototype(),
            new ScopeAssertion("x", "#x"),
            new TypesPredicate("#x", TypeFlags.Number),
        ]));
    });
});
