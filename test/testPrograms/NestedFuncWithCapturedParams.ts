function f(x: number): number {
    function g(): number {
        return x;
    }
    return g();
}
