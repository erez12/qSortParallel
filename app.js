"use strict"

let log = (a) => { console.log(a) }
let toQueryString = (obj) => Object.keys(obj).map( key => key + "=" + obj[key] ).join('&');
const fs = require('fs');
const childProcess = require('child_process');
const THOUSEND = 1000;
const MILLION = THOUSEND * THOUSEND
const REQUEST_PARAMS = {
   // num: 10 * MILLION,
   num: 100 * MILLION,
   min: 1,
   max: 1000 * MILLION,
   col: 1,
   base: 10,
   format: 'plain',
   rnd: 'new'
};
const PATH = 'https://www.random.org/integers/?' + toQueryString(REQUEST_PARAMS);
let isEmpty = (arr) => arr.length === 0;
let append = (xs, ys) => isEmpty(xs) ? ys : xs.concat(ys);
let smaller = (xs, x) => xs.filter(a => a <= x);
let larger = (xs, x) => xs.filter(b => b > x);
let compare = (x,y) => x-y

function generateRandoms(){
   var arr = [];
   for (var i = 0; i < REQUEST_PARAMS.num; i++){
      arr.push(Math.floor(Math.random() * REQUEST_PARAMS.max) + REQUEST_PARAMS.min)
   }

   return arr;
}

function saveToFile(arr){
   return new Promise((resolve, reject) => {
      fs.writeFile("./sorted.txt", arr, function(err) {
         if (err) return reject(err);
         resolve(arr);
      });
   });
}


function mergeSorted(source, xs, ys){
    let i_xs = 0;
    let i_ys = 0;
    let l = 0;
    let current;

    for (; i_xs < xs.length && i_ys < ys.length; l++){
        if (xs[i_xs] <= ys[i_ys]){
            current = xs[i_xs];
            i_xs++;
        } else {
            current = ys[i_ys];
            i_ys++;
        }

        source[l] = current;
    }

    for (;i_xs < xs.length; i_xs++, l++) {
        source[l] = xs[i_xs];
    }

    for (;i_ys < ys.length; i_ys++, l++) {
        source[l] = ys[i_ys];
    }
    return source;
}
function getSorter(xs){
    log("getSorter " + xs.length);
    return new Promise((resolve, _) => {
       let child = childProcess.fork('./app.js', [true], {
          execArgv: ['--max-old-space-size=4096']
       });
       child.on('message', resolve);
    //    child.send({data: xs});
    });
}
function sortAsync(arr) {
   console.log("sortAsync " + arr.length);
   return new Promise((resolve, _) => {
      if (isEmpty(arr)) return resolve([]);
      if (arr.length <= 10 * MILLION) return resolve(arr.sort(compare));

      let headSorter = getSorter(arr.slice(0, arr.length/2));
      let tailSorter = getSorter(arr.slice(arr.length/2));

      Promise.all([headSorter, tailSorter])
        .then( (sorted) => resolve(mergeSorted(arr, sorted[0], sorted[1])) );
   });
}

function runAsChild(){
   process.on('message', function(data){
      console.log("CHILD " + process.pid + " sort " + data.data.length + " numbers");

      sortAsync(data.data).then((res) => {
         process.send(res);
      });
   });
}
function runAsParent(){
   console.log("runAsParent");
   let numbers = generateRandoms();
   log("starting");
   let start = Date.now();
   sortAsync(numbers)
       .then( (sorted) => log("End sorting " + sorted.length + " numbers in " +  ((Date.now() - start) / 1000 )) )
       .then( () => process.exit(0))
       .catch( (a,b,c) => log(a + " " + b + " " + c) );
}
// Main
var asChild = !!process.argv[2]; // elements 0 and 1 are already populated with env info
asChild ? runAsChild() : runAsParent();
