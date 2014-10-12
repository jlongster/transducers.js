var Benchmark = require('benchmark');
var t = require('../transducers');
var _ = require('lodash');
var u = require('underscore');
var suite = Benchmark.Suite('transducers');

function benchArray(n) {
  var arr = _.range(n);

  suite
    .add('_.map/filter (' + n + ')', function() {
      // not even going to use chaining, it's slower
      _.filter(
        _.filter(
          _.map(
            _.map(arr, function(x) { return x + 10}),
            function(x) { return x * 2; }),
          function(x) { return x % 5 === 0;}),
        function(x) { return x % 2 === 0; }
      );
    })
    .add('u.map/filter (' + n + ')', function() {
      // not even going to use chaining, it's slower
      u.filter(
        u.filter(
          u.map(
            u.map(arr, function(x) { return x + 10}),
            function(x) { return x * 2; }),
          function(x) { return x % 5 === 0;}),
        function(x) { return x % 2 === 0; }
      );
    })
    .add('t.map/filter+transduce (' + n + ')', function() {
      t.into([],
             t.compose(
               t.map(function(x) { return x + 10; }),
               t.map(function(x) { return x * 2; }),
               t.filter(function(x) { return x % 5 === 0; }),
               t.filter(function(x) { return x % 2 === 0; })
             ),
             arr);
    })
}

for(var i=1000; i<=51000; i+=10000) {
  benchArray(i);
}

var currentData = {};
function print() {
  process.stdout.write(currentData.size + ' ');
  currentData.cols.forEach(function(col, i) {
    process.stdout.write(col + ' ');
  });
  console.log('');
}

suite.on('cycle', function(event) {
  var size = parseInt(event.target.name.match(/\((.*)\)/)[1]);
  if(currentData.size !== size) {
    if(currentData.size) {
      print();
    }
    currentData = { size: size,
                    cols: [] };
  }

  currentData.cols.push(event.target.hz);
});

suite.on('complete', function(event) {
  print();
});

suite.run();
