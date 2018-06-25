class MyNode {
    public next: MyNode | null;
    public value: number;
    constructor(value: number, next: MyNode | null) {
        this.next = next;
        this.value = value;
    }

    public insert(value: number): MyNode {
        if (this.value === value) {
            return this;
        } else if (this.value < value) {
            if (this.next !== null) {
                this.next = this.next.insert(value);
            } else {
                this.next = new MyNode(value, null);
            }
        }
        return new MyNode(value, this);
    }

    public sort(): MyNode {
        if (this.next) {
            var rec: MyNode = this.next.sort();
            return rec.insert(this.value);
        }
        return this;
    }
}
