var Benchmark = require('benchmark');
var t = require('../transducers');
var _ = require('lodash');
var suite = Benchmark.Suite('transducers');

var arr = _.range(1000);

suite
  // .add('_.reduce', function() {
  //     _.reduce(arr,
  //              function(result, x) { return result + x; },
  //              0);
  // })
  // .add('t#reduce', function() {
  //   t.reduce(arr,
  //            function(result, x) { return result + x },
  //            0);
  // })
  .add('_.map/filter', function() {
    _.filter(_.map(arr, function(x) { return x * 2; }),
             function(x) { return x % 5 === 0;});
  })
  .add('t.map/filter', function() {
    t.into([],
           t.compose(
             t.map(function(x) { return x * 2; }),
             t.filter(function(x) { return x % 5 === 0; })
           ),
           arr);
  })
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .run();
