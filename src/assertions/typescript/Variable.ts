import * as ts from "typescript";
import { Type, typeFromTSType } from "./Types";

export class Variable {
    constructor(protected name: string, protected type: Type) { }

    static fromTsSymbol(symbol: ts.Symbol, checker: ts.TypeChecker) {
        const name = symbol.getName();
        const type = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);

        return new Variable(name, typeFromTSType(type));
    }

    static fromPropertyDeclaration(propertyDeclaration: ts.PropertyDeclaration, checker: ts.TypeChecker): Variable {
        const propertyType: ts.Type = checker.getTypeAtLocation(propertyDeclaration);
        const nameSymbol = checker.getSymbolAtLocation(propertyDeclaration.name);

        return new Variable(nameSymbol.name, typeFromTSType(propertyType));
    }
}