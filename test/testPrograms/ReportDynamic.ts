class MyMap {
    private contents: { [key: string]: number };

    public constructor() {
        this.contents = {};
    }

    public get(k: string): number | undefined {
        if (this.contents.hasOwnProperty(k)) {
            return this.contents[k];
        }
    }

    public put(k: string, v: number): void {
        this.contents[k] = v;
    }
}

var myMap: MyMap = new MyMap();
myMap.put("myKey", 3);
myMap.put("hasOwnProperty", 0);
myMap.get("myKey");