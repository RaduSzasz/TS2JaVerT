class IdGen {
    private count: number;
    private prefix: string;

    public constructor(prefix: string) {
        this.count = 0;
        this.prefix = prefix;
    }

    public getId(): string {
        return this.prefix + "_id_" + (this.count++);
    }

    public reset(): void {
        this.count = 0;
    }
}

var ig1: IdGen = new IdGen("foo");
var ig2: IdGen = new IdGen("bar");

var id1: string = ig1.getId();