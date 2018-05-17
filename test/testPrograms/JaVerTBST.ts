interface BSTNode {
    value: number;
    left: BSTNode | undefined;
    right: BSTNode | undefined;
}

function makeNode(v: number): BSTNode {
    return {
        value: v,
        left: undefined,
        right: undefined,
    };
}

function insert(v: number, t: BSTNode | undefined): BSTNode {
    if (t === undefined) {
        return makeNode(v);
    }

    if (v < t.value) {
        t.left = insert(v, t.left);
    } else if (v > t.value) {
        t.right = insert(v, t.right);
    }

    return t;
}

function find(v: number, t: BSTNode | undefined): boolean {
    if (t === undefined) {
        return false;
    } else if (v === t.value) {
        return true;
    } else if (v < t.value) {
        return find(v, t.left);
    } else {
        return find(v, t.right);
    }
}

function find_min(t: BSTNode): number {
    if (t.left === undefined) {
        return t.value;
    }
    return find_min(t.left);
}

function remove(v: number, t: BSTNode | undefined): BSTNode | undefined {
    if (t === undefined) {
        return undefined;
    }

    if (v === t.value) {
        if (t.left === undefined) {
            return t.right;
        } else if (t.right === undefined) {
            return t.left;
        } else {
            var min: number = find_min(t.right);
            t.right = remove(min, t.right);
            t.value = min;
        }
    } else if (v < t.value) {
        t.left = remove(v, t.left);
    } else {
        t.right = remove(v, t.right);
    }

    return t;
}
