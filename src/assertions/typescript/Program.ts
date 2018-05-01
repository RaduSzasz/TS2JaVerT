import { find, flatten, map } from "lodash";
import * as ts from "typescript";
import { printFunctionSpec } from "../FunctionSpec";
import { ForbiddenPredicate } from "../predicates/ForbiddenPredicate";
import { IndexSignaturePredicate } from "../predicates/IndexSignaturePredicate";
import { Class } from "./Class";
import { Function } from "./Function";
import { Interface } from "./Interface";
import { visitStatementToFindCapturedVars, visitStatementToFindDeclaredVars } from "./Statement";
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
        this.gamma = flatten(
            this.sourceFileNode.statements
                    .map((statement) => visitStatementToFindDeclaredVars(statement, this)),
        );

        this.findAllClassesAndInterfaces();
        this.determineCapturedVars();
    }

    public getTypeChecker(): ts.TypeChecker {
        return this.program.getTypeChecker();
    }

    public addFunction(node: ts.Node, func: Function): void {
        this.functions[node.pos] = func;
        // this.functions.push({ node, func });
    }

    public addIndexingSignature(type: Type): IndexSignaturePredicate {
        const name = `IndexSig${this.indexSigCnt++}`;
        const indexSignature = new IndexSignaturePredicate(name, type);
        this.indexSignatures[name] = indexSignature;
        return indexSignature;
    }

    public print(): void {
        this.program.emit(this.sourceFileNode,
            undefined,
            undefined,
            undefined,
            {
                before: [
                    this.addPredicates,
                    this.addFunctionSpecTopLevel,
                ],
            });
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

    private addFunctionSpec: ts.TransformerFactory<ts.Statement> = (context) => {
        return (node: ts.Statement) => {
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
                        ts.createBlock(flatten(node.body.statements
                            .map((statement) =>
                                ts.transform(statement, [this.addFunctionSpec]).transformed))),
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
                                        ts.createBlock(flatten(initializer.body.statements
                                            .map((statement) =>
                                                ts.transform(statement, [this.addFunctionSpec]).transformed)))),
                                );
                            }
                            return declaration;
                        }))),
                        ts.SyntaxKind.MultiLineCommentTrivia,
                        printFunctionSpec(funcVar.generateAssertion()),
                        true,
                    );
                } else {
                    throw new Error("THis hsould hkahfgrehj");
                }
            }
            return node;
        };
    }

    private addFunctionSpecTopLevel: ts.TransformerFactory<ts.SourceFile> =
        (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
            return (src: ts.SourceFile) => {
                const statements: ts.Statement[] = src.statements.map((statement) => statement);
                return ts.updateSourceFileNode(src,
                    ts.transform(statements, [this.addFunctionSpec]).transformed,
                );
            };
    }

    private addPredicates = (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
        return (src: ts.SourceFile) => {
            const predicates = [
                ForbiddenPredicate.toPredicate(),
                ...map(this.indexSignatures, (i) => i.toString()),
                ...map(this.interfaces, (i) => i.toPredicate()),
            ].join("\n\n");
            const commentedNode = ts.addSyntheticLeadingComment(
                ts.createNotEmittedStatement(undefined),
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
