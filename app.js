"use strict"

let log = (a) => { console.log(a) }
let toQueryString = (obj) => Object.keys(obj).map( key => key + "=" + obj[key] ).join('&');
const fs = require('fs');
const childProcess = require('child_process');
const THOUSEND = 1000;
const MILLION = THOUSEND * THOUSEND
const REQUEST_PARAMS = {
   // num: 10 * MILLION,
   num: 10 * MILLION,
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
      if (arr.length <= 5 * MILLION) return resolve(qsort(arr));

      let x = arr[0];
      let xs = arr.slice(1);

      let smaller_xs = smaller(xs, x);
      let larger_xs = larger(xs, x)

      let p1 = new Promise((resolve, _) => {
         let child = childProcess.fork('./app.js', [true], { 
            execArgv: ['--max-old-space-size=4096']
         });
         child.on('message', resolve);
         child.send({ data: smaller_xs});
      });


      let p2 = new Promise((resolve, _) => {
         let child = childProcess.fork('./app.js', [true], { 
            execArgv: ['--max-old-space-size=4096']
         });
         child.on('message', resolve);
         child.send({ data: larger_xs});
      });


      return Promise.all([p1, p2]).then( (sorted) => resolve(sorted[0].concat([x]).concat(sorted[1])) );
   });
}

function runAsChild(){
   process.on('message', function(data){
      console.log("CHILD " + process.pid + " sort " + data.data.length + " numbers");

      qsortAsync(data.data).then((res) => {
         process.send(res);
      });
   });
}
function runAsParent(){
   console.log("runAsParent");
   let start;
   getRandomNumbers()
      .then((numbers) => {
         let start = Date.now();
         numbers.sort();

         log("End Normal sorting " + numbers.length + " numbers in " +  ((Date.now() - start) / 1000 ));
         let start_again = Date.now();
         numbers.sort();
         
         log("End Second Normal sorting " + numbers.length + " numbers in " +  ((Date.now() - start_again) / 1000 ));
         return [];
      })
      .then((numbers) => {
         start = Date.now();
         return numbers;
      })
      .then(qsortAsync)
      .then( (sorted) => log("End sorting " + sorted.length + " numbers in " +  ((Date.now() - start) / 1000 )) )
      .then( () => process.exit(0))
      .catch( (a,b,c) => log(a + " " + b + " " + c) );
}
// Main
var asChild = !!process.argv[2]; // elements 0 and 1 are already populated with env info
asChild ? runAsChild() : runAsParent();
