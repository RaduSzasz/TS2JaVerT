import * as ts from "typescript";
import { ObjectLiteral } from "./ObjectLiteral";

export class Interface {
    public readonly name: string;
    private objectLiteral: ObjectLiteral;

    constructor(node: ts.InterfaceDeclaration, program: ts.Program) {
        const checker = program.getTypeChecker();
        const interfaceSymbol = checker.getSymbolAtLocation(node.name);
        this.name = interfaceSymbol.name;
        this.objectLiteral = new ObjectLiteral(interfaceSymbol.members, program);
    }

    public getName(): string {
        return this.name;
    }

    public toPredicate(): string {
        const o = "o";
        return `
            ${this.name}(${o}) :
                ${this.objectLiteral.toAssertion(o)}
`;
    }

}
