import * as ts from "typescript";
import {Class} from "./Class";

export class Program {
    private program: ts.Program;
    private sourceFileNode: ts.SourceFile;

    private classes: { [className: string]: Class };

    constructor(fileName: string, options?: ts.CompilerOptions) {
        this.program = ts.createProgram([fileName], options || {});
        const sourceFiles = this.program.getSourceFiles()
            .filter(sourceFile => !sourceFile.isDeclarationFile);
        if (sourceFiles.length !== 1) {
            throw "Only handling programs with one source file";
        }
        this.sourceFileNode = sourceFiles[0];
    }

    findAllClasses() {
        this.classes = {};
        this.sourceFileNode.statements
            .map(statement => {
                if (ts.isClassDeclaration(statement)) {
                    const classFound = new Class(statement, this.program.getTypeChecker());
                    this.classes[classFound.getName()] = classFound;
                }
            });
    }
}