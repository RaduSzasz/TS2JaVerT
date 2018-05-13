import * as ts from "typescript";
import { Class } from "./Class";
import { ObjectLiteral } from "./ObjectLiteral";
import { Program } from "./Program";
import {Variable} from "./Variable";

export enum TypeFlags {
    Any = 1,
    Void = 2,
    Boolean = 4,
    Number = 8,
    String = 16,
    ObjectLiteralType = 32,
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
    cls: Class;
}
export function isClassType(type: Type): type is ClassType {
    return type.typeFlag === TypeFlags.Class;
}

export interface ObjectLiteralType extends Type {
    typeFlag: TypeFlags.ObjectLiteralType;
    objectLiteralType: ObjectLiteral;
}
export function isObjectLiteralType(type: Type): type is ObjectLiteralType {
    return type.typeFlag === TypeFlags.ObjectLiteralType;
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

export function typeFromTSType(tsType: ts.Type, program: Program): Type {
    switch (tsType.flags) {
        case ts.TypeFlags.Number:
            return { typeFlag: TypeFlags.Number };
        case ts.TypeFlags.Void:
            return { typeFlag: TypeFlags.Void };
        case ts.TypeFlags.String:
            /// Not sure if this is what we want...
            return { typeFlag: TypeFlags.String };
        case ts.TypeFlags.Object:
            const symbol = tsType.symbol;
            if (!symbol) {
                throw new Error("Cannot create type from TS type. No symbol associated with the TS Type");
            }
            if (symbol.flags === ts.SymbolFlags.TypeLiteral) {
                if (!symbol.members) {
                    throw new Error("TS Object Literal symbol has no associated members");
                }
                const objectLiteralType = new ObjectLiteral(symbol.members, program);
                return {
                    objectLiteralType,
                    typeFlag: TypeFlags.ObjectLiteralType,
                } as ObjectLiteralType;
            } else if (symbol.flags === ts.SymbolFlags.Interface) {
                return {
                    name: symbol.getName(),
                    typeFlag: TypeFlags.Interface,
                } as InterfaceType;
            } else if (symbol.flags === ts.SymbolFlags.Class) {
                return {
                    cls: program.getClass(symbol.getName()),
                    typeFlag: TypeFlags.Class,
                } as ClassType;
            }
            break;
    }
    throw new Error(`Unexpected TypeScript type: ${tsType.flags}!`);
}

export function typeFromParamAndReturnType(params: Variable[], returnType: Type): FunctionType {
    return {
        params,
        returnType,
        typeFlag: TypeFlags.Function,
    };
}
