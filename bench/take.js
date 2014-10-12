var Benchmark = require('benchmark');
var t = require('../transducers');
var _ = require('lodash');
var u = require('underscore');
var suite = Benchmark.Suite('transducers');

function benchArray(n) {
  var arr = _.range(n);

  suite
    .add('_.map/filter (' + n + ')', function() {
      _(arr)
        .map(function(x) { return x * 2; })
        .filter(function(x) { return x % 5 === 0;})
        .take(20);
    })
    .add('t.map/filter+transduce (' + n + ')', function() {
      t.seq(arr,
            t.compose(
               t.map(function(x) { return x * 2; }),
               t.filter(function(x) { return x % 5 === 0; }),
               t.take(20)
            ));
    })
}

benchArray(1000);
benchArray(100000);

suite.on('cycle', function(event) {
  console.log(String(event.target));
});

suite.run();
