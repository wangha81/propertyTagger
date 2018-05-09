const turf = require("@turf/turf");
const fs = require('fs');
const taiwanBaseline = require("./taiwan_baseline.json");
const fileList = require('./file_list.json');
const dir = './dataSource/';

function getData(path) {
    return new Promise((res, rej) => {
        fs.readFile(path, 'utf8', function (err, data) {
            if (err) throw err;
            let obj = JSON.parse(data);
            res(obj);
        });
    });
}

function transToGeo(tpy = null) {
    return new Promise((res, rej) => {
        if (tpy == null) res(false);
        let posints = tpy.Route.map(point => {
            //Longest_radius_of_30kt
            let point_g = turf.point([point.Longitude, point.Latitude]);
            return (point.Longest_radius_of_30kt) ? turf.buffer(point_g, point.Longest_radius_of_30kt, {
                units: 'nauticalmiles'
            }) : point_g;
        });
        res(posints)
    });
}
async function crossChecking(bubbles) {
    return new Promise((res, rej) => {
        let cross_all = bubbles.map(f => {
            //console.log(f)
            let c = turf.booleanDisjoint(taiwanBaseline, f);
            return c;
        }).filter(x => !x);
        res(cross_all.length > 0);
    });
}

async function workFlow(fn) {
    let tpy = await getData(fn);
    let bubbles = await transToGeo(tpy);
    let result = await crossChecking(bubbles);
    //console.log(result, fn);
    return {
        'fileName': fn,
        'cross_taiwan': result
    };
}

////**********Entry section***********////
let runs = fileList.map(fn => {
    let path = dir + fn;
    let cross = workFlow(path);
    return cross;
});
Promise.all(runs).then(results => {
    //console.log(results);
    let data = JSON.stringify(results);
    fs.writeFileSync('file_list_tagged.json', data);
}).catch(e => {
    console.log(e);
});