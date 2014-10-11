
// basic protocol helpers

var symbolExists = typeof Symbol !== 'undefined';

var protocols = {
  iterator: symbolExists ? Symbol.iterator : '@@iterator',
  reducer: symbolExists ? Symbol('reducer') : '@@reducer'
};

function throwProtocolError(name, coll) {
  throw new Error("don't know how to " + name + " collection: " +
                  coll);
}

function fulfillsProtocol(obj, name) {
  if(name === 'iterator') {
    // Accept ill-formed iterators that don't conform to the
    // protocol by accepting just next()
    return obj[protocols.iterator] || obj.next;
  }

  return obj[protocols[name]];
}

function getProtocolProperty(obj, name) {
  return obj[protocols[name]];
}

function iterator(coll) {
  var iter = getProtocolProperty(coll, 'iterator');
  if(iter) {
    return iter.call(coll);
  }
  else if(coll.next) {
    // Basic duck typing to accept an ill-formed iterator that doesn't
    // conform to the iterator protocol (all iterators should have the
    // @@iterator method and return themselves, but some engines don't
    // have that on generators like older v8)
    return coll;
  }
  else if(isArray(coll)) {
    return new ArrayIterator(coll);
  }
  else if(isObject(coll)) {
    return new ObjectIterator(coll);
  }
}

function ArrayIterator(arr) {
  this.arr = arr;
  this.index = 0;
}

ArrayIterator.prototype.next = function() {
  if(this.index < this.arr.length) {
    return {
      value: this.arr[this.index++],
      done: false
    };
  }
  return {
    done: true
  }
};

function ObjectIterator(obj) {
  this.obj = obj;
  this.keys = Object.keys(obj);
  this.index = 0;
}

ObjectIterator.prototype.next = function() {
  if(this.index < this.keys.length) {
    var k = this.keys[this.index++];
    return {
      value: [k, this.obj[k]],
      done: false
    };
  }
  return {
    done: true
  }
};

// helpers

function isArray(x) {
  return x instanceof Array;
}

function isFunction(x) {
  return typeof x === 'function';
}

function isObject(x) {
  return x instanceof Object &&
    Object.getPrototypeOf(x) === Object.getPrototypeOf({});
}

function isNumber(x) {
  return typeof x === 'number';
}

function Reduced(val) {
  this.val = val;
}

function reduce(coll, f, init) {
  if(isArray(coll)) {
    var result = init;
    var index = -1;
    var len = coll.length;
    while(++index < len) {
      result = f(result, coll[index]);
      if(result instanceof Reduced) {
        return result.val;
      }
    }
    return result;
  }
  else if(isObject(coll)) {
    return reduce(Object.keys(coll), function(result, k) {
      return f(result, [k, coll[k]]);
    }, init);
  }
  else if(fulfillsProtocol(coll, 'iterator')) {
    var result = init;
    var iter = iterator(coll);
    var val = iter.next();
    while(!val.done) {
      result = f(result, val.value);
      if(result instanceof Reduced) {
        return result.val;
      }
      val = iter.next();
    }
    return result;
  }
  throwProtocolError('reduce', coll);
}

function transduce(xform, reducer, init, coll) {
  reducer = xform(reducer);
  if(!coll) {
    coll = init;
    init = reducer.init();
  }
  var res = reduce(coll, function(res, input) {
    return reducer.step(res, input);
  }, init);
  return reducer.result(res);
}

function compose() {
  var funcs = Array.prototype.slice.call(arguments);
  return function(r) {
    var value = r;
    for(var i=funcs.length-1; i>=0; i--) {
      value = funcs[i](value);
    }
    return value;
  }
}

// transformations

function reducer(f) {
  return {
    init: function() {
      throw new Error('init value unavailable');
    },
    result: function(v) {
      return v;
    },
    step: f
  };
}

function bound(f, ctx, count) {
  count = count != null ? count : 1;

  if(!ctx) {
    return f;
  }
  else {
    switch(count) {
    case 1:
      return function(x) {
        return f.call(ctx, x);
      }
    case 2:
      return function(x, y) {
        return f.call(ctx, x, y);
      }
    default:
      return f.bind(ctx);
    }
  }
}

function arrayMap(f, arr, ctx) {
  var index = -1;
  var length = arr.length;
  var result = Array(length);
  f = bound(f, ctx, 2);

  while (++index < length) {
    result[index] = f(arr[index], index);
  }
  return result;
}

function arrayFilter(f, arr, ctx) {
  var len = arr.length;
  var result = [];
  f = bound(f, ctx, 2);

  for(var i=0; i<len; i++) {
    if(f(arr[i], i)) {
      result.push(arr[i]);
    }
  }
  return result;
}

function Map(f, xform) {
  this.xform = xform;
  this.f = f;
}

Map.prototype.init = function() {
  return this.xform.init();
};

Map.prototype.result = function(v) {
  return this.xform.result(v);
};

Map.prototype.step = function(res, input) {
  return this.xform.step(res, this.f(input));
};

function map(f, coll, ctx) {
  //if(isFunction(coll)) { ctx = f; f = coll; coll = null; }
  //var f2 = ctx ? bound(f, ctx) : f;
  f = bound(f, ctx);

  if(coll) {
    if(isArray(coll)) {
      return arrayMap(f, coll, ctx);
    }

    var reducer = getReducer(coll);
    var result = reducer.init();

    var iter = iterator(coll);
    var cur = iter.next();
    while(!cur.done) {
      result = reducer.step(result, f(cur.value));
      cur = iter.next();
    }
    return result;
  }

  return function(xform) {
    return new Map(f, xform);
  }
}

function Filter(f, xform) {
  this.xform = xform;
  this.f = f;
}

Filter.prototype.init = function() {
  return this.xform.init();
};

Filter.prototype.result = function(v) {
  return this.xform.result(v);
};

Filter.prototype.step = function(res, input) {
  if(this.f(input)) {
    return this.xform.step(res, input);
  }
  return res;
};

function filter(f, coll, ctx) {
  f = bound(f, ctx);

  if(coll) {
    if(isArray(coll)) {
      return arrayFilter(f, coll, ctx);
    }

    var reducer = getReducer(coll);
    var result = reducer.init();

    var iter = iterator(coll);
    var cur = iter.next();
    while(!cur.done) {
      if(f(cur.value)) {
        result = reducer.step(result, cur.value);
      }
      cur = iter.next();
    }
    return result;
  }

  return function(xform) {
    return new Filter(f, xform);
  };
}

function remove(f, coll, ctx) {
  f = bound(f, ctx);
  return filter(function(x) { return !f(x); }, coll);
}

function keep(f, coll, ctx) {
  f = bound(f, ctx);
  return filter(function(x) { return x != null }, coll);
}

function dedupe(coll) {
  if(coll) {
    var reducer = getReducer(coll);
    var result = reducer.init();
    var append = reducer.step;

    var last;
    var iter = iterator(coll);
    var cur = iter.next();
    while(!cur.done) {
      if(cur.value !== last) {
        result = append(result, cur.value);
      }
      cur = iter.next();
    }
    return result;
  }

  return function(r) {
    var last;
    return {
      init: function() {
        return r.init();
      },
      result: function(v) {
        return r.result(v);
      },
      step: function(result, input) {
        if(input !== last) {
          last = input;
          r.step(result, input);
        }
        return result;
      }
    };
  }
}

function takeWhile(f, coll, ctx) {
  f = bound(f, ctx);

  if(coll) {
    var reducer = getReducer(coll);
    var result = reducer.init();

    var iter = iterator(coll);
    var cur = iter.next();
    while(!cur.done) {
      if(f(cur.value)) {
        result = reducer.step(result, cur.value);
      }
      else {
        break;
      }
      cur = iter.next();
    }
    return result;
  }

  return function(r) {
    return {
      init: function() {
        return r.init();
      },
      result: function(v) {
        return r.result(v);
      },
      step: function(result, input) {
        if(f(input)) {
          return r.step(result, input);
        }
        return new Reduced(result);
      }
    };
  }
}

function take(n, coll) {
  if(coll) {
    var reducer = getReducer(coll);
    var result = reducer.init();

    var index = 0;
    var iter = iterator(coll);
    var cur = iter.next();
    while(index++ < n && !cur.done) {
      result = reducer.step(result, cur.value);
      cur = iter.next();
    }
    return result;
  }

  return function(r) {
    var i = 0;
    return {
      init: function() {
        return r.init();
      },
      result: function(v) {
        return r.result(v);
      },
      step: function(result, input) {
        if(i++ < n) {
          return r.step(result, input);
        }
        return new Reduced(result);
      }
    };
  }
}

function drop(n, coll) {
  if(coll) {
    var reducer = getReducer(coll);
    var result = reducer.init();

    var index = 0;
    var iter = iterator(coll);
    var cur = iter.next();
    while(!cur.done) {
      if(++index > n) {
        result = reducer.step(result, cur.value);
      }
      cur = iter.next();
    }
    return result;
  }

  return function(r) {
    var i = 0;
    return {
      init: function() {
        return r.init();
      },
      result: function(v) {
        return r.result(v);
      },
      step: function(result, input) {
        if((i++) + 1 > n) {
          return r.step(result, input);
        }
        return result;
      }
    };
  }
}

function dropWhile(f, coll, ctx) {
  f = bound(f, ctx);

  if(coll) {
    var reducer = getReducer(coll);
    var result = reducer.init();

    var dropping = true;
    var iter = iterator(coll);
    var cur = iter.next();
    while(!cur.done) {
      if(dropping && f(cur.value)) {
        cur = iter.next();
        continue;
      }
      dropping = false;
      result = reducer.step(result, cur.value);
      cur = iter.next();
    }
    return result;
  }

  return function(r) {
    var dropping = true;
    return {
      init: function() {
        return r.init();
      },
      result: function(v) {
        return r.result(v);
      },
      step: function(result, input, i) {
        if(dropping) {
          if(f(input)) {
            return result;
          }
          else {
            dropping = false;
          }
        }
        return r.step(result, input);
      }
    };
  }
}

// pure transducers (cannot take collections)

function Cat(xform) {
  this.xform = xform;
}

Cat.prototype.init = function() {
  return this.xform.init();
};

Cat.prototype.result = function(v) {
  return this.xform.result(v);
};

Cat.prototype.step = function(result, input) {
  var xform = this.xform;

  return reduce(input, function(res, input) {
    return xform.step(res, input)
  }, result);
};

function cat(xform) {
  return new Cat(xform);
}

function mapcat(f, ctx) {
  f = bound(f, ctx);
  return compose(map(f), cat);
}

// collection helpers

function push(arr, x) {
  arr.push(x);
  return arr;
}

function merge(obj, x) {
  if(isArray(x) && x.length === 2) {
    obj[x[0]] = x[1];
  }
  else {
    var keys = Object.keys(x);
    var len = keys.length;
    for(var i=0; i<len; i++) {
      obj[keys[i]] = x[keys[i]];
    }
  }
  return obj;
}

var arrayReducer = {
  init: function() {
    return [];
  },
  result: function(v) {
    return v;
  },
  step: push
}

var objReducer = {
  init: function() {
    return {};
  },
  result: function(v) {
    return v;
  },
  step: merge
};

function getReducer(coll) {
  if(isArray(coll)) {
    return arrayReducer;
  }
  else if(isObject(coll)) {
    return objReducer;
  }
  else if(fulfillsProtocol(coll, 'reducer')) {
    return getProtocolProperty(coll, 'reducer');
  }
  throwProtocolError('getReducer', coll);
}

// building new collections

function array(xform, coll) {
  if(!coll) {
    coll = xform;
    return reduce(coll, push, []);
  }
  return transduce(xform, arrayReducer, [], coll);
}

function obj(xform, coll) {
  if(!coll) {
    coll = xform;
    return reduce(coll, merge, {});
  }
  return transduce(xform, objReducer, {}, coll);
}

function iter(xform, coll) {
  if(!coll) {
    coll = xform;
    return iterator(coll);
  }
  return new LazyTransformer(xform, coll);
}

function seq(xform, coll) {
  if(isArray(coll)) {
    return transduce(xform, arrayReducer, [], coll);
  }
  else if(isObject(coll)) {
    return transduce(xform, objReducer, {}, coll);
  }
  else if(fulfillsProtocol(coll, 'reducer')) {
    var reducer = getProtocolProperty(coll, 'reducer');
    return transduce(xform, reducer, reducer.init(), coll);
  }
  else if(fulfillsProtocol(coll, 'iterator')) {
    return new LazyTransformer(xform, coll);
  }
  throwProtocolError('sequence', coll);
}

function into(to, xform, from) {
  if(isArray(to)) {
    return transduce(xform, arrayReducer, to, from);
  }
  else if(isObject(to)) {
    return transduce(xform, objReducer, to, from);
  }
  else if(fulfillsProtocol(to, 'reducer')) {
    return transduce(xform,
                     getProtocolProperty(to, 'reducer'),
                     to,
                     from);
  }
  throwProtocolError('into', to);
}

// laziness

var stepper = {
  result: function(v) {
    return (v instanceof Reduced) ? v.val : v;
  },
  step: function(lt, x) {
    lt.items.push(x);
    return lt.rest;
  }
}

function Stepper(xform, iter) {
  this.xform = xform(stepper);
  this.iter = iter;
}

Stepper.prototype.step = function(lt) {
  var len = lt.items.length;
  while(lt.items.length === len) {
    var n = this.iter.next();
    if(n.done || n.value instanceof Reduced) {
      // finalize
      this.xform.result(this);
      break;
    }

    // step
    this.xform.step(lt, n.value);
  }
}

function LazyTransformer(xform, coll) {
  this.iter = iterator(coll);
  this.items = [];
  this.stepper = new Stepper(xform, iterator(coll));
}

LazyTransformer.prototype['@@iterator'] = function() {
  return this;
}

LazyTransformer.prototype.next = function() {
  this.step();

  if(this.items.length) {
    return {
      value: this.items.pop(),
      done: false
    }
  }
  else {
    return { done: true };
  }
};

LazyTransformer.prototype.step = function() {
  if(!this.items.length) {
    this.stepper.step(this);
  }
}

// util

function range(n) {
  var arr = new Array(n);
  for(var i=0; i<arr.length; i++) {
    arr[i] = i;
  }
  return arr;
}


module.exports = {
  reduce: reduce,
  reducer: reducer,
  Reduced: Reduced,
  push: push,
  merge: merge,
  transduce: transduce,
  seq: seq,
  array: array,
  obj: obj,
  iter: iter,
  into: into,
  compose: compose,
  map: map,
  filter: filter,
  remove: remove,
  cat: cat,
  mapcat: mapcat,
  keep: keep,
  dedupe: dedupe,
  take: take,
  takeWhile: takeWhile,
  drop: drop,
  dropWhile: dropWhile,
  range: range,

  protocols: protocols,
  LazyTransformer: LazyTransformer
};
