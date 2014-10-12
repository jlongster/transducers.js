var Benchmark = require('benchmark');
var t = require('../transducers');
var _ = require('lodash');
var u = require('underscore');
var suite = Benchmark.Suite('transducers');

function double(x) { return x * 2; };

function multipleOfFive(x) { return x % 5 === 0; }

function baseline(arr, limit) {
  var result = new Array(limit);
  var entry;
  var count = 0;
  var index = 0;
  var length = arr.length;

  while (count < limit && index < length) {
    var entry = double(arr[index]);

    if (multipleOfFive(entry)) {
      result[count] = entry;
      count++;
    }

    index++;
  }

  if (limit !== count) {
    result.length = count;
  }

  return result;
}

function benchArray(n) {
  var arr = _.range(n);

  suite
    .add(' (n=' + n + ') hand-rolled baseline', function() {
      baseline(arr, 20);
    })
    .add(' (n=' + n + ') native', function() {
      arr
        .map(double)
        .filter(multipleOfFive)
        .slice(0, 20);
    })
    .add(' (n=' + n + ') _.map/filter', function() {
      _(arr)
        .map(double)
        .filter(multipleOfFive)
        .take(20)
        .value();
    })
    .add(' (n=' + n + ') t.map/filter+transduce', function() {
      t.seq(arr,
            t.compose(
              t.map(double),
              t.filter(multipleOfFive),
              t.take(20)
            ));
    })
}

[1, 2, 10, 50, 100, 1000, 10000, 100000].forEach(function(n){
  benchArray(n);
});

suite.on('cycle', function(event) {
  console.log(String(event.target));
});

suite.run();
