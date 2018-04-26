import * as ts from "typescript";
import { ObjectLiteral } from "./ObjectLiteral";

export class Interface {
    public readonly name: string;
    private objectLiteral: ObjectLiteral;

    constructor(node: ts.InterfaceDeclaration, checker: ts.TypeChecker) {
        const interfaceSymbol = checker.getSymbolAtLocation(node.name);
        this.name = interfaceSymbol.name;
        this.objectLiteral = new ObjectLiteral(interfaceSymbol.members, checker);
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
