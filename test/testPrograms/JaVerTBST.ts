interface BSTNode {
    value: number;
    left: BSTNode | null;
    right: BSTNode | null;
}

function makeNode(v: number): BSTNode {
    return {
        value: v,
        left: null,
        right: null,
    };
}

function insert(v: number, t: BSTNode | null): BSTNode {
    if (t === null) {
        return makeNode(v);
    }

    if (v < t.value) {
        t.left = insert(v, t.left);
    } else if (v > t.value) {
        t.right = insert(v, t.right);
    }

    return t;
}

function find(v: number, t: BSTNode | null): boolean {
    if (t === null) {
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
    if (t.left === null) {
        return t.value;
    }
    return find_min(t.left);
}

function remove(v: number, t: BSTNode | null): BSTNode | null {
    if (t === null) {
        return null;
    }

    if (v === t.value) {
        if (t.left === null) {
            return t.right;
        } else if (t.right === null) {
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
