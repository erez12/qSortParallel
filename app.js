// var n = require('child_process').fork('./child.js');
// n.on('message', function(m) {
//   console.log('PARENT got message:', m.length);
// });
// n.send(new Array(60 * 1000));

"use strict"

let log = (a) => { console.log(a) }
let toQueryString = (obj) => Object.keys(obj).map( key => key + "=" + obj[key] ).join('&');
const request = require('request');
const fs = require('fs');
const childProcess = require('child_process');
const THOUSEND = 1000;
const MILLION = THOUSEND * THOUSEND
const REQUEST_PARAMS = {
   num: 10 * MILLION,
   min: 1,
   max: MILLION,
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
let allowedChildren = process.env.CHILD_COUNT || 2;

function generateRandoms(){
   var arr = [];
   for (var i = 0; i < REQUEST_PARAMS.num; i++){
      arr.push(Math.floor(Math.random() * REQUEST_PARAMS.max) + REQUEST_PARAMS.min)
   }

   return arr;
}
function getRandomNumbers(){
   return new Promise((resolve, _) => {
      return resolve(generateRandoms());
      // request(PATH, function (error, response, body) {
      //   if (error || response.statusCode !== 200) {
      //     resolve(generateRandoms());
      //     return;
      //   }
      //
      //   resolve(body.trim().split('\n').map( (x) => parseInt(x) ))
      // });
   })
}
function saveToFile(arr){
   return new Promise((resolve, reject) => {
      fs.writeFile("./sorted.txt", arr, function(err) {
         if (err) return reject(err);
         resolve(arr);
      });
   });
}


function qsort(arr){
   if (isEmpty(arr)) return [];

   let x = arr[0];
   let xs = arr.slice(1);
   return ( qsort(smaller(xs, x)) ).concat( [x] ).concat( (qsort(larger(xs, x))) );
}
function qsortAsync(arr) {
   return new Promise((resolve, _) => {
      if (isEmpty(arr)) return resolve([]);

      let x = arr[0];
      let xs = arr.slice(1);

      allowedChildren = allowedChildren - 2;

      let p1 = new Promise((resolve, _) => {
         let child = childProcess.fork('./app.js', [allowedChildren])
         child.on('message', resolve);
         child.send({ data: smaller(xs, x), args: allowedChildren });
      });

      allowedChildren = allowedChildren - 2;

      let p2 = new Promise((resolve, _) => {
         let child = childProcess.fork('./app.js', [allowedChildren])
         child.on('message', resolve);
         child.send({ data: larger(xs, x), args: allowedChildren });
      });


      return Promise.all([p1, p2]).then( (sorted) => resolve(sorted[0].concat([x]).concat(sorted[1])) );
   });
}

function runAsChild(){
   process.on('message', function(data){
      console.log("CHILD " + process.pid + " sort " + data.data.length + " numbers");
      allowedChildren = parseInt(data.args);

      if (allowedChildren > 0 && allowedChildren % 2 == 0) {
         qsortAsync(data.data).then((res) => {
            process.send(res);
         });
         return;
      }
      process.send(qsort(data.data));
   });
}
function runAsParent(){
   console.log("runAsParent");
   let start;
   getRandomNumbers()
      .then((numbers) => {
         start = Date.now();
         return numbers;
      })
      .then(qsortAsync)
      .then( (sorted) => log("End sorting " + sorted.length + " numbers in " +  (Date.now() - start) / 1000 ) + " secs")
      .then( () => process.exit(0))
      .catch( (a,b,c) => log(a + " " + b + " " + c));
}
// Main
var asChild = !!process.argv[2]; // elements 0 and 1 are already populated with env info
asChild ? runAsChild() : runAsParent();
