import * as ts from "typescript";
import { Assertion } from "../Assertion";
import { Type, typeFromTSType } from "./Types";

export class Variable {
    public static fromTsSymbol(symbol: ts.Symbol, checker: ts.TypeChecker) {
        const name = symbol.getName();
        const type = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);

        return new Variable(name, typeFromTSType(type));
    }

    public static fromPropertyDeclaration(
        propertyDeclaration: ts.PropertyDeclaration,
        checker: ts.TypeChecker,
    ): Variable {
        const propertyType: ts.Type = checker.getTypeAtLocation(propertyDeclaration);
        const nameSymbol = checker.getSymbolAtLocation(propertyDeclaration.name);

        return new Variable(nameSymbol.name, typeFromTSType(propertyType));
    }

    public static nameMatcher(name: string) {
        return (variable: Variable) => variable.name === name;
    }

    constructor(protected name: string, protected type: Type) { }

    public toAssertion(): Assertion {
        // TODO: Implement this :O
        return undefined;
    }
}
