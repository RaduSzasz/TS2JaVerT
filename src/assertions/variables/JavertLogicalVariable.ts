export class JavertLogicalVariable {
    constructor(private identifier: string) {}

    public toString() {
        return `#${this.identifier}`;
    }
}
