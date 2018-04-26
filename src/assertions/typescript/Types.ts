import * as ts from "typescript";
import {Variable} from "./Variable";

export enum TypeFlags {
    Any = 1,
    Void = 2,
    Boolean = 4,
    Number = 8,
    String = 16,
    ObjectLiteral = 32,
    Class = 64,
    Interface = 128,
    Union = 256,
    Function = 512,
}

export interface Type {
    typeFlag: TypeFlags;
}

export interface PrimitiveType extends Type {
    typeFlag: TypeFlags.Void | TypeFlags.Number | TypeFlags.String | TypeFlags.Boolean;
}
export function isPrimitiveType(type: Type): type is PrimitiveType {
    return type.typeFlag === TypeFlags.Number ||
        type.typeFlag === TypeFlags.String ||
        type.typeFlag === TypeFlags.Boolean ||
        type.typeFlag === TypeFlags.Void;
}

export interface AnyType extends Type {
    typeFlag: TypeFlags.Any;
}
export function isAnyType(type: Type): type is AnyType {
    return type.typeFlag === TypeFlags.Any;
}

export interface InterfaceType extends Type {
    typeFlag: TypeFlags.Interface;
    name: string;
}
export function isInterfaceType(type: Type): type is InterfaceType {
    return type.typeFlag === TypeFlags.Interface;
}

export interface ClassType extends Type {
    typeFlag: TypeFlags.Class;
    name: string;
}

// Name is present if the object is an interface.
export interface ObjectLiteral extends Type {
    typeFlag: TypeFlags.ObjectLiteral;
    name?: string;
}

export interface FunctionType extends Type {
    typeFlag: TypeFlags.Function;
    params: Variable[];
    returnType: Type;
}

export interface UnionType extends Type {
    typeFlag: TypeFlags.Union;
    types: Type[];
}

export function typeFromTSType(tsType: ts.Type): Type {
    if (tsType.flags === ts.TypeFlags.Number) {
        return { typeFlag: TypeFlags.Number };
    } else if (tsType.flags === ts.TypeFlags.String) {
        return { typeFlag: TypeFlags.String };
    } else if (tsType.flags === ts.TypeFlags.Object) {
        const symbol = tsType.symbol;
        if (symbol.flags === ts.SymbolFlags.TypeLiteral) {
            /// TODO: Store type literal
        } else if (symbol.flags === ts.SymbolFlags.Interface) {
            return {
                name: symbol.getName(),
                typeFlag: TypeFlags.Interface,
            } as InterfaceType;
        } else if (symbol.flags === ts.SymbolFlags.Class) {
            // TODO: Store class
        }
    }
}

export function typeFromParamAndReturnType(params: Variable[], returnType: Type): FunctionType {
    return {
        params,
        returnType,
        typeFlag: TypeFlags.Function,
    };
}
