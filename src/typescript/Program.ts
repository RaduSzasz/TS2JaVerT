import { flatMap, flatten, map } from "lodash";
import * as ts from "typescript";
import { Assertion } from "../assertions/Assertion";
import { printFunctionSpec } from "../assertions/FunctionSpec";
import { ForbiddenPredicate } from "../assertions/predicates/ForbiddenPredicate";
import { IndexSignaturePredicate } from "../assertions/predicates/IndexSignaturePredicate";
import { SeparatingConjunctionList } from "../assertions/SeparatingConjunctionList";
import { Class } from "./Class";
import { Function } from "./functions/Function";
import { Interface } from "./Interface";
import { visitStatementToFindCapturedVars, visitStatementToFindDeclaredVars } from "./Statement";
import { createCustomTransformers } from "./transformers/FileContext";
import { Type } from "./Types";
import { Variable } from "./Variable";

export class Program {
    private program: ts.Program;
    private sourceFileNode: ts.SourceFile;

    private classes: { [className: string]: Class } = {};
    private interfaces: { [interfaceName: string]: Interface } = {};
    private indexSignatures: { [name: string]: IndexSignaturePredicate } = {};
    private functions: { [nodePos: number]: Function } = {};
    private indexSigCnt = 0;
    private gamma: Variable[];

    constructor(fileName: string, options?: ts.CompilerOptions) {
        this.program = ts.createProgram([fileName], options || {});
        const sourceFiles = this.program.getSourceFiles()
            .filter((sourceFile) => !sourceFile.isDeclarationFile);
        if (sourceFiles.length !== 1) {
            throw new Error("Only handling programs with one source file");
        }
        this.sourceFileNode = sourceFiles[0];
        this.findAllClassesAndInterfaces();

        this.gamma = flatten(
            this.sourceFileNode.statements
                    .map((statement) => visitStatementToFindDeclaredVars(statement, this)),
        );

        this.determineCapturedVars();
    }

    public getTypeChecker(): ts.TypeChecker {
        return this.program.getTypeChecker();
    }

    public addFunction(node: ts.Node, func: Function): void {
        this.functions[node.pos] = func;
    }

    public getFunctions(): Function[] {
        return map(this.functions, (val: Function) => val);
    }

    public getClass(className: string): Class {
        if (this.classes.hasOwnProperty(className)) {
            return this.classes[className];
        }
        throw new Error(`No such class ${className}`);
    }

    public addIndexingSignature(type: Type): IndexSignaturePredicate {
        const name = `IndexSig${this.indexSigCnt++}`;
        const indexSignature = new IndexSignaturePredicate(name, type);
        this.indexSignatures[name] = indexSignature;
        return indexSignature;
    }

    public getPrototypeAssertion(): Assertion {
        return new SeparatingConjunctionList([
            ...map(this.classes, (cls) => cls.getProtoAssertion()),
        ]);
    }

    public print(): void {
        this.program.emit(this.sourceFileNode,
            undefined,
            undefined,
            undefined,
            createCustomTransformers(this, {
                before: [
                    this.addPredicates,
                    this.addFunctionSpecTopLevel,
                ],
            }),
        );
    }

    private findAllClassesAndInterfaces() {
        this.sourceFileNode.statements
            .map((statement) => {
                if (ts.isClassDeclaration(statement)) {
                    const classFound = new Class(statement, this);
                    this.classes[classFound.getName()] = classFound;
                } else if (ts.isInterfaceDeclaration(statement)) {
                    const interfaceFound = new Interface(statement, this);
                    this.interfaces[interfaceFound.getName()] = interfaceFound;
                }
            });
        Class.resolveParents(this.classes);
        Class.resolveAncestorsAndDescendents(this.classes);
    }

    private determineCapturedVars(): void {
        this.sourceFileNode.statements
            .forEach((statement) => visitStatementToFindCapturedVars(
                statement,
                this,
                [],
                this.gamma),
            );
    }

    private addFunctionSpecVisitor: ts.Visitor = (node: ts.Node) => {
        if (this.functions[node.pos]) {
            const funcVar = this.functions[node.pos];
            if (ts.isFunctionDeclaration(node)) {
                return ts.addSyntheticLeadingComment(ts.updateFunctionDeclaration(node,
                        node.decorators,
                        node.modifiers,
                        node.asteriskToken,
                        node.name,
                        node.typeParameters,
                        node.parameters,
                        node.type,
                        // TODO: Think of a better way of solving this rather than using !
                        ts.createBlock(ts.visitNodes(node.body!.statements, this.addFunctionSpecVisitor)),
                    ),
                    ts.SyntaxKind.MultiLineCommentTrivia,
                    printFunctionSpec(funcVar.generateAssertion()),
                    true,
                );
            } else if (ts.isVariableStatement(node)) {
                return ts.addSyntheticLeadingComment(ts.createVariableStatement(node.modifiers,
                    ts.createVariableDeclarationList(node.declarationList.declarations.map((declaration) => {
                        const initializer = declaration.initializer;
                        if (initializer && ts.isFunctionExpression(initializer)) {
                            return ts.updateVariableDeclaration(declaration,
                                declaration.name,
                                declaration.type,
                                ts.updateFunctionExpression(initializer,
                                    initializer.modifiers,
                                    initializer.asteriskToken,
                                    initializer.name,
                                    initializer.typeParameters,
                                    initializer.parameters,
                                    initializer.type,
                                    ts.createBlock(
                                        ts.visitNodes(initializer.body.statements, this.addFunctionSpecVisitor))),
                            );
                        }
                        return declaration;
                    }))),
                    ts.SyntaxKind.MultiLineCommentTrivia,
                    printFunctionSpec(funcVar.generateAssertion()),
                    true,
                );
            }
        } else if (ts.isClassDeclaration(node)) {
            return ts.updateClassDeclaration(
                node,
                node.decorators,
                node.modifiers,
                node.name,
                node.typeParameters,
                node.heritageClauses || [],
                ts.visitNodes(node.members, this.addClassMemberSpecVisitor),
            );
        }
        return node;
    }

    private addClassMemberSpecVisitor: ts.Visitor = (member: ts.Node) => {
        if (ts.isMethodDeclaration(member)) {
            const funcVar = this.functions[member.pos];
            if (!funcVar) {
                throw new Error("Class method not associated with function spec");
            }
            return ts.addSyntheticLeadingComment(ts.updateMethod(
                    member,
                    member.decorators,
                    member.modifiers,
                    member.asteriskToken,
                    member.name,
                    member.questionToken,
                    member.typeParameters,
                    member.parameters,
                    member.type,
                    ts.createBlock(
                        ts.visitNodes(
                            // TODO: Think of a better way of solving this rather than using !
                            member.body!.statements,
                            this.addFunctionSpecVisitor),
                    ),
                ),
                ts.SyntaxKind.MultiLineCommentTrivia,
                printFunctionSpec(funcVar.generateAssertion()),
                true,
            );
        } else if (ts.isPropertyDeclaration(member) && this.functions[member.pos]) {
            const funcVar = this.functions[member.pos];
            return ts.addSyntheticLeadingComment(ts.updateProperty(
                    member,
                    member.decorators,
                    member.modifiers,
                    member.name,
                    member.questionToken,
                    member.type,
                    member.initializer,
                ),
                ts.SyntaxKind.MultiLineCommentTrivia,
                printFunctionSpec(funcVar.generateAssertion()),
                true,
            );
        }
        return member;
    }

    private addFunctionSpecTopLevel: ts.TransformerFactory<ts.SourceFile> = (context) =>
        (src) => ts.visitEachChild(src, this.addFunctionSpecVisitor, context)

    private addPredicates = (): ts.Transformer<ts.SourceFile> => {
        return (src: ts.SourceFile) => {
            const predicates = [
                ForbiddenPredicate.toPredicate(),
                ...map(this.indexSignatures, (i) => i.toString()),
                ...map(this.interfaces, (i) => i.toPredicate()),
                ...flatMap(this.classes, (cls) => [cls.getInstancePredicate(), cls.getProtoPredicate()]),
            ].join("\n\n");
            const commentedNode = ts.addSyntheticLeadingComment(
                ts.createNotEmittedStatement(src.getFirstToken()),
                ts.SyntaxKind.MultiLineCommentTrivia,
                predicates,
                true,
            );
            return ts.updateSourceFileNode(src, [
                commentedNode,
                ...src.statements,
            ]);
        };
    }
}
