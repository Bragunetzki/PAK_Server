const express = require('express');
//const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors')
const fs = require('fs');
const {exec} = require('child_process');
const genPath = 'city_generation'
const jsonParser = bodyParser.json()

const hostname = '10.244.204.9';
const port = 8000;
const app = express();
let last_vertex_id = -1;

let last_edge_id = -1;
let last_object_id = -1;
let last_quarter_id = -1;
let last_user_id = -1;

const mapData = {
    id: 0,
    vertices: new Map(),
    edges: new Map(),
    texts: new Map(),
    objects: new Map(),
    quarters: new Map()
}

/*const sessionConfig = {
    secret: 'amogus',
    resave: false,
    saveUninitialized: false
}*/

app.use(cookieParser())
app.use(cors())
//app.use(session(sessionConfig))

const maps = new Map()

async function generate_quarter(quarter) {
    fs.writeFile(`./${genPath}/quarter.json`, JSON.stringify(quarter), function (err) {
        if (err) {
            console.log(err);
        }
    })

    let obj
    let execPromise = function () {
        return new Promise((resolve) => {
            exec(`java -jar ./${genPath}/quarter_generator.jar quarter ./${genPath}/quarter.json ./${genPath}/`, (error, stdout, stderr) => {
                console.log(stdout);
                console.log(stderr);
                if (error) {
                    console.log(`exec error: ${error}`);
                } else {
                    console.log(`generation complete`)
                }
                resolve()
            })
        })
    }

    return new Promise((resolve) => {
        execPromise().then(() => {
            fs.readFile(`./${genPath}/buildings.json`, 'utf8', (err, data) => {
                obj = JSON.parse(data);
                resolve(obj)
            })
        })
    })
}

async function generate_city(cityConfig) {
    fs.writeFile(`./${genPath}/city_config.json`, JSON.stringify(cityConfig), function (err) {
        if (err) {
            console.log(err);
        }
    })

    let execPromise = function () {
        return new Promise((resolve) => {
            exec(`java -jar ./${genPath}/quarter_generator.jar city ./${genPath}/city_config.json ./${genPath}/`, (error, stdout, stderr) => {
                console.log(stdout);
                console.log(stderr);
                if (error != null) {
                    console.log(`exec error: ${error}`);
                } else {
                    console.log("generation complete")
                }
                resolve()
            })
        })
    }

    let obj
    return new Promise((resolve) => {
        execPromise().then(() => {
                fs.readFile(`./${genPath}/buildings.json`, 'utf8', (err, data) => {
                    obj = JSON.parse(data);
                    resolve(obj)
                })
            }
        )
    })
}

app.post('/login', jsonParser, (req, res) => {
    console.log(`User logging in...`)
    let map_id = req.body.map_id

    if (maps.has(map_id)) {
        req.session.map_id = map_id
    } else {
        maps.set(map_id, {
            id: map_id,
            vertices: new Map(),
            edges: new Map(),
            texts: new Map(),
            objects: new Map(),
            quarters: new Map()
        })
        req.session.map_id = map_id
    }


    let response = {
        response: true
    }
    if (!req.session.user_id && req.session.user_id !== 0) {
        req.session.user_id = ++last_user_id
    }
    res.json(response);
    console.log(`User ${req.session.user_id} logged in`)
    console.log(`Session: ${req.session.id}`)
})

app.get('/get_map', jsonParser, (req, res) => {
    //let mapData = maps.get(req.session.map_id)
    let vertices = Array.from(mapData.vertices.values())
    let texts = Array.from(mapData.texts.values())
    let edges = Array.from(mapData.edges.values())
    let objects = Array.from(mapData.objects.values())
    let quarters = Array.from(mapData.quarters.values())

    let response = {
        response: true,
        vertices: vertices,
        texts: texts,
        edges: edges,
        objects: objects,
        quarters: quarters
    }
    res.json(response);
    //console.log(response)
})

app.post('/vertices/add', jsonParser, (req, res) => {
    //let mapData = maps.get(req.session.map_id)
    console.log(req.body)
    let x = req.body.x
    let y = req.body.y
    let id = ++last_vertex_id
    let response = {
        response: true,
        id: id,
        x: x,
        y: y
    }

    if (mapData.vertices.has(id)) {
        response.response = false
    } else {
        mapData.vertices.set(id, {id: id, x: x, y: y, selected: -1, related_quarter_ids: []})
    }
    res.json(response)
    console.log(response)
})

app.put('/vertices/select', jsonParser, (req, res) => {
    //let mapData = maps.get(req.session.map_id)
    let id = req.body.id
    let user_id = req.body.user_id

    let response = {
        response: true,
        id: id
    }

    if (mapData.vertices.has(id)) {
        if (mapData.vertices.get(id).selected === -1) {
            mapData.vertices.get(id).selected = user_id
        } else {
            response.response = false
        }
    } else {
        response.response = false
    }

    res.json(response)
    console.log(response)
})

app.put('/vertices/delete', jsonParser, (req, res) => {
    //let mapData = maps.get(req.session.map_id)
    let id = req.body.id

    let response = {
        response: true,
        id: id
    }

    if (mapData.vertices.has(id)) {
        mapData.vertices.delete(id)
    } else {
        response.response = false
    }

    res.json(response)
    console.log(response)
})

app.put('/vertices/move', jsonParser, (req, res) => {
    //let mapData = maps.get(req.session.map_id)
    let id = req.body.id
    let user_id = req.body.user_id
    let x = req.body.x
    let y = req.body.y

    let response = {
        response: true,
        id: id,
        x: x,
        y: y
    }

    if (mapData.vertices.has(id)) {
        if (mapData.vertices.get(id).selected === user_id) {
            let vertex = mapData.vertices.get(id)
            vertex.x = x
            vertex.y = y
            vertex.selected = -1
            let edgesArr = Array.from(mapData.edges.values())
            for (let i = 0; i < edgesArr.length; i++) {
                if (edgesArr[i].id1 === id) {
                    edgesArr[i].start[0] = x
                    edgesArr[i].start[1] = y
                }
                if (edgesArr[i].id2 === id) {
                    edgesArr[i].end[0] = x
                    edgesArr[i].end[1] = y
                }
            }

        } else {
            response.response = false
        }
    } else {
        response.response = false
    }

    let updatedQuarters = mapData.vertices.get(id).related_quarter_ids
    for (let i = 0; i < updatedQuarters.length; i++) {
        let quarterId = updatedQuarters[i]
        let quarter = mapData.quarters.get(quarterId)

        let quarterConfig = {
            color: quarter.color,
            borders: quarter.borders
        }

        generate_quarter(quarterConfig).then((buildings) => {
            mapData.quarters.get(quarterId).buildings = buildings
        })
    }

    res.json(response)
    console.log(response)
})

app.post('/edges/add', jsonParser, (req, res) => {
    //let mapData = maps.get(req.session.map_id)
    console.log(req.body)
    let id1 = req.body.id1
    let id2 = req.body.id2
    let id = ++last_edge_id
    let coords1 = req.body.start
    let coords2 = req.body.end

    let response = {
        response: true,
        id: id,
        id1: id1,
        id2: id2,
        start: coords1,
        end: coords2
    }

    if (mapData.edges.has(id)) {
        response.response = false
    } else {
        if (!mapData.vertices.has(id1)) {
            mapData.vertices.set(id1, {id: id1, x: coords1[0], y: coords1[1], selected: -1, related_quarter_ids: []})
        }
        if (!mapData.vertices.has(id2)) {
            mapData.vertices.set(id2, {id: id2, x: coords2[0], y: coords2[1], selected: -1, related_quarter_ids: []})
        }
        mapData.edges.set(id, {id: id, id1: id1, id2: id2, start: coords1, end: coords2})
    }
    res.json(response)
    console.log(response)
})

app.post('/edges/add2', jsonParser, (req, res) => {
    //let mapData = maps.get(req.session.map_id)
    console.log(req.body)
    let id1 = req.body.id1
    let id = ++last_edge_id
    let coords1 = req.body.start
    let coords2 = req.body.end

    let idVert = ++last_vertex_id

    mapData.vertices.set(idVert, {id: idVert, x: coords2[0], y: coords2[1], selected: -1, related_quarter_ids: []})

    let response = {
        response: true,
        id: id,
        id1: id1,
        id2: idVert,
        start: coords1,
        end: coords2
    }

    if (mapData.edges.has(id)) {
        response.response = false
    } else {
        if (!mapData.vertices.has(id1)) {
            mapData.vertices.set(id1, {id: id1, x: coords1[0], y: coords1[1], selected: -1, related_quarter_ids: []})
        }
        if (!mapData.vertices.has(idVert)) {
            mapData.vertices.set(idVert, {
                id: idVert,
                x: coords2[0],
                y: coords2[1],
                selected: -1,
                related_quarter_ids: []
            })
        }
        mapData.edges.set(id, {id: id, id1: id1, id2: idVert, start: coords1, end: coords2})
    }
    res.json(response)
    console.log(response)
})

app.put('/edges/delete', jsonParser, (req, res) => {
    //let mapData = maps.get(req.session.map_id)
    let id = req.body.id

    let response = {
        response: true,
        id: id
    }

    if (mapData.edges.has(id)) {
        mapData.edges.delete(id)
    } else {
        response.response = false
    }

    res.json(response)
    console.log(response)
})

app.post('/objects/add', jsonParser, (req, res) => {
    //let mapData = maps.get(req.session.map_id)
    console.log(req.body)
    let color = req.body.color
    let vertices = req.body.vertices
    let id = ++last_object_id
    let response = {
        response: true,
        id: id,
        vertices: vertices,
        color: color
    }

    if (mapData.objects.has(id)) {
        response.response = false
    } else {
        mapData.objects.set(id, {
            id: id,
            selected: -1,
            vertices: vertices,
            color: color
        })
    }
    res.json(response)
    console.log(response)
})

app.put('/objects/select', jsonParser, (req, res) => {
    //let mapData = maps.get(req.session.map_id)
    console.log(req.body)
    let id = req.body.id

    let response = {
        response: true,
        id: id
    }

    if (mapData.objects.has(id)) {
        mapData.objects.get(id).selected = 1
    } else {
        response.response = false
    }

    res.json(response)
    console.log(response)
})

app.put('/objects/deselect', jsonParser, (req, res) => {
    //let mapData = maps.get(req.session.map_id)
    console.log(req.body)
    let id = req.body.id

    let response = {
        response: true,
        id: id
    }

    if (mapData.objects.has(id)) {
        if (mapData.objects.get(id).selected === 1) {
            mapData.objects.get(id).selected = -1
        } else {
            response.response = false
        }
    } else {
        response.response = false
    }

    res.json(response)
    console.log(response)
})

app.put('/objects/delete', jsonParser, (req, res) => {
    //let mapData = maps.get(req.session.map_id)
    console.log(req.body)
    let id = req.body.id

    let response = {
        response: true,
        id: id
    }

    if (mapData.objects.has(id)) {
        if (mapData.objects.get(id).selected === 1)
            mapData.objects.delete(id)
        else response.response = false
    } else {
        response.response = false
    }

    res.json(response)
    console.log(response)
})


app.put('/objects/edit', jsonParser, (req, res) => {
    //let mapData = maps.get(req.session.map_id)
    console.log(req.body)
    let color = req.body.color
    let vertices = req.body.vertices
    let id = req.body.id
    let response = {
        response: true,
        id: id,
        vertices: vertices,
        color: color
    }

    if (mapData.objects.has(id)) {
        let object = mapData.objects.get(id)
        object.vertices = vertices
        object.color = color
    } else {
        response.response = false
    }

    res.json(response)
    console.log(response)
})

app.put('/quarters/generate', jsonParser, async (req, res) => {
    //let mapData = maps.get(req.session.map_id)
    console.log(req.body)
    let quarterReq = req.body.quarter
    let quarterConfig = {
        color: quarterReq.color,
        borders: []
    }

    for (let i = 0; i < quarterReq.borders.length; i++) {
        let start = quarterReq.borders[i].start;
        let end = quarterReq.borders[i].end;
        let border = {
            start: start,
            end: end
        }
        quarterConfig.borders.push(border)
    }

    generate_quarter(quarterConfig).then((buildings) => {
        let quarter = {
            id: ++last_quarter_id,
            color: quarterReq.color,
            buildings: buildings,
            borders: quarterReq.borders
        }

        for (let i = 0; i < quarterReq.borders.length; i++) {
            let vertID
            let border = quarterReq.borders[i]
            let mapArr = Array.from(mapData.vertices.values())
            for (let j = 0; j < mapData.vertices.size; j++) {
                let vertex = mapArr[j]
                if (vertex.x === border.start[0] && vertex.y === border.start[1]) {
                    vertID = vertex.id
                    break
                }
            }
            mapData.vertices.get(vertID).related_quarter_ids.push(quarter.id)
        }

        let response = {
            response: true,
            quarter: quarter
        }

        mapData.quarters.set(quarter.id, quarter)
        res.json(response)
        console.log(response)
    })
})

app.put('/generate', jsonParser, (req, res) => {
    console.log(req.body)
    let cityConfig = {
        shape: req.body.shape,
        start: req.body.start,
        sideLength: req.body.sideLength,
        coloring: req.body.coloring
    }

    generate_city(cityConfig).then((result) => {
        mapData.quarters.clear()
        mapData.vertices.clear()
        mapData.edges.clear()
        mapData.objects.clear()
        for (let i = 0; i < result.length; i++) {
            let elem = result[i]
            let quarter = {
                id: ++last_quarter_id,
                color: elem.buildings[0].color,
                buildings: elem.buildings,
                borders: elem.borders
            }

            for (let j = 0; j < elem.borders.length; j++) {
                let edges = Array.from(mapData.edges.values())
                let border = elem.borders[j]
                let borderExists = false
                for (let k = 0; k < edges.length; k++) {
                    let edge = edges[k]
                    if (edge.start[0] === border.start[0] && edge.start[1] === border.start[1] && edge.end[0] === border.end[0] && edge.end[1] === border.end[1]) {
                        borderExists = true
                        break
                    }
                }

                if (!borderExists) {
                    let id1 = ++last_vertex_id
                    let id2 = ++last_vertex_id
                    mapData.vertices.set(id1, {
                        id: id1,
                        x: border.start[0],
                        y: border.start[1],
                        selected: -1,
                        related_quarter_ids: []
                    })
                    mapData.vertices.set(id2, {
                        id: id2,
                        x: border.end[0],
                        y: border.end[1],
                        selected: -1,
                        related_quarter_ids: []
                    })
                    mapData.edges.set(++last_edge_id, {
                        id: last_edge_id,
                        id1: id1,
                        id2: id2,
                        start: border.start,
                        end: border.end
                    })
                }
            }
            mapData.quarters.set(quarter.id, quarter)
        }
        let response = {
            response: true,
            result: result
        }
        res.json(response)
        console.log(response)
    })
})

app.listen(port, hostname, () => {
    console.log(`Server listening on http://${hostname}:${port}`)
})