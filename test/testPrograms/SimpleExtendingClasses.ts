class Animal {
    private position: number;
    constructor(position: number) {
        this.position = position;
    }
    public walk(distance: number): void {
        this.position = this.position + distance;
    }
}

class Cat extends Animal {
    private name: string;
    constructor(position: number, name: string) {
        super(position);
        this.name = name;
    }
    public meow(): string {
        return "Meow!! I’m " + this.name + "!";
    }
}

var cat: Cat = new Cat(3, "Bob");
cat.meow();