import * as ts from "typescript";
export class UnexpectedASTNode {
    constructor(private nodeType: ts.Node, private childType: ts.Node) {}
}
