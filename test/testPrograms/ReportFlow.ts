interface Square {
    edgeSize: number;
}

interface Circle {
    radius: number;
}

function createShape(shape: "circle" | "square", sz: number): Square | Circle {
    if (shape === "circle") {
        return { radius: sz };
    } else if (shape === "square") {
        return { edgeSize: sz };
    }
}

var shape: Square | Circle = createShape("circle", 3);
var square: Square = shape as Square;
console.log(square.edgeSize);
