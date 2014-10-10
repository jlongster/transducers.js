var Benchmark = require('benchmark');
var t = require('../transducers');
var _ = require('lodash');
var u = require('underscore');
var suite = Benchmark.Suite('transducers');

function benchArray(n) {
  var arr = _.range(n);

  suite
    .add('_.map/filter (' + n + ')', function() {
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
      u.filter(
        u.filter(
          u.map(
            u.map(arr, function(x) { return x + 10}),
            function(x) { return x * 2; }),
          function(x) { return x % 5 === 0;}),
        function(x) { return x % 2 === 0; }
      );
    })
    .add('t.map/filter (' + n + ')', function() {
      t.filter(function(x) { return x % 2 === 0; },
               t.filter(function(x) { return x % 5 === 0; },
                        t.map(function(x) { return x * 2; },
                              t.map(function(x) { return x + 10; }, arr))));
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
    });
}

benchArray(10000);
benchArray(300000);

suite.on('cycle', function(event) {
  console.log(String(event.target));
}).run();
