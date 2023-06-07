const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const jsonParser = bodyParser.json()
const hostname = 'localhost';
const port = 8000;
const app = express();

let last_vertex_id = -1;
let last_edge_id = -1;
let last_text_id = -1;
let last_object_id = -1;
let last_user_id = -1;

app.use(cookieParser())

app.use(session({
    secret: 'amogus',
    resave: false,
    saveUninitialized: true,
    cookie: {secure: false}
}))

const maps = new Map()

app.post('/login', jsonParser, (req, res) => {
    let map_id = req.body.map_id

    if (maps.has(map_id)) {
        req.session.map_id = map_id
    }
    else {
        maps.set(map_id, {
            id: map_id,
            vertices: new Map(),
            edges: new Map(),
            texts: new Map(),
            objects: new Map(),
            quarters: []
        })
        req.session.map_id = map_id
    }

    if (req.session.user_id) {
        res.send(`Already logged in as user ${req.session.user_id}`)
    } else {
        req.session.user_id = ++last_user_id
        res.send(`Welcome, user ${req.session.user_id}`)
    }
})

app.get('/get_map', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
    let vertices = Array.from(mapData.vertices.values())
    let texts = Array.from(mapData.texts.values())
    let edges = Array.from(mapData.edges.values())
    let objects = Array.from(mapData.objects.values())
    let quarters = mapData.quarters

    let response = {
        response: true,
        vertices: vertices,
        texts: texts,
        edges: edges,
        objects: objects,
        quarters: quarters
    }
    res.json(response);
    console.log(response)
})

app.post('/vertices/add', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
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
        mapData.vertices.set(id, {id: id, x: x, y: y, selected: -1})
    }
    res.json(response)
    console.log(response)
})

app.put('/vertices/select', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
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
    let mapData = maps.get(req.session.map_id)
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
    let mapData = maps.get(req.session.map_id)
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
        } else {
            response.response = false
        }
    } else {
        response.response = false
    }

    res.json(response)
    console.log(response)
})

app.post('/edges/add', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
    console.log(req.body)
    let id1 = req.id1
    let id2 = req.id2
    let id = ++last_edge_id
    let response = {
        response: true,
        id: id,
        id1: id1,
        id2: id2
    }

    if (mapData.edges.has(id)) {
        response.response = false
    } else {
        mapData.edges.set(id, {id: id, id1: id1, id2: id2})
    }
    res.json(response)
    console.log(response)
})

app.put('/edges/delete', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
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

app.post('/texts/add', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
    console.log(req.body)
    let x = req.body.x
    let y = req.body.y
    let text = req.body.text
    let id = ++last_text_id
    let response = {
        response: true,
        id: id,
        x: x,
        y: y,
        text: text
    }

    if (mapData.texts.has(id)) {
        response.response = false
    } else {
        mapData.texts.set(id, {
            id: id,
            x: x,
            y: y,
            text: text,
            selected: -1,
            rotation: 0,
            scaleX: 1,
            scaleY: 1
        })
    }
    res.json(response)
    console.log(response)
})

app.put('/texts/select', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
    let id = req.body.id
    let user_id = req.session.user_id

    let response = {
        response: true,
        id: id
    }

    if (mapData.texts.has(id)) {
        if (mapData.texts.get(id).selected === -1) {
            mapData.texts.get(id).selected = user_id
        } else {
            response.response = false
        }
    } else {
        response.response = false
    }

    res.json(response)
    console.log(response)
})

app.put('/texts/deselect', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
    let id = req.body.id
    let user_id = req.session.user_id

    let response = {
        response: true,
        id: id
    }

    if (mapData.texts.has(id)) {
        if (mapData.texts.get(id).selected === user_id) {
            mapData.texts.get(id).selected = -1
        } else {
            response.response = false
        }
    } else {
        response.response = false
    }

    res.json(response)
    console.log(response)
})

app.put('/texts/delete', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
    let id = req.body.id
    let user_id = req.session.user_id

    let response = {
        response: true,
        id: id
    }

    if (mapData.texts.has(id)) {
        if (mapData.texts.get(id).selected === user_id)
            mapData.texts.delete(id)
        else response.response = false
    } else {
        response.response = false
    }

    res.json(response)
    console.log(response)
})

app.put('/texts/edit', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
    let id = req.body.id
    let user_id = req.session.user_id
    let new_text = req.body.text

    let response = {
        response: true,
        id: id,
        text: new_text
    }

    if (mapData.texts.has(id)) {
        if (mapData.texts.get(id).selected === user_id)
            mapData.texts.get(id).text = new_text
        else response.response = false
    } else {
        response.response = false
    }

    res.json(response)
    console.log(req.body)
})

app.put('/texts/transform', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
    let id = req.body.id
    let user_id = req.session.user_id
    let x = req.body.x
    let y = req.body.y
    let rot = req.body.rotation
    let scaleX = req.body.scaleX
    let scaleY = req.body.scaleY

    let response = {
        response: true,
        id: id,
        x: x,
        y: y,
        rotation: rot,
        scaleX: scaleX,
        scaleY: scaleY
    }

    if (mapData.texts.has(id)) {
        if (mapData.texts.get(id).selected === user_id) {
            let text = mapData.texts.get(id)
            text.x = x
            text.y = y
            text.scaleX = scaleX
            text.scaleY = scaleY
            text.rotation = rot
        } else response.response = false
    } else {
        response.response = false
    }

    res.json(response)
    console.log(req.body)
})


app.post('/objects/add', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
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
    let mapData = maps.get(req.session.map_id)
    let id = req.body.id
    let user_id = req.session.user_id

    let response = {
        response: true,
        id: id
    }

    if (mapData.objects.has(id)) {
        if (mapData.objects.get(id).selected === -1) {
            mapData.objects.get(id).selected = user_id
        } else {
            response.response = false
        }
    } else {
        response.response = false
    }

    res.json(response)
    console.log(response)
})

app.put('/objects/deselect', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
    let id = req.body.id
    let user_id = req.session.user_id

    let response = {
        response: true,
        id: id
    }

    if (mapData.objects.has(id)) {
        if (mapData.objects.get(id).selected === user_id) {
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
    let mapData = maps.get(req.session.map_id)
    let id = req.body.id
    let user_id = req.session.user_id

    let response = {
        response: true,
        id: id
    }

    if (mapData.objects.has(id)) {
        if (mapData.objects.get(id).selected === user_id)
            mapData.objects.delete(id)
        else response.response = false
    } else {
        response.response = false
    }

    res.json(response)
    console.log(response)
})

app.put('/objects/edit', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
    let user_id = req.session.user_id
    let color = req.body.color
    let vertices = req.body.vertices
    let id = ++last_text_id
    let response = {
        response: true,
        id: id,
        vertices: vertices,
        color: color
    }

    if (mapData.objects.has(id)) {
        if (mapData.objects.get(id).selected === user_id) {
            let object = mapData.objects.get(id)
            object.vertices = vertices
            object.color = color
        } else response.response = false
    } else {
        response.response = false
    }

    res.json(response)
    console.log(req.body)
})


app.put('/quarters/generate', jsonParser, (req, res) => {
    let mapData = maps.get(req.session.map_id)
    let edges = req.body.edges
    let type = req.body.type

    let elements = generate_quarter(mapData, edges, type)

    let response = {
        response: true,
        elements: elements
    }

    res.json(response)
    console.log(req.body)
})

app.listen(port, hostname, () => {
    console.log(`Server listening on http://${hostname}:${port}`)
})
