import * as ts from "typescript";
import {Type, typeFromTSType} from "./Types";

export class Variable {
    private constructor(private name: string, private type: Type) { }

    static fromTsSymbol(symbol: ts.Symbol, checker: ts.TypeChecker) {
        const name = symbol.getName();
        const type = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);

        return new Variable(name, typeFromTSType(type));
    }
}