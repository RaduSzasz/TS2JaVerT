class PQNode {
    public pri: number;
    public val: number;
    public next: PQNode | undefined;

    public constructor(pri: number, val: number) {
        this.pri = pri;
        this.val = val;
        this.next = undefined;
    }

    public insert(nl: PQNode | undefined): PQNode {
        if (nl === undefined) {
            return this;
        }

        if (this.pri > nl.pri) {
            this.next = nl;
            return this;
        }

        var tmp: PQNode = this.insert(nl.next);
        nl.next = tmp;
        return nl;
    }
}

class PQ {
    private head: PQNode | undefined = undefined;
    constructor() {}

    public enqueue(pri: number, val: number): void {
        var n: PQNode = new PQNode(pri, val);
        this.head = n.insert(this.head);
    }

    public dequeue(): { pri: number, val: number } | undefined {
        if (this.head === undefined) {
            console.log("Queue is empty");
            return undefined;
        }
        var first: PQNode = this.head;
        this.head = this.head.next;
        return { pri: first.pri, val: first.val };
    }
}
