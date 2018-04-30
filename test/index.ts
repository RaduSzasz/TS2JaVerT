import * as ts from "typescript";
import { Function } from "../src/assertions/typescript/Function";
import {TypeFlags} from "../src/assertions/typescript/Types";

describe("A suite for checking if we find identifiers in expressions", () => {
    it("should find identifier in return statement", () => {
        const sourceFileName = "test/testPrograms/IdentifierInReturn.ts";
        const program = ts.createProgram([sourceFileName], {});
        expect(program).toBeTruthy();
        const checker = program.getTypeChecker();
        for (const sourceFile of program.getSourceFiles()) {
            if (!sourceFile.isDeclarationFile) {
                expect(sourceFile.fileName).toBe(sourceFileName);
                sourceFile.forEachChild(child => {
                    if (ts.isFunctionDeclaration(child)) {
                        const analyzedFunction = Function.fromTSNode(child, checker);
                        expect(analyzedFunction).toBeTruthy();
                        expect(analyzedFunction.getReturnType()).toEqual({ type: TypeFlags.Number });
                    }
                })
            }
        }
    });
});