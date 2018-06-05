class BST {
    private value: number;
    private left: BST | null;
    private right: BST | null;

    constructor(v: number) {
        this.value = v;
        this.left = null;
        this.right = null;
    }

    public insert(v: number): void {
        if (v < this.value) {
            if (this.left) {
                this.left.insert(v);
            } else {
                this.left = new BST(v);
            }
        } else if (v > this.value) {
            if (this.right) {
                this.right.insert(v);
            } else {
                this.right = new BST(v);
            }
        }
    }

    public find(v: number): boolean {
        if (v === this.value) {
            return true;
        } else if (v < this.value && this.left) {
            return this.left.find(v);
        } else if (this.right) {
            return this.right.find(v);
        }

        return false;
    }

    public find_min(): number {
        if (this.left === null) {
            return this.value;
        }
        return this.left.find_min();
    }

    public remove(v: number): BST | null {
        if (v === this.value) {
            if (this.left === null) {
                return this.right;
            } else if (this.right === null) {
                return this.left;
            } else {
                var min: number = this.right.find_min();
                this.right = this.right.remove(min);
                this.value = min;
            }
        } else if (v < this.value && this.left) {
            this.left = this.left.remove(v);
        } else if (this.right) {
            this.right = this.right.remove(v);
        }

        return this;
    }
}
