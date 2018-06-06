interface Square {
    edgeSize: number;
}

interface Circle {
    radius: number;
}

function createShape(s: "circle" | "square", sz: number): Square | Circle {
    if (s === "circle") {
        return { radius: sz };
    }
    return { edgeSize: sz };
}
