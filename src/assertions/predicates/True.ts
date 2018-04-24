import { Assertion } from "../Assertion";

export class True implements Assertion {
    public toString() {
        return "True";
    }
}