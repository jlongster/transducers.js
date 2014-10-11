var expect = require('expect.js');
var Immutable = require('immutable');
var { reduce, reducer, iterate, push, merge, empty, transduce,
      seq, into, compose, map, filter, remove,
      cat, mapcat, keep, dedupe, take, takeWhile,
      drop, dropWhile, protocols } = require('../transducers');

// utility

function first(x) {
  return x[0];
}

function second(x) {
  return x[1];
}

function add(x, y) {
  return x + y;
}

Immutable.Vector.prototype[protocols.reducer] = {
  init: function() {
    return Immutable.Vector();
  },
  result: function(vec) {
    return vec;
  },
  step: function(vec, x) {
    return vec.push(x);
  }
};

function eq(x, y) {
  expect(x).to.be(y);
}

function eql(x, y) {
  expect(x).to.eql(y);
}

function immutEql(src, dest) {
  eql(src.toJS(), dest.toJS());
}

describe('', () => {
  it('reduce should work', () => {
    eq(reduce([1, 2, 3, 4],
              (result, x) => result + x,
              0),
       10);

    eql(reduce({ x: 1, y: 2 },
               (result, x) => {
                 result[x[0]] = x[1] + 1;
                 return result;
               },
               {}),
        { x: 2, y: 3 });

    var v = Immutable.Vector(1, 2);
    eq(reduce(v,
              (result, x) => result + x,
              0),
       3);
  });

  it('push/merge should work', () => {
    eql(push([1, 2, 3], 4), [1, 2, 3, 4]);
    eql(merge({ x: 1, y: 2 }, { z: 3 }),
        { x: 1, y: 2, z: 3 });
    eql(merge({ x: 1, y: 2 }, ['z', 3]),
        { x: 1, y: 2, z: 3 });
  });

  it('reducer protocol should work', () => {
    var vec = Immutable.Vector(1, 2, 3);
    var reducer = vec[protocols.reducer];

    immutEql(reducer.init(), Immutable.Vector());

    immutEql(reducer.step(vec, 4),
             Immutable.Vector(1, 2, 3, 4));
  });

  it('map should work', () => {
    eql(map(x => x + 1, [1, 2, 3, 4]),
        [2, 3, 4, 5]);
    eql(map(x => [x[0], x[1] + 1], { x: 1, y: 2 }),
        { x: 2, y: 3 });
    eql(map((x, i) => i, [1, 2, 3, 4]),
        [0, 1, 2, 3]);

    immutEql(map(x => x + 1, Immutable.Vector(1, 2, 3, 4)),
             Immutable.Vector(2, 3, 4, 5));

    eql(transduce(map(x => x * 2),
                  reducer(add),
                  0,
                  [1, 2, 3]),
        12);
  });

  it('filter should work', () => {
    eql(filter(x => x % 2 === 0, [1, 2, 3, 4]),
        [2, 4]);
    eql(filter(x => x[1] % 2 === 0, { x: 1, y: 2 }),
        { y: 2 });
    eql(filter((x, i) => i !== 0, [1, 2, 3, 4]),
        [2, 3, 4]);

    immutEql(filter(x => x % 2 === 0, Immutable.Vector(1, 2, 3, 4)),
             Immutable.Vector(2, 4));

    eql(transduce(filter(x => x % 2 === 0),
                  reducer(add),
                  0,
                  [1, 2, 3]),
        2);
  });

  it('remove should work', () => {
    eql(remove(x => x % 2 === 0, [1, 2, 3, 4]),
        [1, 3]);
    eql(remove(x => x[1] % 2 === 0, { x: 1, y: 2 }),
        { x: 1 });

    immutEql(remove(x => x % 2 === 0, Immutable.Vector(1, 2, 3, 4)),
             Immutable.Vector(1, 3));

    eql(transduce(remove(x => x % 2 ===0),
                  reducer(add),
                  0,
                  [1, 2, 3]),
        4);
  });

  it('dedupe should work', () => {
    eql(into([], dedupe(), [1, 2, 2, 3, 3, 3, 5]),
        [1, 2, 3, 5])
  });

  it('keep should work', () => {
    eql(into([], keep(), [1, 2, undefined, null, false, 5]),
        [1, 2, false, 5])
  });

  it('take should work', () => {
    eql(take(2, [1, 2, 3, 4]), [1, 2])
    eql(take(10, [1, 2, 3, 4]), [1, 2, 3, 4])

    immutEql(take(2, Immutable.Vector(1, 2, 3, 4)),
             Immutable.Vector(1, 2))

    eql(into([], take(2), [1, 2, 3, 4]),
        [1, 2]);
  });

  it('takeWhile should work', () => {
    function lt(n) {
      return function(x) {
        return x < n;
      }
    }

    eql(takeWhile(lt(3), [1, 2, 3, 2]), [1, 2]);
    eql(takeWhile(lt(10), [1, 2, 3, 4]), [1, 2, 3, 4])

    immutEql(takeWhile(lt(3), Immutable.Vector(1, 2, 3, 2)),
             Immutable.Vector(1, 2))

    eql(into([], takeWhile(lt(3)), [1, 2, 3, 2]),
        [1, 2]);
  });

  it('drop should work', () => {
    eql(drop(2, [1, 2, 3, 4]), [3, 4])
    eql(drop(10, [1, 2, 3, 4]), [])

    immutEql(drop(2, Immutable.Vector(1, 2, 3, 4)),
             Immutable.Vector(3, 4))

    eql(into([], drop(2), [1, 2, 3, 4]),
        [3, 4]);
  });

  it('dropWhile should work', () => {
    function lt(n) {
      return function(x) {
        return x < n;
      }
    }

    eql(dropWhile(lt(3), [1, 2, 3, 2]), [3, 2]);
    eql(dropWhile(lt(10), [1, 2, 3, 4]), []);

    immutEql(dropWhile(lt(3), Immutable.Vector(1, 2, 3, 2)),
             Immutable.Vector(3, 2));

    eql(into([], dropWhile(lt(3)), [1, 2, 3, 2]),
        [3, 2]);
  });

  it('cat should work', () => {
    eql(into([], cat, [[1, 2], [3, 4]])
        [1, 2, 3, 4]);

    immutEql(into(Immutable.Vector(),
                  cat,
                  Immutable.fromJS([[1, 2], [3, 4]])),
             Immutable.Vector(1, 2, 3, 4));
  });

  it('mapcat should work', () => {
    eql(into([],
             mapcat(arr => {
                    return map(x => x + 1, arr);
             }),
             [[1, 2], [3, 4]]),
        [2, 3, 4, 5]);
  });

  it('into should work', () => {
    eql(into([], map(x => x + 1), [1, 2, 3, 4]),
        [2, 3, 4, 5]);
    eql(into([], map(x => x[1] + 1), { x: 10, y: 20 }),
        [11, 21]);
    eql(into({}, map(x => [x[0], x[1] + 1]), { x: 10, y: 20 }),
        { x: 11, y: 21 });
    eql(into({}, map(x => ['foo' + x, x * 2]), [1, 2]),
        { foo1: 2, foo2: 4 });

    eql(into([1, 2, 3], map(x => x + 1), [7, 8, 9]),
        [1, 2, 3, 8, 9, 10]);

    immutEql(into(Immutable.Vector(), map(x => x + 1), [1, 2, 3]),
             Immutable.Vector(2, 3, 4));
  });

  it('seq should work', () => {
    eql(seq(map(x => x + 1), [1, 2, 3, 4]),
        [2, 3, 4, 5]);
    eql(seq(map(x => [x[0], x[1] + 1]), { x: 10, y: 20 }),
        { x: 11, y: 21 });

    immutEql(seq(map(x => x + 1), Immutable.Vector(1, 2, 3)),
             Immutable.Vector(2, 3, 4));
  });

  it('transduce and compose should work', () => {
    eql(transduce(compose(
                    map(x => x + 1),
                    filter(x => x % 2 === 0)
                  ),
                  reducer(push),
                  [],
                  [1, 2, 3, 4]),
        [2, 4])

    eql(transduce(compose(
                    map(second),
                    map(x => x + 1)
                  ),
                  reducer(push),
                  [],
                  { x: 1, y: 2 }),
        [2, 3])

    eql(transduce(compose(
                    map(second),
                    map(x => x + 1),
                    map(x => ['foo' + x, x])
                  ),
                  reducer(merge),
                  {},
                  { x: 1, y: 2 }),
        { foo2: 2, foo3: 3 })

    immutEql(transduce(compose(
                         map(x => x + 1),
                         filter(x => x % 2 === 0)
                       ),
                       Immutable.Vector.prototype[protocols.reducer],
                       Immutable.Vector(),
                       Immutable.Vector(1, 2, 3, 4)),
             Immutable.Vector(2, 4));

    eql(into([], compose(map(x => [x, x * 2]),
                         cat,
                         filter(x => x > 2)),
             [1, 2, 3, 4]),
        [4, 3, 6, 4, 8]);
  });
});
