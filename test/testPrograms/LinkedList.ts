function defaultEquals(x: any, y: any): boolean {
    return x === y;
}

class LinkedListNode {
    public element: any;
    public next: LinkedListNode | undefined;

    constructor(e: any, next?: LinkedListNode) {
        this.element = e;
        this.next = next;
    }
}

class LinkedList {
    private nElements: number;
    private firstNode: LinkedListNode | undefined;
    private lastNode: LinkedListNode | undefined;

    public constructor() {
        this.nElements = 0;
        this.firstNode = undefined;
        this.lastNode = undefined;
    }
    // Returns the node at the specified index.
    public nodeAtIndex(index: number): LinkedListNode | undefined {
        var node: LinkedListNode | undefined;
        var i: number;
        if (index < 0 || index >= this.nElements) {
            return undefined;
        }
        if (index === (this.nElements - 1)) {
            return this.lastNode;
        }
        node = this.firstNode;
        for (i = 0; i < index && node !== undefined; i += 1) {
            node = node.next;
        }
        return node;
    }

    public add(item: any, index: number) {
        var newNode: LinkedListNode;
        var prev: LinkedListNode | undefined;

        if (index === undefined) {
            index = this.nElements;
        }
        if (index < 0 || index > this.nElements || item === undefined) {
            return false;
        }
        newNode = new LinkedListNode(item, undefined);
        if (this.nElements === 0) {
            // First node in the list.
            this.firstNode = newNode;
            this.lastNode = newNode;
        } else if (index === this.nElements) {
            if (this.lastNode) {
                this.lastNode.next = newNode;
                this.lastNode = newNode;
            } else {
                return false;
            }
            // Insert at the end.
        } else if (index === 0) {
            // Change first node.
            if (this.firstNode) {
                newNode.next = this.firstNode;
                this.firstNode = newNode;
            } else {
                return false;
            }
        } else {
            prev = this.nodeAtIndex(index - 1);
            if (prev) {
                newNode.next = prev.next;
                prev.next = newNode;
            } else {
                return false;
            }
        }
        this.nElements += 1;
        return true;
    }

    public first(): any | undefined {
        if (this.firstNode !== undefined) {
            return this.firstNode.element;
        }
        return undefined;
    }

    public last(): any | undefined {
        if (this.lastNode !== undefined) {
            return this.lastNode.element;
        }
        return undefined;
    }

    public elementAtIndex(index: number): any | undefined {
        var node: LinkedListNode | undefined = this.nodeAtIndex(index);
        if (node === undefined) {
            return undefined;
        }
        return node.element;
    }

    public indexOf(item: any): number {
        var currentNode: LinkedListNode | undefined = this.firstNode;
        var index: number = 0;
        if (item === undefined) {
            return -1;
        }

        while (currentNode !== undefined) {
            if (defaultEquals(currentNode.element, item)) {
                return index;
            }
            index += 1;
            currentNode = currentNode.next;
        }
        return -1;
    }

    public contains(item: any) {
        return (this.indexOf(item) >= 0);
    }

    public remove(item: any): boolean {
        var currentNode: LinkedListNode | undefined = this.firstNode;
        var previous: LinkedListNode | undefined;

        if (this.nElements < 1 || item === undefined) {
            return false;
        }

        while (currentNode !== undefined) {

            if (defaultEquals(currentNode.element, item)) {

                if (currentNode === this.firstNode) {
                    this.firstNode = this.firstNode.next;
                    if (currentNode === this.lastNode) {
                        this.lastNode = undefined;
                    }
                } else if (currentNode === this.lastNode) {
                    if (previous) {
                        this.lastNode = previous;
                        previous.next = currentNode.next;
                        currentNode.next = undefined;
                    }
                } else {
                    if (previous) {
                        previous.next = currentNode.next;
                        currentNode.next = undefined;
                    }
                }
                this.nElements = this.nElements - 1;
                return true;
            }
            previous = currentNode;
            currentNode = currentNode.next;
        }
        return false;
    }

    public clear(): void {
        this.firstNode = undefined;
        this.lastNode = undefined;
        this.nElements = 0;
    }

    public equals(other: LinkedList | undefined) {
        if (other === undefined) {
            return false;
        }

        var node: LinkedListNode | undefined = this.firstNode;
        var otherNode: LinkedListNode | undefined = other.firstNode;

        if (this.size() !== other.size()) {
            return false;
        }

        while (otherNode !== undefined && node !== undefined) {
            if (defaultEquals(node.element, otherNode.element) === false) {
                return false;
            }
            otherNode = otherNode.next;
            node = node.next;
        }

        return node === undefined && otherNode === undefined;
    }

    public removeElementAtIndex(index: number): any | undefined {
        var element: any | undefined;
        var previous: LinkedListNode | undefined;

        if (index < 0 || index >= this.nElements) {
            return undefined;
        }

        if (this.nElements === 1) {
            // First node in the list.
            if (this.firstNode) {
                element = this.firstNode.element;
            }
            this.firstNode = undefined;
            this.lastNode = undefined;
        } else {
            previous = this.nodeAtIndex(index - 1);
            if (previous === undefined) {
                if (this.firstNode) {
                    element = this.firstNode.element;
                    this.firstNode = this.firstNode.next;
                } else {
                    return undefined;
                }
            } else if (previous.next === this.lastNode) {
                if (this.lastNode) {
                    element = this.lastNode.element;
                    this.lastNode = previous;
                } else {
                    return undefined;
                }
            }
            if (previous && previous.next) {
                element = previous.next.element;
                previous.next = previous.next.next;
            }
        }
        this.nElements -= 1;
        return element;
    }

    public reverse() {
        var current: LinkedListNode | undefined = this.firstNode;
        var previous: LinkedListNode | undefined;
        var temp: LinkedListNode | undefined;
        while (current !== undefined) {
            temp = current.next;
            current.next = previous;
            previous = current;
            current = temp;
        }
        temp = this.firstNode;
        this.firstNode = this.lastNode;
        this.lastNode = temp;
    }

    public size(): number {
        return this.nElements;
    }

    public isEmpty(): boolean {
        return this.nElements <= 0;
    }
}
