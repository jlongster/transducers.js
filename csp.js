var t = require('./transducers');
var csp = require('js-csp');
var go = csp.go;
var put = csp.put;
var take = csp.take;
var chan = csp.chan;

var ch = chan();

go(function*() {
  yield put(ch, 1);
  yield put(ch, 2);
  yield put(ch, 3);
  yield put(ch, 4);
});

go(function*() {
  var outch = reduceChan(ch, t.map(function(x) { return x + 1; }), []);
  while(!outch.closed) {
    console.log(yield take(outch));
  }
});


// var arr = [1, 2, 3, 4];
// transduce(
//   arr,
//   map(x => x + 1),
//   function(result, input) {
//     result.putAsync(input);
//   },
//   chan();
// )
