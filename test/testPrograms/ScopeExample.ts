var x: number = 3;

class C {
    public constructor() { }

    public f(): void {
        x = x + 1;
    }
}

function g(y: C): void {
    var x: string = "abc";
    y.f();
}
