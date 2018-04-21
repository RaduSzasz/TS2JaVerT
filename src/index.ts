import * as ts from "typescript";
import * as yargs from "yargs";
import { Function } from "./assertions/typescript/Function";

const args = yargs
    .requiresArg("file")
    .argv;

const program = ts.createProgram([args.file], {});
const checker = program.getTypeChecker();

for (const sourceFile of program.getSourceFiles()) {
    // Ignore *.d.ts files
    if (!sourceFile.isDeclarationFile) {
        ts.forEachChild(sourceFile, visitForClassesAndMethods);
    }
}

function visitForClassesAndMethods(node: ts.Node) {
    if (ts.isFunctionDeclaration(node)) {
        analyzeFunction(node);
    }
    if (ts.isClassDeclaration(node) && node.name) {
        // const x = node.heritageClauses;
        // if (x) {
        //     console.log(x[0].token);
        //     console.log(x[0].types);
        // }
    }
}

function analyzeFunction(node: ts.FunctionDeclaration) {
    Function.fromFunctionDeclaration(node, checker);
    // node.forEachChild(child => { console.log({ ...child, parent: undefined }); console.log("\n\n"); });
}

function analyzeClass(symbol: ts.Symbol) {
//    console.log(symbol.members);
//    console.log("======================");
    const constructorType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
    const constructors = constructorType.getConstructSignatures().map(analyzeConstructors);
//    console.log(constructors);
//    console.log("++++++++++\n\n\n");
}

function analyzeProperties(property: ts.Symbol) {
    return {
        name: property.name,
        type: property.getDeclarations(),
    };
}

function analyzeConstructors(signature: ts.Signature) {
//    console.log(signature.getDeclaration());
//    console.log("----------------------");
    return {
        parameters: signature.getParameters().map(param => param.getName()),
        returnType: signature.getReturnType(),
        documentation: signature.getDocumentationComment(checker)
    };
}

