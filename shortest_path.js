// TODO: test to compare results of dijkstra & A*

class PathNode{
    constructor(x, y, startDistance, prevNode){
        this.x = x;
        this.y = y;
        this.startDistance = startDistance; // distance from start
        this.prevNode = prevNode; // for backtracking the path
    }

    _calculateCostWithHeuristic(){
        let radioElems = document.getElementsByName("radioAlgorithm");
        if(radioElems[0].checked){
            // dijkstra
            return this.startDistance;
        }
        if(radioElems[1].checked){
            // A*
            // NOTE: This must NOT overestimate the value to end
            return this.startDistance + Math.sqrt((end[0] - this.x) * (end[0] - this.x) + (end[1] - this.y) * (end[1] - this.y)); 
        }
        if(radioElems[2].checked){
            // greedy
            return Math.sqrt((end[0] - this.x) * (end[0] - this.x) + (end[1] - this.y) * (end[1] - this.y)); 
        }
    }

    set startDistance(distance){
        this._startDistance = distance; 
        this._value = this._calculateCostWithHeuristic();
    }

    get startDistance(){
        return this._startDistance;
    }

    get value(){
        return this._value;
    }

    set value(value){
        this._value = value;
    }

    compareTo(node){
        if(this.value < node.value)
            return -1;
        else if (this.value > node.value)
            return 1;
        return 0;
    }

    keyStr(){
        return this.x + ", " + this.y;
    }
}

class TestNode{
    constructor(value){
        this.value = value;
    }
    compareTo(node){
        if(this.value < node.value)
            return -1;
        else if (this.value > node.value)
            return 1;
        return 0;
    }
}

class MinHeap{
    constructor(){
        this._arr = [];
        this._keyToIndex = {}; 
    }

    static _leftChildIndex(id){
        return id * 2 + 1;
    }

    static _rightChildIndex(id){
        return id * 2 + 2;
    }

    static _parentIndex(id){
        return Math.floor((id - 1) / 2);
    }

    _set(id, node){
        this._arr[id] = node;
        this._keyToIndex[node.keyStr()] = id;
    }

    _siftUp(id){
        if(id == 0)
            return;
        let parentId = MinHeap._parentIndex(id);
        let node = this._arr[id];
        if(node.compareTo(this._arr[parentId]) == -1){
            this._set(id, this._arr[parentId]);
            this._set(parentId, node);
            this._siftUp(parentId);
        }
    }

    _siftDown(id){
        let node = this._arr[id];
        let leftId = MinHeap._leftChildIndex(id);
        // left branch gets populated first, so no need to check right child if left child not found
        if(leftId >= this._arr.length)
            return;
        let rightId = MinHeap._rightChildIndex(id);
        if(rightId >= this._arr.length || this._arr[leftId].compareTo(this._arr[rightId]) <= 0){
            // ^ right child does not exist or is larger
            if(this._arr[leftId].compareTo(node) < 1){
                this._set(id, this._arr[leftId]);
                this._set(leftId, node);
                this._siftDown(leftId)
            }
            return;
        }
        // both branches populated
        if(this._arr[rightId].compareTo(node) == -1){
            this._set(id, this._arr[rightId]);
            this._set(rightId, node);
            this._siftDown(rightId)
        }
    }

    isEmpty(){
        return this._arr.length == 0;
    }

    contains(node){
        return node.keyStr() in this._keyToIndex;
    }

    insertOrDecrease(node){
        if(this.contains(node)){
            let id = this._keyToIndex[node.keyStr()];
            if(node.value < this._arr[id].value){
                this._arr[id] = node; 
                // need to check if the new value puts the node's value below its parent
                this._siftUp(id);
            }
        } else {
            this._arr.push(node);
            this._keyToIndex[node.keyStr()] = this._arr.length - 1;
            this._siftUp(this._arr.length - 1);
        }
    }

    extract(){
        if(this._arr.length == 0)
            return null;
        
        let minNode = this._arr[0];

        // last element to root
        this._set(0, this._arr[this._arr.length - 1]);
        this._arr.splice(-1, 1);
        this._siftDown(0);

        delete this._keyToIndex[minNode.keyStr()];
        return minNode;
    }
}

const GRID_DIMENSIONS = 20;
const DEFAULT_START = [4, GRID_DIMENSIONS/2];
const DEFAULT_END = [GRID_DIMENSIONS - 5, GRID_DIMENSIONS/2];
const SPEP_TIME_MS = 10;

let start = DEFAULT_START;
let end = DEFAULT_END;

function getTileElement(x, y){
    return document.getElementById("tile" + x + "-" + y);
}

function isWall(x, y){
    return getTileElement(x, y).className.includes("walltile");
}

function isSlow(x, y){
    return getTileElement(x, y).className.includes("slowtile");
}

function setStart(x, y){
    let prevElem = document.querySelector("#grid .starttile"); 
    if(prevElem != null)
        prevElem.className = prevElem.className.replace(" starttile", "");

    getTileElement(x, y).className += " starttile";
    getTileElement(x, y).className = getTileElement(x, y).className.replace(" walltile", "");
    getTileElement(x, y).className = getTileElement(x, y).className.replace(" slowtile", "");
    start = [x, y];
}

function setEnd(x, y){
    let prevElem = document.querySelector("#grid .endtile"); 
    if(prevElem != null)
        prevElem.className = prevElem.className.replace(" endtile", "");

    getTileElement(x, y).className += " endtile";
    getTileElement(x, y).className = getTileElement(x, y).className.replace(" walltile", "");
    getTileElement(x, y).className = getTileElement(x, y).className.replace(" slowtile", "");
    end = [x, y];
}

function idToXY(id){
    let strCoords = id.replace("tile", "").split("-");
    return [parseInt(strCoords[0]), parseInt(strCoords[1])];
}

function initGrid(){
    let gridElem = document.getElementById("grid");
    gridElem.innerHTML = "";
    for(let row = 0; row < GRID_DIMENSIONS; row++){
        let rowElem = document.createElement("tr");
        for(let col = 0; col < GRID_DIMENSIONS; col++){
            let colElem = document.createElement("td");
            colElem.setAttribute("class", "tile");
            colElem.setAttribute("id", "tile" + col + "-" + row);

            // these are added as attributes because later html manipulation is 
            // going to strip away the listeners if using .addEventListener
            colElem.setAttribute("onmousedown", "mouseDown(event)");
            colElem.setAttribute("onmousemove", "mouseMove(event)");

            rowElem.appendChild(colElem);
        }
        gridElem.appendChild(rowElem);
    }
    window.addEventListener("mouseup", mouseUp);
    window.oncontextmenu = e => false;


    setStart(DEFAULT_START[0], DEFAULT_START[1]);
    setEnd(DEFAULT_END[0], DEFAULT_END[1]);

    for(let x = start[0] - 2; x <= start[0] + 2; x++){
        getTileElement(x, start[1] - 2).className += " walltile";
        getTileElement(x, start[1] + 2).className += " walltile";
    }

    for(let y = start[1] - 1; y <= start[1] + 1; y++){
        getTileElement(start[0] + 2, y).className += " walltile";
    }

    for(let k = start[0] + 4; k > 2; k--){
        getTileElement(start[0] + k, start[1] + k).className += " walltile";
    }

    for(let x = end[0] - 6; x <= end[0] - 1; x++){
        for(let y = end[1] - 5; y <= end[1] + 2; y++){
            getTileElement(x, y).className += " slowtile";
        }
    }
}

let heap = null;
let visitedNodesSet = null;
let interval = null;

function addOrUpdateHeap(node){
    if(!heap.contains(node)){
        // multiple updates will otherwise cause issues
        getTileElement(node.x, node.y).className += " candidate";
    }
    heap.insertOrDecrease(node);
}

function addToVisited(node){
    visitedNodesSet.add(node.keyStr());
    getTileElement(node.x, node.y).className = getTileElement(node.x, node.y).className.replace("candidate", "visited");
}

function wasVisited(node){
    return visitedNodesSet.has(node.keyStr());
}

function clearGrid(){
    let gridElem = document.getElementById("grid");
    let html = gridElem.innerHTML;
    html = html.replace(/ walltile/g, "");
    html = html.replace(/ slowtile/g, "");
    gridElem.innerHTML = html;

    resetAlgorithm();
}

function updateTilesVisitedText(){
    let wallElems = document.querySelectorAll("#grid .walltile");
    let visitableElemCount = GRID_DIMENSIONS * GRID_DIMENSIONS - wallElems.length;
    let elem = document.getElementById("tilesVisitedText");
    elem.innerHTML = "Tiles visited: <b>" + visitedNodesSet.size + "/" + visitableElemCount +"</b>";
}

function resetAlgorithm(){
    pauseAlgorithm();

    // a rather dirty way to reset the status of grid elements
    let gridElem = document.getElementById("grid");
    let html = gridElem.innerHTML;
    html = html.replace(/ candidate/g, "");
    html = html.replace(/ visited/g, "");
    html = html.replace(/ path/g, "");
    html = html.replace(/ nopath/g, "");
    gridElem.innerHTML = html;

    heap = new MinHeap();
    visitedNodesSet = new Set();
    
    let firstNode = new PathNode(start[0], start[1], 0, null);
    addOrUpdateHeap(firstNode);
    updateTilesVisitedText();
}

function pauseAlgorithm(){
    if(interval != null)
        clearInterval(interval);
}

function resumeAlgorithm(){
    pauseAlgorithm();
    interval = setInterval(visitNext, SPEP_TIME_MS);
}

function visitNext(){
    if(heap.isEmpty()){
        let gridElem = document.getElementById("grid");
        let html = gridElem.innerHTML;
        html = html.replace(/ visited/g, " nopath");
        gridElem.innerHTML = html;
        pauseAlgorithm();
        return;
    }
    let node = heap.extract();
    addToVisited(node);
    updateTilesVisitedText();

    if(node.x == end[0] && node.y == end[1]){
        console.log("Path found");
        pauseAlgorithm();
        getTileElement(node.x, node.y).className += " path";
        while(node.prevNode != null){
            node = node.prevNode;
            getTileElement(node.x, node.y).className += " path";
        }
        return;
    }

    addAdjacentNodes(node);
    addDiagonalNodes(node);
}

function addAdjacentNodes(node){
    if(node.y > 0 && !isWall(node.x, node.y - 1)){
        let upNode = new PathNode(node.x, node.y-1, node.startDistance, node);
        if(isSlow(node.x, node.y-1))
            upNode.startDistance += 5;
        else
            upNode.startDistance += 1;
        if(!wasVisited(upNode)){
            addOrUpdateHeap(upNode)
        }
    }

    if(node.y < GRID_DIMENSIONS - 1 && !isWall(node.x, node.y + 1)){
        let downNode = new PathNode(node.x, node.y+1, node.startDistance, node);
        if(isSlow(node.x, node.y+1))
            downNode.startDistance += 5;
        else
            downNode.startDistance += 1;
        if(!wasVisited(downNode)){
            addOrUpdateHeap(downNode)
        }
    }

    if(node.x > 0 && !isWall(node.x - 1, node.y)){
        let leftNode = new PathNode(node.x-1, node.y, node.startDistance, node);
        if(isSlow(node.x-1, node.y))
            leftNode.startDistance += 5;
        else
            leftNode.startDistance += 1;
        if(!wasVisited(leftNode)){
            addOrUpdateHeap(leftNode)
        }
    }

    if(node.x < GRID_DIMENSIONS - 1 && !isWall(node.x + 1, node.y)){
        let rightNode = new PathNode(node.x+1, node.y, node.startDistance, node);
        if(isSlow(node.x+1, node.y))
            rightNode.startDistance += 5;
        else
            rightNode.startDistance += 1;
        if(!wasVisited(rightNode)){
            addOrUpdateHeap(rightNode)
        }
    }
}

function addDiagonalNodes(node){
    const sqrt2 = 1.41;
    const sqrt50 = 7.07;

    if(node.x > 0 && node.y > 0 
        && !isWall(node.x-1, node.y-1) && !isWall(node.x-1, node.y) && !isWall(node.x, node.y-1)){
        let upleft = new PathNode(node.x-1, node.y-1, node.startDistance, node);
        if(isSlow(node.x-1, node.y-1))
            upleft.startDistance += sqrt50;
        else
            upleft.startDistance += sqrt2;
        if(!wasVisited(upleft)){
            addOrUpdateHeap(upleft)
        }
    }

    if(node.x < GRID_DIMENSIONS - 1 && node.y < GRID_DIMENSIONS - 1 
        && !isWall(node.x+1, node.y+1) && !isWall(node.x+1, node.y) && !isWall(node.x, node.y+1)){
        let downright = new PathNode(node.x+1, node.y+1, node.startDistance, node);
        if(isSlow(node.x+1, node.y+1))
            downright.startDistance += sqrt50;
        else
            downright.startDistance += sqrt2;
        if(!wasVisited(downright)){
            addOrUpdateHeap(downright)
        }
    }

    if(node.x < GRID_DIMENSIONS - 1 && node.y > 0 
        && !isWall(node.x+1, node.y-1) && !isWall(node.x+1, node.y) && !isWall(node.x, node.y-1)){
        let upright = new PathNode(node.x+1, node.y-1, node.startDistance, node);
        if(isSlow(node.x+1, node.y-1))
            upright.startDistance += sqrt50;
        else
            upright.startDistance += sqrt2;
        if(!wasVisited(upright)){
            addOrUpdateHeap(upright)
        }
    }

    if(node.x > 0 && node.y < GRID_DIMENSIONS - 1 
        && !isWall(node.x-1, node.y+1) && !isWall(node.x-1, node.y) && !isWall(node.x, node.y+1)){
        let downleft = new PathNode(node.x-1, node.y+1, node.startDistance, node);
        if(isSlow(node.x-1, node.y+1))
            downleft.startDistance += sqrt50;
        else
            downleft.startDistance += sqrt2;
        if(!wasVisited(downleft)){
            addOrUpdateHeap(downleft)
        }
    }
}

let mouseActionStartType = null;
function mouseDown(e){
    let elem = e.target;
    if(elem.className.includes("starttile")){
        mouseActionStartType = "starttile";
    } else if (elem.className.includes("endtile")){
        mouseActionStartType = "endtile";
    } else {
        mouseActionStartType = "tile";
    }
    mouseMove(e);
    resetAlgorithm();
}

function mouseUp(e){
    if(mouseActionStartType != null){
        mouseActionStartType = null;
        resetAlgorithm();
        resumeAlgorithm();
    }
}

function mouseMove(e){
    if(mouseActionStartType == null)
        return;
    if(e.which == 0) // no button pressed
        return;

    let elem = e.target;
    let coords = idToXY(elem.id);
    if(mouseActionStartType == "starttile"){
        setStart(coords[0], coords[1]);
    } else if (mouseActionStartType == "endtile"){
        setEnd(coords[0], coords[1]);
    } else {
        elem.className = elem.className.replace(" walltile", "");
        elem.className = elem.className.replace(" slowtile", "");
        if(e.which == 1){
            // left button
            elem.className += " walltile";
        } else if (e.which == 2){
            // middle button
            elem.className += " slowtile";
        } 
        
        // right button (e.which == 3) clears the tile
    }

}

