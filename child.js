// process.on('message', function(m) {
//   console.log('CHILD got message:', m.length);
//   process.send(m);
// });


"use strict"

let isEmpty = (arr) => arr.length === 0;
let append = (xs, ys) => isEmpty(xs) ? ys : xs.concat(ys);
let smaller = (xs, x) => xs.filter(a => a <= x);
let larger = (xs, x) => xs.filter(b => b > x);

function qsort(arr){
   if (isEmpty(arr)) return [];

   let x = arr[0];
   let xs = arr.slice(1);
   return ( qsort(smaller(xs, x)) ).concat( [x] ).concat( (qsort(larger(xs, x))) );
}

process.on('message', function(data){
   console.log("CHILD got can spawn " + data.args + " children");
   process.send(qsort(data.data));
});
