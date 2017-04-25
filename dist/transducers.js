var transducers =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

	
	// basic protocol helpers

	var symbolExists = typeof Symbol !== 'undefined';

	var protocols = {
	  iterator: symbolExists ? Symbol.iterator : '@@iterator'
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
	    // have that on generators like older v8) and wrap it.
	    
	    return coll[protocols.iterator] ? coll : new WrappedIterator(coll);
	  }
	  else if(isArray(coll)) {
	    return new ArrayIterator(coll);
	  }
	  else if(isObject(coll)) {
	    return new ObjectIterator(coll);
	  }
	}

	function WrappedIterator(iter) {
	  this.wrapped = iter;
	}

	WrappedIterator.prototype.next = function() {
	  return this.wrapped.next.apply(this.wrapped, arguments);
	};
	WrappedIterator.prototype[protocols.iterator] = returnThis;

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
	ArrayIterator.prototype[protocols.iterator] = returnThis;

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
	ObjectIterator.prototype[protocols.iterator] = returnThis;

	// helpers

	var toString = Object.prototype.toString;
	var isArray = typeof Array.isArray === 'function' ? Array.isArray : function(obj) {
	  return toString.call(obj) == '[object Array]';
	};

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

	function Reduced(value) {
	  this['@@transducer/reduced'] = true;
	  this['@@transducer/value'] = value;
	}

	function isReduced(x) {
	  return (x instanceof Reduced) || (x && x['@@transducer/reduced']);
	}

	function deref(x) {
	  return x['@@transducer/value'];
	}

	/**
	 * This is for transforms that may call their nested transforms before
	 * Reduced-wrapping the result (e.g. "take"), to avoid nested Reduced.
	 */
	function ensureReduced(val) {
	  if(isReduced(val)) {
	    return val;
	  } else {
	    return new Reduced(val);
	  }
	}

	/**
	 * This is for tranforms that call their nested transforms when
	 * performing completion (like "partition"), to avoid signaling
	 * termination after already completing.
	 */
	function ensureUnreduced(v) {
	  if(isReduced(v)) {
	    return deref(v);
	  } else {
	    return v;
	  }
	}

	function reduce(coll, xform, init) {
	  if(isArray(coll)) {
	    var result = xform['@@transducer/init'](init);
	    var index = -1;
	    var len = coll.length;
	    while(++index < len) {
	      result = xform['@@transducer/step'](result, coll[index]);
	      if(isReduced(result)) {
	        result = deref(result);
	        break;
	      }
	    }
	    return xform['@@transducer/result'](result);
	  }
	  else if(isObject(coll) || fulfillsProtocol(coll, 'iterator')) {
	    var result = xform['@@transducer/init'](init);
	    var iter = iterator(coll);
	    var val = iter.next();
	    while(!val.done) {
	      result = xform['@@transducer/step'](result, val.value);
	      if(isReduced(result)) {
	        result = deref(result);
	        break;
	      }
	      val = iter.next();
	    }
	    return xform['@@transducer/result'](result);
	  }
	  throwProtocolError('iterate', coll);
	}

	function transduce(coll, xform, reducer, init) {
	  xform = xform(reducer);
	  init = xform['@@transducer/init'](init);
	  return reduce(coll, xform, init);
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

	function transformer(f) {
	  var t = {};
	  t['@@transducer/init'] = function(init) {
	    if(init == null) {
	      throw new Error('init value unavailable');
	    }
	    return init;
	  };
	  t['@@transducer/result'] = function(v) {
	    return v;
	  };
	  t['@@transducer/step'] = f;
	  return t;
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

	function arrayMap(arr, f, ctx) {
	  var index = -1;
	  var length = arr.length;
	  var result = Array(length);
	  f = bound(f, ctx, 2);

	  while (++index < length) {
	    result[index] = f(arr[index], index);
	  }
	  return result;
	}

	function arrayFilter(arr, f, ctx) {
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

	Map.prototype['@@transducer/init'] = function(result) {
	  return this.xform['@@transducer/init'](result);
	};

	Map.prototype['@@transducer/result'] = function(v) {
	  return this.xform['@@transducer/result'](v);
	};

	Map.prototype['@@transducer/step'] = function(res, input) {
	  return this.xform['@@transducer/step'](res, this.f(input));
	};

	function map(coll, f, ctx) {
	  if(isFunction(coll)) { ctx = f; f = coll; coll = null; }
	  f = bound(f, ctx);

	  if(coll) {
	    if(isArray(coll)) {
	      return arrayMap(coll, f, ctx);
	    }
	    return seq(coll, map(f));
	  }

	  return function(xform) {
	    return new Map(f, xform);
	  }
	}

	function Filter(f, xform) {
	  this.xform = xform;
	  this.f = f;
	}

	Filter.prototype['@@transducer/init'] = function(result) {
	  return this.xform['@@transducer/init'](result);
	};

	Filter.prototype['@@transducer/result'] = function(v) {
	  return this.xform['@@transducer/result'](v);
	};

	Filter.prototype['@@transducer/step'] = function(res, input) {
	  if(this.f(input)) {
	    return this.xform['@@transducer/step'](res, input);
	  }
	  return res;
	};

	function filter(coll, f, ctx) {
	  if(isFunction(coll)) { ctx = f; f = coll; coll = null; }
	  f = bound(f, ctx);

	  if(coll) {
	    if(isArray(coll)) {
	      return arrayFilter(coll, f, ctx);
	    }
	    return seq(coll, filter(f));
	  }

	  return function(xform) {
	    return new Filter(f, xform);
	  };
	}

	function remove(coll, f, ctx) {
	  if(isFunction(coll)) { ctx = f; f = coll; coll = null; }
	  f = bound(f, ctx);
	  return filter(coll, function(x) { return !f(x); });
	}

	function keep(coll) {
	  return filter(coll, function(x) { return x != null });
	}

	function Dedupe(xform) {
	  this.xform = xform;
	  this.last = undefined;
	}

	Dedupe.prototype['@@transducer/init'] = function(result) {
	  return this.xform['@@transducer/init'](result);
	};

	Dedupe.prototype['@@transducer/result'] = function(v) {
	  return this.xform['@@transducer/result'](v);
	};

	Dedupe.prototype['@@transducer/step'] = function(result, input) {
	  if(input !== this.last) {
	    this.last = input;
	    return this.xform['@@transducer/step'](result, input);
	  }
	  return result;
	};

	function dedupe(coll) {
	  if(coll) {
	    return seq(coll, dedupe());
	  }

	  return function(xform) {
	    return new Dedupe(xform);
	  }
	}

	function TakeWhile(f, xform) {
	  this.xform = xform;
	  this.f = f;
	}

	TakeWhile.prototype['@@transducer/init'] = function(result) {
	  return this.xform['@@transducer/init'](result);
	};

	TakeWhile.prototype['@@transducer/result'] = function(v) {
	  return this.xform['@@transducer/result'](v);
	};

	TakeWhile.prototype['@@transducer/step'] = function(result, input) {
	  if(this.f(input)) {
	    return this.xform['@@transducer/step'](result, input);
	  }
	  return new Reduced(result);
	};

	function takeWhile(coll, f, ctx) {
	  if(isFunction(coll)) { ctx = f; f = coll; coll = null; }
	  f = bound(f, ctx);

	  if(coll) {
	    return seq(coll, takeWhile(f));
	  }

	  return function(xform) {
	    return new TakeWhile(f, xform);
	  }
	}

	function Take(n, xform) {
	  this.n = n;
	  this.i = 0;
	  this.xform = xform;
	}

	Take.prototype['@@transducer/init'] = function(result) {
	  return this.xform['@@transducer/init'](result);
	};

	Take.prototype['@@transducer/result'] = function(v) {
	  return this.xform['@@transducer/result'](v);
	};

	Take.prototype['@@transducer/step'] = function(result, input) {
	  if (this.i < this.n) {
	    result = this.xform['@@transducer/step'](result, input);
	    if(this.i + 1 >= this.n) {
	      // Finish reducing on the same step as the final value. TODO:
	      // double-check that this doesn't break any semantics
	      result = ensureReduced(result);
	    }
	  }
	  this.i++;
	  return result;
	};

	function take(coll, n) {
	  if(isNumber(coll)) { n = coll; coll = null }

	  if(coll) {
	    return seq(coll, take(n));
	  }

	  return function(xform) {
	    return new Take(n, xform);
	  }
	}

	function Drop(n, xform) {
	  this.n = n;
	  this.i = 0;
	  this.xform = xform;
	}

	Drop.prototype['@@transducer/init'] = function(result) {
	  return this.xform['@@transducer/init'](result);
	};

	Drop.prototype['@@transducer/result'] = function(v) {
	  return this.xform['@@transducer/result'](v);
	};

	Drop.prototype['@@transducer/step'] = function(result, input) {
	  if(this.i++ < this.n) {
	    return result;
	  }
	  return this.xform['@@transducer/step'](result, input);
	};

	function drop(coll, n) {
	  if(isNumber(coll)) { n = coll; coll = null }

	  if(coll) {
	    return seq(coll, drop(n));
	  }

	  return function(xform) {
	    return new Drop(n, xform);
	  }
	}

	function DropWhile(f, xform) {
	  this.xform = xform;
	  this.f = f;
	  this.dropping = true;
	}

	DropWhile.prototype['@@transducer/init'] = function(result) {
	  return this.xform['@@transducer/init'](result);
	};

	DropWhile.prototype['@@transducer/result'] = function(v) {
	  return this.xform['@@transducer/result'](v);
	};

	DropWhile.prototype['@@transducer/step'] = function(result, input) {
	  if(this.dropping) {
	    if(this.f(input)) {
	      return result;
	    }
	    else {
	      this.dropping = false;
	    }
	  }
	  return this.xform['@@transducer/step'](result, input);
	};

	function dropWhile(coll, f, ctx) {
	  if(isFunction(coll)) { ctx = f; f = coll; coll = null; }
	  f = bound(f, ctx);

	  if(coll) {
	    return seq(coll, dropWhile(f));
	  }

	  return function(xform) {
	    return new DropWhile(f, xform);
	  }
	}

	function Partition(n, xform) {
	  this.n = n;
	  this.i = 0;
	  this.xform = xform;
	  this.part = new Array(n);
	}

	Partition.prototype['@@transducer/init'] = function(result) {
	  return this.xform['@@transducer/init'](result);
	};

	Partition.prototype['@@transducer/result'] = function(v) {
	  if (this.i > 0) {
	    return ensureUnreduced(this.xform['@@transducer/step'](v, this.part.slice(0, this.i)));
	  }
	  return this.xform['@@transducer/result'](v);
	};

	Partition.prototype['@@transducer/step'] = function(result, input) {
	  this.part[this.i] = input;
	  this.i += 1;
	  if (this.i === this.n) {
	    var out = this.part.slice(0, this.n);
	    this.part = new Array(this.n);
	    this.i = 0;
	    return this.xform['@@transducer/step'](result, out);
	  }
	  return result;
	};

	function partition(coll, n) {
	  if (isNumber(coll)) {
	    n = coll; coll = null;
	  }

	  if (coll) {
	    return seq(coll, partition(n));
	  }

	  return function(xform) {
	    return new Partition(n, xform);
	  };
	}

	var NOTHING = {};

	function PartitionBy(f, xform) {
	  // TODO: take an "opts" object that allows the user to specify
	  // equality
	  this.f = f;
	  this.xform = xform;
	  this.part = [];
	  this.last = NOTHING;
	}

	PartitionBy.prototype['@@transducer/init'] = function(result) {
	  return this.xform['@@transducer/init'](result);
	};

	PartitionBy.prototype['@@transducer/result'] = function(v) {
	  var l = this.part.length;
	  if (l > 0) {
	    return ensureUnreduced(this.xform['@@transducer/step'](v, this.part.slice(0, l)));
	  }
	  return this.xform['@@transducer/result'](v);
	};

	PartitionBy.prototype['@@transducer/step'] = function(result, input) {
	  var current = this.f(input);
	  if (current === this.last || this.last === NOTHING) {
	    this.part.push(input);
	  } else {
	    result = this.xform['@@transducer/step'](result, this.part);
	    this.part = [input];
	  }
	  this.last = current;
	  return result;
	};

	function partitionBy(coll, f, ctx) {
	  if (isFunction(coll)) { ctx = f; f = coll; coll = null; }
	  f = bound(f, ctx);

	  if (coll) {
	    return seq(coll, partitionBy(f));
	  }

	  return function(xform) {
	    return new PartitionBy(f, xform);
	  };
	}

	function Interpose(sep, xform) {
	  this.sep = sep;
	  this.xform = xform;
	  this.started = false;
	}

	Interpose.prototype['@@transducer/init'] = function(result) {
	  return this.xform['@@transducer/init'](result);
	};

	Interpose.prototype['@@transducer/result'] = function(v) {
	  return this.xform['@@transducer/result'](v);
	};

	Interpose.prototype['@@transducer/step'] = function(result, input) {
	  if (this.started) {
	    var withSep = this.xform['@@transducer/step'](result, this.sep);
	    if (isReduced(withSep)) {
	      return withSep;
	    } else {
	      return this.xform['@@transducer/step'](withSep, input);
	    }
	  } else {
	    this.started = true;
	    return this.xform['@@transducer/step'](result, input);
	  }
	};

	/**
	 * Returns a new collection containing elements of the given
	 * collection, separated by the specified separator. Returns a
	 * transducer if a collection is not provided.
	 */
	function interpose(coll, separator) {
	  if (arguments.length === 1) {
	    separator = coll;
	    return function(xform) {
	      return new Interpose(separator, xform);
	    };
	  }
	  return seq(coll, interpose(separator));
	}

	function Repeat(n, xform) {
	  this.xform = xform;
	  this.n = n;
	}

	Repeat.prototype['@@transducer/init'] = function(result) {
	  return this.xform['@@transducer/init'](result);
	};

	Repeat.prototype['@@transducer/result'] = function(v) {
	  return this.xform['@@transducer/result'](v);
	};

	Repeat.prototype['@@transducer/step'] = function(result, input) {
	  var n = this.n;
	  var r = result;
	  for (var i = 0; i < n; i++) {
	    r = this.xform['@@transducer/step'](r, input);
	    if (isReduced(r)) {
	      break;
	    }
	  }
	  return r;
	};

	/**
	 * Returns a new collection containing elements of the given
	 * collection, each repeated n times. Returns a transducer if a
	 * collection is not provided.
	 */
	function repeat(coll, n) {
	  if (arguments.length === 1) {
	    n = coll;
	    return function(xform) {
	      return new Repeat(n, xform);
	    };
	  }
	  return seq(coll, repeat(n));
	}

	function TakeNth(n, xform) {
	  this.xform = xform;
	  this.n = n;
	  this.i = -1;
	}

	TakeNth.prototype['@@transducer/init'] = function(result) {
	  return this.xform['@@transducer/init'](result);
	};

	TakeNth.prototype['@@transducer/result'] = function(v) {
	  return this.xform['@@transducer/result'](v);
	};

	TakeNth.prototype['@@transducer/step'] = function(result, input) {
	  this.i += 1;
	  if (this.i % this.n === 0) {
	    return this.xform['@@transducer/step'](result, input);
	  }
	  return result;
	};

	/**
	 * Returns a new collection of every nth element of the given
	 * collection. Returns a transducer if a collection is not provided.
	 */
	function takeNth(coll, nth) {
	  if (arguments.length === 1) {
	    nth = coll;
	    return function(xform) {
	      return new TakeNth(nth, xform);
	    };
	  }
	  return seq(coll, takeNth(nth));
	}

	var sub = symbolExists ? Symbol('sub') : '@@transducer/sub';
	function Zip(xform) {
	  this.xform = xform
	}

	Zip.prototype['@@transducer/init'] = function(result) {
	  var acc = {};
	  acc[sub] = [];
	  acc.wrapped = this.xform['@@transducer/init'](result);
	  return acc;
	};

	Zip.prototype['@@transducer/result'] = function(result) {
	  if(result[sub] == null || result[sub].length === 0) {
	    return result.wrapped || result;  
	  }
	  var saved = result[sub];
	  var i = -1;
	  var xform = this.xform;
	  var subxform = {};
	  subxform['@@transducer/init'] = function(result) { 
	    return result; 
	  }
	  subxform['@@transducer/result'] = function(v) {
	    return v;
	  };
	  subxform['@@transducer/step'] = function(acc, input) {
	    i += 1;
	    return xform['@@transducer/step'](
	      acc, saved.map(function (a) { return a[i]; }));
	  };
	  let wrappedResult = reduce(result[sub][0], subxform, result.wrapped);
	  return xform['@@transducer/result'](wrappedResult);
	};

	Zip.prototype['@@transducer/step'] = function(result, input) {
	  if(!isReduced(result)) {
	    result[sub].push(input);
	  }
	  return result;
	};

	/**
	 * Returns a new collection whose ith member consists of, 
	 * for every element of the given collection, a collection of
	 * the ith sub-elements of those elements.
	 * Returns a transducer if a collection is not provided.
	 */
	function zip(coll) {
	  if (arguments.length === 0) {
	    return function(xform) {
	      return new Zip(xform);
	    };
	  }
	  return seq(coll, zip());
	}


	// pure transducers (cannot take collections)



	function Cat(xform) {
	  this.xform = xform;
	  this.subxform = {};
	  this.subxform['@@transducer/init'] = function(result) { 
	    return result; 
	  }
	  this.subxform['@@transducer/result'] = function(v) {
	    return v;
	  };
	  this.subxform['@@transducer/step'] = function(result, input) {
	    var val = xform['@@transducer/step'](result, input);
	    return isReduced(val) ? deref(val) : val;
	  };
	}

	Cat.prototype['@@transducer/init'] = function(result) {
	  return this.xform['@@transducer/init'](result);
	};

	Cat.prototype['@@transducer/result'] = function(v) {
	  return this.xform['@@transducer/result'](v);
	};

	Cat.prototype['@@transducer/step'] = function(result, input) {
	  return reduce(input, this.subxform, result);
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

	var arrayReducer = {};
	arrayReducer['@@transducer/init'] = function(result) {
	  if(result == null) {
	    return [];
	  }
	  else if(isArray(result)) {
	    return result;
	  }
	  else {
	    if(typeof Array.from === 'function') {
	      return Array.from(result);
	    }
	    else {
	      var itr = iterator(result);
	      var val = itr.next()
	      var arrayResult = [];
	      while(!val.done) {
	        arrayResult.push(val.value);
	        val = itr.next();
	      }
	      return arrayResult;
	    }
	  }
	};
	arrayReducer['@@transducer/result'] = function(v) {
	  return v;
	};
	arrayReducer['@@transducer/step'] = push;

	var objReducer = {};
	objReducer['@@transducer/init'] = function(result) {
	  if(result == null) {
	    return {};
	  }
	  else if(isObject(result)) {
	    return result;
	  }
	  else {
	    var itr = iterator(result);
	    var val = itr.next();
	    var objResult = {};
	    while(!val.done) {
	      const value = val.value;
	      if(Array.isArray(value)) {
	        objResult[value[0]] = value[1];
	      }
	      else {
	        objResult[value] = true;
	      }
	      val = itr.next();
	    }
	    return objResult;
	  }
	};
	objReducer['@@transducer/result'] = function(v) {
	  return v;
	};
	objReducer['@@transducer/step'] = merge;

	// building new collections

	function toArray(coll, xform) {
	  if(!xform) {
	    return reduce(coll, arrayReducer, []);
	  }
	  return transduce(coll, xform, arrayReducer, []);
	}

	function toObj(coll, xform) {
	  if(!xform) {
	    return reduce(coll, objReducer, {});
	  }
	  return transduce(coll, xform, objReducer, {});
	}

	function toIter(coll, xform) {
	  if(!xform) {
	    return iterator(coll);
	  }
	  return new LazyTransformer(xform, coll);
	}

	function seq(coll, xform) {
	  if(isArray(coll)) {
	    return transduce(coll, xform, arrayReducer, []);
	  }
	  else if(isObject(coll)) {
	    return transduce(coll, xform, objReducer, {});
	  }
	  else if(coll['@@transducer/step']) {
	    var init;
	    if(coll['@@transducer/init']) {
	      init = coll['@@transducer/init']();
	    }
	    else {
	      init = new coll.constructor();
	    }
	    return transduce(coll, xform, coll, init);
	  }
	  else if(fulfillsProtocol(coll, 'iterator')) {
	    return new LazyTransformer(xform, coll);
	  }
	  throwProtocolError('sequence', coll);
	}

	function into(to, xform, from) {
	  if(isArray(to)) {
	    return transduce(from, xform, arrayReducer, to);
	  }
	  else if(isObject(to)) {
	    return transduce(from, xform, objReducer, to);
	  }
	  else if(to['@@transducer/step']) {
	    return transduce(from,
	                     xform,
	                     to,
	                     to);
	  }
	  throwProtocolError('into', to);
	}

	// laziness

	var stepper = {};
	stepper['@@transducer/result'] = function(v) {
	  return isReduced(v) ? deref(v) : v;
	};
	stepper['@@transducer/step'] = function(lt, x) {
	  lt.items.push(x);
	  return lt.rest;
	};

	function Stepper(xform, iter) {
	  this.xform = xform(stepper);
	  this.iter = iter;
	}

	Stepper.prototype['@@transducer/step'] = function(lt) {
	  var len = lt.items.length;
	  while(lt.items.length === len) {
	    var n = this.iter.next();
	    if(n.done || isReduced(n.value)) {
	      // finalize
	      this.xform['@@transducer/result'](this);
	      break;
	    }

	    // step
	    this.xform['@@transducer/step'](lt, n.value);
	  }
	}

	function LazyTransformer(xform, coll) {
	  this.iter = iterator(coll);
	  this.items = [];
	  this.stepper = new Stepper(xform, iterator(coll));
	}

	LazyTransformer.prototype[protocols.iterator] = returnThis;

	LazyTransformer.prototype.next = function() {
	  this['@@transducer/step']();

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

	LazyTransformer.prototype['@@transducer/step'] = function() {
	  if(!this.items.length) {
	    this.stepper['@@transducer/step'](this);
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

	function returnThis() {
	  return this;
	}

	module.exports = {
	  reduce: reduce,
	  transformer: transformer,
	  Reduced: Reduced,
	  isReduced: isReduced,
	  iterator: iterator,
	  push: push,
	  merge: merge,
	  transduce: transduce,
	  seq: seq,
	  toArray: toArray,
	  toObj: toObj,
	  toIter: toIter,
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
	  takeNth: takeNth,
	  zip: zip,
	  drop: drop,
	  dropWhile: dropWhile,
	  partition: partition,
	  partitionBy: partitionBy,
	  interpose: interpose,
	  repeat: repeat,
	  range: range,
	  protocols: protocols,
	  LazyTransformer: LazyTransformer
	};


/***/ })
/******/ ]);