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
    private breed: string;
    constructor(position: number, name: string, breed: string) {
        super(position);
        this.name = name;
        this.breed = breed;
    }
    public meow(): string {
        return "Meow!! I’m " + this.name + " and I am a " + this.breed + " cat!";
    }
}

class Sphynx extends Cat {
    constructor(position: number, name: string) {
        super(position, name, "sphynx");
    }
}

var sphynx: Sphynx = new Sphynx(0, "Abc");
