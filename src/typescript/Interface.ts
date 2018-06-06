import * as ts from "typescript";
import { ObjectLiteral } from "./ObjectLiteral";
import { Program } from "./Program";

export class Interface {
    public readonly name: string;
    private objectLiteral: ObjectLiteral;

    constructor(node: ts.InterfaceDeclaration, program: Program) {
        const checker = program.getTypeChecker();
        const interfaceSymbol = checker.getSymbolAtLocation(node.name);
        if (!interfaceSymbol || !interfaceSymbol.members) {
            throw new Error("Failure why creating Interface! Cannot retrieve symbol");
        }
        this.name = interfaceSymbol.name;
        this.objectLiteral = new ObjectLiteral(interfaceSymbol.members, program);
    }

    public getName(): string {
        return this.name;
    }

    public toPredicate(): string {
        const o = "o";
        return `
        @pred ${this.name}(${o}):
            ${this.objectLiteral
            .toAssertion(o)
            .toDisjunctiveNormalForm().disjuncts
            .map((def) => def.toString())
            .join(",\n")};
`;
    }

}
