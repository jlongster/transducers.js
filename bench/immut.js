var Benchmark = require('benchmark');
var t = require('../transducers');
var Immutable = require('immutable');
var suite = Benchmark.Suite('transducers');

function benchArray(n) {
  var arr = new Immutable.Range(0, n).toVector();

  suite
    .add('Immutable map/filter (' + n + ')', function() {
      arr.map(function(x) { return x + 10; })
        .map(function(x) { return x * 2; })
        .filter(function(x) { return x % 5 === 0; })
        .filter(function(x) { return x % 2 === 0; })
        .toVector();
    })
    .add('transducer map/filter (' + n + ')', function() {
      Immutable.Vector.from(
        t.seq(arr,
              t.compose(
                t.map(function(x) { return x + 10; }),
                t.map(function(x) { return x * 2; }),
                t.filter(function(x) { return x % 5 === 0; }),
                t.filter(function(x) { return x % 2 === 0; })))
      )
    });
}

benchArray(1000);
benchArray(100000);

suite.on('cycle', function(event) {
  console.log(String(event.target));
});

suite.run();
