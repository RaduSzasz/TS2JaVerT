import * as fs from "fs";
import { ScopePredicate } from "../src/assertions/predicates/ScopePredicate";
import { SeparatingConjunctionList } from "../src/assertions/predicates/SeparatingConjunctionList";
import { TypesPredicate } from "../src/assertions/predicates/TypesPredicate";
import { Program } from "../src/assertions/typescript/Program";
import { TypeFlags } from "../src/assertions/typescript/Types";

describe("A suite for checking if we find identifiers in expressions", () => {
    it("should find identifier in return statement", () => {
        const sourceFileName = "test/testPrograms/IdentifierInReturn.ts";

        const program = new Program(sourceFileName);
        expect(program).toBeTruthy();

        const functions = program.getFunctions();
        expect(functions.length).toBe(1);
        const [func] = functions;
        const funcSpec = func.generateAssertion();
        expect(funcSpec.pre).toBeDefined();
        expect(funcSpec.pre).toEqual(new SeparatingConjunctionList([
            new SeparatingConjunctionList([
                new ScopePredicate("y", "#y"),
                new TypesPredicate("#y", TypeFlags.Number),
            ]),
        ]));
    });

    it("should not consider params as captured vars", () => {
        const sourceFileName = "test/testPrograms/NestedFuncWithCapturedParams.ts";

        const program = new Program(sourceFileName);
        expect(program).toBeTruthy();
        const functions = program.getFunctions();
        expect(functions.length).toBe(2);
        const [outerFunc, innerFunc] = program.getFunctions();
        expect(outerFunc.getName()).toEqual("f");
        expect(innerFunc.getName()).toEqual("g");
        const outerFuncSpec = outerFunc.generateAssertion();
        expect(outerFuncSpec.pre).toEqual(new SeparatingConjunctionList([
            new TypesPredicate("x", TypeFlags.Number),
        ]));
        const innerFuncSpec = innerFunc.generateAssertion();
        expect(innerFuncSpec.pre).toEqual(new SeparatingConjunctionList([
            new SeparatingConjunctionList([
                new ScopePredicate("x", "#x"),
                new TypesPredicate("#x", TypeFlags.Number),
            ]),
        ]));
    });
});
