import { find, flatten, map } from "lodash";
import * as ts from "typescript";
import { printFunctionSpec } from "../FunctionSpec";
import { ForbiddenPredicate } from "../predicates/ForbiddenPredicate";
import { IndexSignaturePredicate } from "../predicates/IndexSignaturePredicate";
import { Class } from "./Class";
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
                    this.addFunctionSpec,
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

    private addFunctionSpec = (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
        const checker = this.program.getTypeChecker();
        return (src: ts.SourceFile) => {
            src.statements = ts.createNodeArray(src.statements.map((node) => {
                if (ts.isFunctionDeclaration(node)) {
                    const funcName = checker.getSymbolAtLocation(node.name).name;
                    const funcVar: Variable = find(this.gamma, Variable.nameMatcher(funcName));
                    if (!funcVar.isFunction()) {
                        throw new Error("Function declaration node corresponds to a non function in Gamma");
                    }

                    return ts.addSyntheticLeadingComment(
                        node,
                        ts.SyntaxKind.MultiLineCommentTrivia,
                        printFunctionSpec(funcVar.generateAssertion()),
                        true,
                    );
                }
                return node;
            }));
            return src;
        };
    }

    private addPredicates = (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
        return (src: ts.SourceFile) => {
            const predicates = [
                ForbiddenPredicate.toPredicate(),
                ...map(this.indexSignatures, (i) => i.toString()),
                ...map(this.interfaces, (i) => i.toPredicate()),
            ].join("\n\n");
            src.statements = ts.createNodeArray([
                ts.addSyntheticLeadingComment(
                    ts.createNotEmittedStatement(src.getFirstToken()),
                    ts.SyntaxKind.MultiLineCommentTrivia,
                    predicates,
                    true,
                ),
                ...src.statements,
            ]);
            return src;
        };
    }
}
