import { find, flatten } from "lodash";
import * as ts from "typescript";
import { printFunctionSpec } from "../FunctionSpec";
import { Class } from "./Class";
import { Function } from "./Function";
import { visitStatementToFindCapturedVars, visitStatementToFindDeclaredVars } from "./Statement";
import { Variable } from "./Variable";

export class Program {
    private program: ts.Program;
    private sourceFileNode: ts.SourceFile;

    private classes: { [className: string]: Class };
    private gamma: Variable[];

    constructor(fileName: string, options?: ts.CompilerOptions) {
        this.program = ts.createProgram([fileName], options || {});
        const sourceFiles = this.program.getSourceFiles()
            .filter((sourceFile) => !sourceFile.isDeclarationFile);
        if (sourceFiles.length !== 1) {
            throw new Error("Only handling programs with one source file");
        }
        this.sourceFileNode = sourceFiles[0];
    }

    public findAllClasses() {
        this.classes = {};
        this.sourceFileNode.statements
            .map((statement) => {
                if (ts.isClassDeclaration(statement)) {
                    const classFound = new Class(statement, this.program.getTypeChecker());
                    this.classes[classFound.getName()] = classFound;
                }
            });
    }

    public determineGamma() {
        const typeChecker = this.program.getTypeChecker();
        this.gamma = flatten(
            this.sourceFileNode.statements
                    .map((statement) => visitStatementToFindDeclaredVars(statement, typeChecker)),
        );
    }

    public determineCapturedVars(): void {
        if (this.gamma === undefined || this.gamma === null) {
            throw new Error("Can not determine captured vars before establishing gamma contents");
        }
        const typeChecker = this.program.getTypeChecker();
        this.sourceFileNode.statements
            .forEach((statement) => visitStatementToFindCapturedVars(
                statement,
                typeChecker,
                [],
                this.gamma),
            );
    }

    public placeAssertions(): void {
        const checker = this.program.getTypeChecker();
        this.sourceFileNode.statements
            = ts.createNodeArray(this.sourceFileNode.statements.map((statement) => {
                if (!ts.isFunctionDeclaration(statement)) {
                    return statement;
                }
            }));
    }

    public print(): void {
        const checker = this.program.getTypeChecker();
        this.program.emit(this.sourceFileNode,
            undefined,
            undefined,
            undefined,
            {
                before: [(context) => {
                    return (src) => {
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
                }],
            });
        /*
        const printer = ts.createPrinter(undefined, {
            substituteNode: (hint, node) => {
                if (ts.isFunctionDeclaration(node)) {
                    return ts.addSyntheticLeadingComment(
                        node,
                        ts.SyntaxKind.MultiLineCommentTrivia,
                        "My long desired comment",
                        true,
                    );
                }
            },
        });
        */
    }
}
