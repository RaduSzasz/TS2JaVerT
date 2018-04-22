class A {
  private x: string;
  constructor(private a: number) {}

  f(x: number, y: number): void {
    console.log(x + y);
  }
}

interface I {
  b(): void;
}
/*

class B extends A implements I {
  b() {
    console.log("UAHJKFDHS");
  }
}
*/

function myFunc(a: number, b: number): number {
  return a + b;
}

function myOtherFunc(xkcd: number): number {
  return myFunc(xkcd, 6);
}
