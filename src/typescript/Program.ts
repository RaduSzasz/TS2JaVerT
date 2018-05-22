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
import {
    visitStatementToFindAssignments,
    visitStatementToFindCapturedVars,
    visitStatementToFindDeclaredVars,
} from "./Statement";
import { createCustomTransformers } from "./transformers/FileContext";
import { Type } from "./Types";
import { AssignedVariable, Variable } from "./Variable";

export class Program {
    private program: ts.Program;
    private readonly sourceFileNode: ts.SourceFile;

    private classes: { [className: string]: Class } = {};
    private interfaces: { [interfaceName: string]: Interface } = {};
    private indexSignatures: { [name: string]: IndexSignaturePredicate } = {};
    private functions: Map<ts.Node, Function> = new Map();
    private assignments: Map<ts.Node, AssignedVariable[]> = new Map();
    private indexSigCnt = 0;
    private readonly gamma: Variable[];

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
        this.annotateAssignments();
    }

    public getTypeChecker(): ts.TypeChecker {
        return this.program.getTypeChecker();
    }

    public addFunction(node: ts.Node, func: Function): void {
        this.functions.set(node, func);
    }

    public getFunctions(): Function[] {
        return Array.from(this.functions.values());
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

    public getFunction(node: ts.Node): Function | undefined {
        return this.functions.get(node);
    }

    public addAssignments(node: ts.Node, variables: AssignedVariable[]): void {
        if (variables.length) {
            const nodeAssignments = this.assignments.get(node) || [];
            this.assignments.set(node, nodeAssignments.concat(variables));
        }
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

    private annotateAssignments(): void {
        this.sourceFileNode.statements
            .forEach((statement) => visitStatementToFindAssignments(
                statement,
                this,
                [],
                this.gamma));
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

    private generateAnnotatedNode = (node: ts.Node, funcVar?: Function) => {
        if (ts.isFunctionDeclaration(node)) {
            if (!funcVar) {
                throw new Error("Cannot annotate Function declaration node. No associated funcVar");
            }
            return ts.updateFunctionDeclaration(node,
                node.decorators,
                node.modifiers,
                node.asteriskToken,
                node.name,
                node.typeParameters,
                node.parameters,
                node.type,
                // TODO: Think of a better way of solving this rather than using !
                ts.createBlock(ts.visitNodes(node.body!.statements, this.addFunctionSpecVisitor)),
            );
        } else if (ts.isVariableStatement(node)) {
            return ts.createVariableStatement(node.modifiers,
                ts.createVariableDeclarationList(node.declarationList.declarations.map((declaration) => {
                    const initializer = declaration.initializer;
                    if (initializer && ts.isFunctionExpression(initializer)) {
                        return ts.updateVariableDeclaration(declaration,
                            declaration.name,
                            declaration.type,
                            ts.visitNode(initializer, this.addFunctionSpecVisitor),
                        );
                    }
                    return declaration;
                })));
        } else if (ts.isFunctionExpression(node)) {
            return ts.updateFunctionExpression(node,
                node.modifiers,
                node.asteriskToken,
                node.name,
                node.typeParameters,
                node.parameters,
                node.type,
                ts.createBlock(
                    ts.visitNodes(node.body.statements, this.addFunctionSpecVisitor)));
        } else if (ts.isBinaryExpression(node) &&
            node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            ts.isIdentifier(node.left)) {

            return ts.updateBinary(node,
                node.left,
                ts.visitNode(node.right, this.addFunctionSpecVisitor),
                node.operatorToken);
        } else if (ts.isExpressionStatement(node)) {
            return ts.updateStatement(node, ts.visitNode(node.expression, this.addFunctionSpecVisitor));
        } else if (ts.isReturnStatement(node)) {
            return ts.updateReturn(node, ts.visitNode(node.expression, this.addFunctionSpecVisitor));
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

    private addFunctionSpecVisitor: ts.Visitor = (node: ts.Node) => {
        const funcVar = this.functions.get(node);
        const assignedVars = this.assignments.get(node);
        const annotatedNode = this.generateAnnotatedNode(node, funcVar);
        const functionCommentedNode = funcVar
            ? ts.addSyntheticLeadingComment(annotatedNode,
                ts.SyntaxKind.MultiLineCommentTrivia,
                printFunctionSpec(funcVar.generateAssertion()),
                true)
            : annotatedNode;

        return assignedVars
            ? ts.addSyntheticTrailingComment(functionCommentedNode,
                ts.SyntaxKind.MultiLineCommentTrivia,
                new SeparatingConjunctionList(
                    assignedVars.map(({ assignedVar, currentScope }) =>
                        currentScope ? assignedVar.toAssertion() : assignedVar.toAssertionExtractingScope()),
                ).toString(),
                true)
            : functionCommentedNode;
    }

    private addClassMemberSpecVisitor: ts.Visitor = (member: ts.Node) => {
        const funcVar = this.functions.get(member);
        if (ts.isMethodDeclaration(member)) {
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
        } else if (ts.isPropertyDeclaration(member) && funcVar) {
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
                ...map(this.indexSignatures, (i) => i.getPredicate()),
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
