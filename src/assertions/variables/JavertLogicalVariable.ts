export class JavertLogicalVariable {
    constructor(private identifier: string) {}

    toString() {
        return `#${this.identifier}`;
    }
}