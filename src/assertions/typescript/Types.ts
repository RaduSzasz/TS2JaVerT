import * as ts from "typescript";
export enum TypeFlags {
    Any = 1,
    Void = 2,
    Boolean = 4,
    Number = 8,
    String = 16,
    ObjectLiteral = 32,
    Class = 64,
    Union = 128,
}

export interface Type {
    type: TypeFlags
}
export interface PrimitiveType extends Type {
    type: TypeFlags.Void | TypeFlags.Number | TypeFlags.String | TypeFlags.Boolean
}

export interface Class extends Type {
    type: TypeFlags.Class,
    name: string,
}

// Name is present if the object is an interface.
export interface ObjectLiteral extends Type {
    type: TypeFlags.ObjectLiteral,
    name?: string
}

export interface UnionType extends Type {
    type: TypeFlags.Union,
    types: Type[],
}

export function typeFromTSType(tsType: ts.Type): Type {
    return undefined;
}