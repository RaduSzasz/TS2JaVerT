import { isEqual, uniqWith } from "lodash";
import * as ts from "typescript";
import { PrimitiveType } from "../assertions/TypesPredicate";
import { Class } from "./Class";
import { ObjectLiteral } from "./ObjectLiteral";
import { Program } from "./Program";
import { Variable } from "./Variable";

export enum TypeFlags {
    Any,
    Void,
    Undefined,
    Null,
    Boolean,
    Number,
    String,
    ObjectLiteralType,
    Class,
    Interface,
    Union,
    Function,
    StringLiteral,
    This,
}

export interface Type {
    typeFlag: TypeFlags;
}

export interface PrimitiveTypeInterface extends Type {
    typeFlag: PrimitiveType;
}
export function isPrimitiveType(type: Type): type is PrimitiveTypeInterface {
    return type.typeFlag === TypeFlags.Number ||
        type.typeFlag === TypeFlags.String ||
        type.typeFlag === TypeFlags.Boolean ||
        type.typeFlag === TypeFlags.Void ||
        type.typeFlag === TypeFlags.Undefined ||
        type.typeFlag === TypeFlags.Null;
}

export interface AnyType extends Type {
    typeFlag: TypeFlags.Any;
}
export function isAnyType(type: Type): type is AnyType {
    return type.typeFlag === TypeFlags.Any;
}

export interface ThisType extends Type {
    typeFlag: TypeFlags.This;
}
export function isThisType(type: Type): type is ThisType {
    return type.typeFlag === TypeFlags.This;
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

export interface StringLiteralType extends Type {
    typeFlag: TypeFlags.StringLiteral;
    str: string;
}
export function isStringLiteralType(type: Type): type is StringLiteralType {
    return type.typeFlag === TypeFlags.StringLiteral;
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
export function isUnionType(type: Type): type is UnionType {
    return type.typeFlag === TypeFlags.Union;
}

export function createOptionalType(type: Type) {
    if (isUnionType(type)) {
        return {
            typeFlag: TypeFlags.Union,
            types: uniqWith([...type.types, { typeFlag: TypeFlags.Undefined } as Type], isEqual),
        };
    }
    return {
        typeFlag: TypeFlags.Union,
        types: [type, { typeFlag: TypeFlags.Undefined } as Type],
    };
}

export function typeFromTSType(tsTypeNode: ts.TypeNode, program: Program): Type {
    const checker = program.getTypeChecker();
    const tsType = checker.getTypeFromTypeNode(tsTypeNode);
    if (ts.isUnionTypeNode(tsTypeNode)) {
        return {
            typeFlag: TypeFlags.Union,
            types: tsTypeNode.types.map((t) => typeFromTSType(t, program)),
        } as UnionType;
        /* tslint:disable:no-bitwise */
    } else if (tsType.flags & ts.TypeFlags.Number) {
        return { typeFlag: TypeFlags.Number };
    } else if (tsType.flags & ts.TypeFlags.Void) {
        return { typeFlag: TypeFlags.Void };
    } else if (tsType.flags & ts.TypeFlags.String) {
        return { typeFlag: TypeFlags.String };
    } else if (tsType.flags & ts.TypeFlags.Boolean) {
        return { typeFlag: TypeFlags.Boolean };
    } else if (tsType.flags & ts.TypeFlags.Undefined) {
        return { typeFlag: TypeFlags.Undefined };
    } else if (tsType.flags & ts.TypeFlags.Null) {
        return { typeFlag: TypeFlags.Null };
    } else if (tsType.flags & ts.TypeFlags.Any) {
        return { typeFlag: TypeFlags.Any };
    } else if (tsType.flags & ts.TypeFlags.StringLiteral) {
        return {
            str: (tsType as ts.StringLiteralType).value,
            typeFlag: TypeFlags.StringLiteral,
        } as StringLiteralType;
    } else if (tsType.flags & ts.TypeFlags.Object) {
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
    }
    /* tslint:enable:no-bitwise */
    throw new Error(`Unexpected TypeScript type: ${tsType.flags}!`);
}

export function typeFromParamAndReturnType(params: Variable[], returnType: Type): FunctionType {
    return {
        params,
        returnType,
        typeFlag: TypeFlags.Function,
    };
}
