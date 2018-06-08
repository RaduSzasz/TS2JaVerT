/* tslint:disable:max-classes-per-file */
/* tslint:disable:prefer-const */
/* tslint:disable:no-var-keyword */
/* tslint:disable:no-empty */
class LinkedListNode {
    public element: number;
    public next: LinkedListNode | undefined;
    constructor(element: number, next?: LinkedListNode) {
        this.element = element;
        this.next = next;
    }
}

class DoublyNode extends LinkedListNode {
    public prev: DoublyNode | undefined;
    public next: DoublyNode | undefined;
    constructor(
        element: number,
        next?: DoublyNode,
        prev?: DoublyNode,
    ) {
        super(element, next);
        this.prev = prev;
    }
}

class LinkedList {
    protected count: number = 0;
    protected head: LinkedListNode | undefined;

    constructor() {}

    public push(element: number): void {
        var node: LinkedListNode = new LinkedListNode(element);
        var current: LinkedListNode;

        if (this.head == null) {
            // catches null && undefined
            this.head = node;
        } else {
            current = this.head;

            while (current.next != null) {
                current = current.next;
            }

            current.next = node;
        }
        this.count++;
    }

    public getElementAt(index: number): LinkedListNode | undefined {
        if (index >= 0 && index <= this.count) {
            var node: LinkedListNode | undefined = this.head;
            var i: number = 0;
            while (i < index && node != null) {
                node = node.next;
                i = i + 1;
            }
            return node;
        }
        return undefined;
    }

    public insert(element: number, index: number): boolean {
        if (index >= 0 && index <= this.count) {
            var node: LinkedListNode = new LinkedListNode(element);

            if (index === 0) {
                var current: LinkedListNode | undefined = this.head;
                node.next = current;
                this.head = node;
            } else {
                var previous: LinkedListNode | undefined = this.getElementAt(index - 1);
                if (previous) {
                    node.next = previous.next;
                    previous.next = node;
                } else {
                    return false;
                }
            }
            this.count++;
            return true;
        }
        return false;
    }

    public removeAt(index: number): number | undefined {
        if (index >= 0 && index < this.count) {
            if (this.head == null) {
                return undefined;
            }
            var current: LinkedListNode | undefined = this.head;

            if (index === 0) {
                this.head = current.next;
            } else {
                var previous: LinkedListNode | undefined = this.getElementAt(index - 1);
                if (previous && previous.next) {
                    current = previous.next;
                    previous.next = current.next;
                } else {
                    return undefined;
                }
            }
            this.count--;
            return current.element;
        }
        return undefined;
    }

    public remove(element: number): number | undefined {
        var index: number = this.indexOf(element);
        return this.removeAt(index);
    }

    public indexOf(element: number): number {
        let current = this.head;

        var i: number = 0;
        while (i < this.size() && current != null) {
            if (element === current.element) {
                return i;
            }
            current = current.next;
            i = i + 1;
        }

        return -1;
    }

    public isEmpty(): boolean {
        return this.size() === 0;
    }

    public size(): number {
        return this.count;
    }

    public getHead(): LinkedListNode | undefined {
        return this.head;
    }

    public clear(): void {
        this.head = undefined;
        this.count = 0;
    }
}

class DoublyLinkedList extends LinkedList {
    protected head: DoublyNode | undefined;
    protected tail: DoublyNode | undefined;

    constructor() { super(); }

    public push(element: number): void {
        var node: DoublyNode = new DoublyNode(element);

        if (this.head == null) {
            this.head = node;
            this.tail = node; // NEW
        } else {
            // attach to the tail node // NEW
            if (this.tail) {
                this.tail.next = node;
                node.prev = this.tail;
                this.tail = node;
            } else {
                return;
            }
        }
        this.count++;
    }

    public insert(element: number, index: number): boolean {
        if (index >= 0 && index <= this.count) {
            var node: DoublyNode = new DoublyNode(element);
            var current: DoublyNode | undefined = this.head;

            if (index === 0) {
                if (this.head == null) {
                    // NEW
                    this.head = node;
                    this.tail = node;
                } else {
                    node.next = this.head;
                    this.head.prev = node; // NEW
                    this.head = node;
                }
            } else if (index === this.count) {
                // last item // NEW
                current = this.tail; // {2}
                if (current) {
                    current.next = node;
                    node.prev = current;
                    this.tail = node;
                } else {
                    return false;
                }
            } else {
                const previous = this.getElementAt(index - 1) as DoublyNode | undefined;
                if (previous && previous.next) {
                    current = previous.next;
                    node.next = current;
                    previous.next = node;

                    current.prev = node; // NEW
                    node.prev = previous; // NEW
                } else {
                    return false;
                }
            }
            this.count++;
            return true;
        }
        return false;
    }

    public removeAt(index: number): number | undefined {
        if (index >= 0 && index < this.count) {
            var current: DoublyNode | undefined = this.head;

            if (index === 0) {
                if (this.head) {
                    this.head = this.head.next; // {1}
                    // if there is only one item, then we update tail as well //NEW
                    if (this.count === 1) {
                        // {2}
                        this.tail = undefined;
                    } else if (this.head) {
                        this.head.prev = undefined; // {3}
                    } else {
                        return undefined;
                    }
                } else {
                    return undefined;
                }
            } else if (index === this.count - 1) {
                // last item //NEW
                current = this.tail; // {4}
                if (current && current.prev) {
                    this.tail = current.prev;
                    this.tail.next = undefined;
                } else {
                    return undefined;
                }
            } else {
                current = this.getElementAt(index) as DoublyNode | undefined;
                if (current && current.prev && current.next) {
                    var previous: DoublyNode | undefined = current.prev;
                    // link previous with current's next - skip it to remove
                    previous.next = current.next; // {6}
                    current.next.prev = previous; // NEW
                } else {
                    return undefined;
                }
            }

            if (current) {
                this.count--;
                return current.element;
            }
        }
        return undefined;
    }

    public indexOf(element: number): number {
        var current: DoublyNode | undefined = this.head;
        var index: number = 0;

        while (current != null) {
            if (element === current.element) {
                return index;
            }
            index++;
            current = current.next;
        }

        return -1;
    }

    public getHead(): DoublyNode | undefined {
        return this.head;
    }

    public getTail(): DoublyNode | undefined {
        return this.tail;
    }

    public clear(): void {
        super.clear();
        this.tail = undefined;
    }
}
