import { Assertion } from "../Assertion";

export class NonePredicate implements Assertion {
    constructor(private o: string, private field: string) { }

    public toString(): string {
        return `(${this.o}, "${this.field}") -> None`;
    }
}
