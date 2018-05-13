/**
 * Copied from https://github.com/angular/tsickle
 */
import * as ts from "typescript";
import { Program } from "../Program";

class FileContext {
    /**
     * Stores the parent node for all processed nodes.
     * This is needed for nodes from the parse tree that are used
     * in a synthetic node as must not modify these, even though they
     * have a new parent now.
     */
    public syntheticNodeParents = new Map<ts.Node, ts.Node|undefined>();
    public importOrReexportDeclarations: Array<ts.ExportDeclaration|ts.ImportDeclaration> = [];
    public lastCommentEnd = -1;
    constructor(public file: ts.SourceFile) {}
}

interface TransformationContext extends ts.TransformationContext {
    fileContext?: FileContext;
}

/**
 * Transform that needs to be executed right before TypeScript's transform.
 *
 * This prepares the node tree to workaround some bugs in the TypeScript emitter.
 */
function prepareNodesBeforeTypeScriptTransform(context: ts.TransformationContext) {
    return (sourceFile: ts.SourceFile) => {
        const fileCtx = assertFileContext(context, sourceFile);

        const nodePath: ts.Node[] = [];
        visitNode(sourceFile);
        return sourceFile;

        function visitNode(node: ts.Node) {
            const parent = nodePath[nodePath.length - 1];

            // tslint:disable-next-line:no-bitwise
            if (node.flags & ts.NodeFlags.Synthesized) {
                // Set `parent` for synthetic nodes as well,
                // as otherwise the TS emit will crash for decorators.
                // Note: don't update the `parent` of original nodes, as:
                // 1) we don't want to change them at all
                // 2) TS emit becomes errorneous in some cases if we add a synthetic parent.
                // see https://github.com/Microsoft/TypeScript/issues/17384
                node.parent = parent;
            }
            fileCtx.syntheticNodeParents.set(node, parent);

            const originalNode = ts.getOriginalNode(node);
            // Needed so that e.g. `module { ... }` prints the variable statement
            // before the closure.
            // See https://github.com/Microsoft/TypeScript/issues/17596
            // tslint:disable-next-line:no-any as `symbol` is @internal in typescript.
            (node as any).symbol = (originalNode as any).symbol;

            if (originalNode && node.kind === ts.SyntaxKind.ExportDeclaration) {
                const originalEd = originalNode as ts.ExportDeclaration;
                const ed = node as ts.ExportDeclaration;
                if (!!originalEd.exportClause !== !!ed.exportClause) {
                    // Tsickle changes `export * ...` into named exports.
                    // In this case, don't set the original node for the ExportDeclaration
                    // as otherwise TypeScript does not emit the exports.
                    // See https://github.com/Microsoft/TypeScript/issues/17597
                    ts.setOriginalNode(node, undefined);
                }
            }

            if (node.kind === ts.SyntaxKind.ImportDeclaration ||
                node.kind === ts.SyntaxKind.ExportDeclaration) {
                const ied = node as ts.ImportDeclaration | ts.ExportDeclaration;
                if (ied.moduleSpecifier) {
                    fileCtx.importOrReexportDeclarations.push(ied);
                }
            }

            // recurse
            nodePath.push(node);
            node.forEachChild(visitNode);
            nodePath.pop();
        }
    };
}

function assertFileContext(context: TransformationContext, sourceFile: ts.SourceFile): FileContext {
    if (!context.fileContext) {
        throw new Error(
            `Illegal State: FileContext not initialized. ` +
            `Did you forget to add the "firstTransform" as first transformer? ` +
            `File: ${sourceFile.fileName}`);
    }
    if (context.fileContext.file.fileName !== sourceFile.fileName) {
        throw new Error(
            `Illegal State: File of the FileContext does not match. File: ${sourceFile.fileName}`);
    }
    return context.fileContext;
}

function lastNodeWith(nodes: ts.Node[], predicate: (node: ts.Node) => boolean): ts.Node | null {
    for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        if (predicate(node)) {
            return node;
        }
    }
    return null;
}

/** @return true if node has the specified modifier flag set. */
function hasModifierFlag(node: ts.Node, flag: ts.ModifierFlags): boolean {
    // tslint:disable-next-line:no-bitwise
    return (ts.getCombinedModifierFlags(node) & flag) !== 0;
}

/**
 * Transform that adds the FileContext to the TransformationContext.
 */
function addFileContexts(context: ts.TransformationContext) {
    return (sourceFile: ts.SourceFile) => {
        (context as TransformationContext).fileContext = new FileContext(sourceFile);
        return sourceFile;
    };
}

export function createCustomTransformers(program: Program, given: ts.CustomTransformers): ts.CustomTransformers {
    const before = given.before || [];
    before.unshift(addFileContexts);
    before.push(prepareNodesBeforeTypeScriptTransform);
    const after = given.after || [];
    after.unshift(createEmitMissingSyntheticCommentsAfterTypescriptTransform(program));
    return {before, after};
}

const createEmitMissingSyntheticCommentsAfterTypescriptTransform = (program: Program) =>
    (context: ts.TransformationContext) => (sourceFile: ts.SourceFile) => {
        const fileContext = assertFileContext(context, sourceFile);
        const nodePath: ts.Node[] = [];
        visitNode(sourceFile);
        (context as TransformationContext).fileContext = undefined;
        return sourceFile;

        function visitNode(node: ts.Node) {
            if (node.kind === ts.SyntaxKind.Identifier) {
                const parent1 = fileContext.syntheticNodeParents.get(node);
                const parent2 = parent1 && fileContext.syntheticNodeParents.get(parent1);
                const parent3 = parent2 && fileContext.syntheticNodeParents.get(parent2);

                if (parent1 && parent1.kind === ts.SyntaxKind.PropertyDeclaration) {
                    // TypeScript ignores synthetic comments on (static) property declarations
                    // with initializers.
                    // find the parent ExpressionStatement like MyClass.foo = ...
                    const expressionStmt =
                        lastNodeWith(nodePath, (n) => n.kind === ts.SyntaxKind.ExpressionStatement);
                    if (expressionStmt) {
                        ts.setSyntheticLeadingComments(
                            expressionStmt, ts.getSyntheticLeadingComments(parent1) || []);
                    }
                } else if (
                    parent3 && parent3.kind === ts.SyntaxKind.VariableStatement &&
                    hasModifierFlag(parent3, ts.ModifierFlags.Export)) {
                    // TypeScript ignores synthetic comments on exported variables.
                    // find the parent ExpressionStatement like exports.foo = ...
                    const expressionStmt =
                        lastNodeWith(nodePath, (n) => n.kind === ts.SyntaxKind.ExpressionStatement);
                    if (expressionStmt) {
                        ts.setSyntheticLeadingComments(
                            expressionStmt, ts.getSyntheticLeadingComments(parent3) || []);
                    }
                }
            } else if (ts.isFunctionDeclaration(node)) {
                if (node.name) {
                    try {
                        const cls = program.getClass(node.name.text);
                        ts.addSyntheticLeadingComment(node,
                            ts.SyntaxKind.MultiLineCommentTrivia,
                            cls.getConstructorSpec(),
                            true,
                        );
                    } catch (err) {
                        // Not an issue, we just didn't find the class
                    }
                }
            }
            nodePath.push(node);
            node.forEachChild(visitNode);
            nodePath.pop();
        }
    };
