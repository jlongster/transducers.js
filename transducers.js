
// basic protocol helpers

var symbolExists = typeof Symbol !== 'undefined';

function throwProtocolError(name, coll) {
  throw new Error("don't know how to " + name + " collection: " +
                  coll);
}

function fulfillsProtocols(obj /* names ... */) {
  var names = Array.prototype.slice.call(arguments, 1);
  return names.reduce(function(result, name) {
    if(symbolExists) {
      if(name === 'iterator') {
        // Accept ill-formed iterators that don't conform to the
        // protocol by accepting just next()
        return result && (obj[Symbol.iterator] || obj.next);
      }
      return result && obj[Symbol.for(name)];
    }
    else {
      if(name === 'iterator') {
        // Accept ill-formed iterators that don't conform to the
        // protocol by accepting just next()
        return result && (obj['@@iterator'] || obj.next);
      }
      return result && obj['@@' + name];
    }
  }, true);
}

function getProtocolMethod(obj, name) {
  if(symbolExists) {
    if(name === 'iterator') {
      return obj[Symbol.iterator];
    }
    else {
      return obj[Symbol.for(name)];
    }
  }
  return obj['@@' + name];
}

function iterator(coll) {
  var iter = getProtocolMethod(coll, 'iterator');
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
    return reduce(Object.keys(coll), function(result, k, i) {
      return f(result, [k, coll[k]], i);
    }, init);
  }
  else if(fulfillsProtocols(coll, 'iterator')) {
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

function transduce(xform, transducer, init, coll) {
  transducer = xform(transducer);
  if(!coll) {
    coll = init;
    init = transducer.init();
  }
  var res = reduce(coll, transducer.step, init);
  return transducer.finalize(res);
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

function map(f, coll) {
  if(coll) {
    return sequence(map(f), coll);

    if(isArray(coll)) {
      var result = [];
      var index = -1;
      var len = coll.length;
      while(++index < len) {
        result.push(f(coll[index], index));
      }
      return result;
    }
    else {
      var i = 0;
      return reduce(coll, function(result, x) {
        return append(result, f(x, i++));
      }, empty(coll));
    }
  }

  return function(r) {
    return {
      init: function() {
        return r.init();
      },
      finalize: function(v) {
        return r.finalize(v);
      },
      step: function(res, input) {
        return r.step(res, f(input));
      }
    };
  }
}

function filter(f, coll) {
  if(coll) {
    if(isArray(coll)) {
      var result = [];
      var index = -1;
      var len = coll.length;
      while(++index < len) {
        if(f(coll[index], index)) {
          result.push(coll[index]);
        }
      }
      return result;
    }
    else {
      var i = 0;
      return reduce(coll, function(result, input) {
        if(f(input, i++)) {
          return append(result, input);
        }
        return result;
      }, empty(coll));
    }
  }

  return function(r) {
    return {
      init: function() {
        return r.init();
      },
      finalize: function(v) {
        return r.finalize(v);
      },
      step: function(res, input) {
        if(f(input)) {
          return r.step(res, input);
        }
        return res;
      }
    }
  }
}

function remove(f, coll) {
  return filter(function(x) { return !f(x); }, coll);
}

function keep(f, coll) {
  return filter(function(x) { return x != null }, coll);
}

function dedupe(coll) {
  var last;

  if(coll) {
    return reduce(
      coll,
      function(result, input) {
        if(input !== last) {
          last = input;
          return append(result, input);
        }
        return result;
      },
      empty(coll)
    );
  }

  return function(r) {
    return {
      init: function() {
        return r.init();
      },
      finalize: function(v) {
        return r.finalize(v);
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

function takeWhile(f, coll) {
  if(coll) {
    if(isArray(coll)) {
      var result = [];
      var index = -1;
      var len = coll.length;
      while(++index < len) {
        if(f(coll[index])) {
          result.push(coll[index]);
        }
        else {
          break;
        }
      }
      return result;
    }
    else {
      return reduce(coll, function(result, input) {
        if(f(input)) {
          return append(result, input);
        }
        return new Reduced(result);
      }, empty(coll));
    }
  }

  return function(r) {
    return {
      init: function() {
        return r.init();
      },
      finalize: function(v) {
        return r.finalize(v);
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
    if(isArray(coll)) {
      var result = [];
      var index = -1;
      var len = coll.length;
      while(++index < n && index < len) {
        result.push(coll[index]);
      }
      return result;
    }
    else {
      var i = 0;
      return reduce(coll, function(result, input) {
        if(i++ < n) {
          return append(result, input);
        }
        return new Reduced(result);
      }, empty(coll));
    }
  }

  return function(r) {
    var i = 0;
    return {
      init: function() {
        return r.init();
      },
      finalize: function(v) {
        return r.finalize(v);
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
    if(isArray(coll)) {
      var result = [];
      var index = n - 1;
      var len = coll.length;
      while(++index < len) {
        result.push(coll[index]);
      }
      return result;
    }
    else {
      var i = 0;
      return reduce(coll, function(result, input) {
        if((i++) + 1 > n) {
          return append(result, input);
        }
        return result;
      }, empty(coll));
    }
  }

  return function(r) {
    var i = 0;
    return {
      init: function() {
        return r.init();
      },
      finalize: function(v) {
        return r.finalize(v);
      },
      step: function(result, input) {
        if((i++) + 1 > n) {
          return r(result, input);
        }
        return result;
      }
    };
  }
}

function dropWhile(f, coll) {
  if(coll) {
    if(isArray(coll)) {
      var result = [];
      var index = -1;
      var len = coll.length;
      var dropping = true;
      while(++index < len) {
        if(dropping) {
          if(f(coll[index])) {
            continue;
          }
          else {
            dropping = false;
          }
        }

        result.push(coll[index]);
      }
      return result;
    }
    else {
      var dropping = true;
      return reduce(coll, function(result, input, i) {
        if(dropping) {
          if(f(input)) {
            return result;
          }
          else {
            dropping = false;
          }
        }
        return append(result, input);
      }, empty(coll));
    }
  }

  return function(r) {
    var dropping = true;
    return {
      init: function() {
        return r.init();
      },
      finalize: function(v) {
        return r.finalize(v);
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

// pure transducers (doesn't take collections)

function cat(r) {
  return {
    init: function() {
      return r.init();
    },
    finalize: function(v) {
      return r.finalize(v);
    },
    step: function(result, input) {
      return reduce(input, r.step, result);
    }
  };
}

function mapcat(f) {
  return compose(map(f), cat);
}

// collection helpers

var append = {
  init: function() {
    return [];
  },

  finalize: function(v) {
    return v;
  },

  step: function(coll, x) {
    if(isArray(coll)) {
      coll.push(x);
      return coll;
    }
    else if(isObject(coll)) {
      if(isObject(x)) {
        var keys = Object.keys(x);
        for(var i=0; i<keys.length; i++) {
          coll[keys[i]] = x[keys[i]];
        }
        return coll;
      }
      else if(isArray(x) && x.length === 2) {
        coll[x[0]] = x[1];
        return coll;
      }
      throw new Error('cannot append ' + x + ' to object');
    }
    throwProtocolError('append', coll);

    return _append(res, v);
  },
}

function empty(coll) {
  if(isArray(coll)) {
    return [];
  }
  else if(isObject(coll)) {
    return {};
  }
  throwProtocolError('make empty', coll);
}

function isBuildable(coll) {
  return isArray(coll) || isObject(coll);
}

function array(xform, coll) {
  if(!coll) {
    coll = xform;
    return reduce(coll, append.step, []);
  }
  return transduce(xform, append, [], coll);
}

function obj(xform, coll) {
  if(!coll) {
    coll = xform;
    return reduce(coll, append.step, {});
  }
  return transduce(xform, append, {}, coll);
}

function iter(xform, coll) {
  if(!coll) {
    coll = xform;
    return iterator(coll);
  }
  return new LazyTransformer(xform, coll);
}

function seq(xform, coll) {
  if(isBuildable(coll)) {
    return transduce(xform, append, empty(coll), coll);
  }
  else {
    return new LazyTransformer(xform, coll);
  }
}

function into(to, xform, from) {
  return transduce(xform, append, to, from);
}

var stepper = {
  finalize: function(v) {
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
      this.xform.finalize(this);
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

function range(n) {
  var arr = new Array(n);
  for(var i=0; i<arr.length; i++) {
    arr[i] = i;
  }
  return arr;
}


module.exports = {
  reduce: reduce,
  Reduced: Reduced,
  append: append,
  empty: empty,
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

  LazyTransformer: LazyTransformer
};
