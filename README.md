
# transducers.js

A small library for generalized transformation of data. This provides a bunch of transformation functions that can be applied to any data structure. It is a direct port of Clojure's [transducers](http://blog.cognitect.com/blog/2014/8/6/transducers-are-coming) in JavaScript. Read more in [this post](http://jlongster.com/Transducers.js--A-JavaScript-Library-for-Transformation-of-Data).

The algorithm behind this, explained in the above post, not only allows for it to work with any data structure (arrays, objects, iterators, immutable data structures, you name it) but it also provides better performance than other alternatives such as underscore or lodash. This is because there are no intermediate collections. See [this post](http://jlongster.com/Transducers.js-Round-2-with-Benchmarks) for benchmarks.

```
npm install transducers.js
```

For browsers, grab the file `dist/transducers.js`.

When writing programs, we frequently write methods that take in collections, do something with them, and return a result. The problem is that we frequently only write these functions to work a specific data structure, so if we ever change our data type or wanted to reuse that functionality, you can't. We need to decouple these kinds of concerns.

A transducer is a function that takes a reducing function and returns a new one. It can perform the necessary work and call the original reducing function to move on to the next "step". In this library, a transducer a little more than that (it's actually an object that also supports init and finalizer methods) but generally you don't have to worry about these internal details. Read [my post](http://jlongster.com/Transducers.js--A-JavaScript-Library-for-Transformation-of-Data) if you want to learn more about the algorithm.

```js
var transform = compose(
  map(x => x * 3),
  filter(x => x % 2 === 0),
  take(2)
);

seq([1, 2, 3, 4, 5], transform);
// -> [ 6, 12 ]

function* nums() {
  var i = 1;
  while(true) {
    yield i++;
  }
}

into([], transform, nums());
// -> [ 6, 12 ]

into([], transform, Immutable.List.of(1, 2, 3, 4, 5))
// -> [ 6, 12 ]
```

All of these work with arrays, objects, and any iterable data structure (like [immutable-js](https://github.com/facebook/immutable-js)) and you get all the high performance guarantees for free. The above code always only performs 2 transformations because of `take(2)`, no matter how large the array. This is done without laziness or any overhead of intermediate structures.

## Transformations

The following transformations are available, and there are more to come (like `partition`).

* `map(coll?, f, ctx?)` &mdash; call `f` on each item
* `filter(coll?, f, ctx?)` &mdash; only include the items where the result of calling `f` with the item is truthy
* `remove(coll?, f, ctx?)` &mdash; only include the items where the result of calling `f` with the item is falsy
* `keep(coll?)` &mdash; remove all items that are `null` or `undefined`
* `take(coll?, n)` &mdash; grab only the first `n` items
* `takeWhile(coll?, f, ctx?)` &mdash; grab only the first items where the result of calling `f` with the item is truthy
* `drop(coll?, n)` &mdash; drop the first `n` items and only include the rest
* `dropWhile(coll?, f, ctx?)` &mdash; drop the first items where the result of calling `f` with the item is truthy
* `dedupe(coll?)` &mdash; remove consecutive duplicates (equality compared with ===)

The above functions optionally take a collection to immediately perform the transformation on, and a context to bind `this` to when calling `f`. That means you can call them in four ways:

* Immediately perform a map: `map([1, 2, 3], x => x + 1)`
* Same as above but call the function with `this` as `ctx`: `map([1, 2, 3], function(x) { return x + 1; }, ctx)`
* Make a map transducer: `map(x => x + 1)`
* Same as above but with `this` as `ctx`: `map(function(x) { return x + 1; }, ctx)`

(I will be using the ES6 fat arrow syntax, but if that's not available just `function` instead)

The signature of running an immediate map is the same familiar one as seen in lodash and underscore, but now you can drop the collection to make a transducer and run multiple transformations with good performance:

```js
var transform = compose(
  map(x => x + 1),
  filter(x => x % 2 === 0),
  take(2)
);
```

`compose` is a provided function that simply turns `compose(f, g)` into `x => f(g(x))`. You use it to build up transformations. The above transformation would always run the map and filter **only twice** becaue only two items are needed, and it short-circuits once it gets two items. Again, this is done without laziness, read more [here](http://jlongster.com/Transducers.js--A-JavaScript-Library-for-Transformation-of-Data).

There are also 2 transducers available for taking collections and "catting" them into the transformation stream:

* `cat` &mdash; take collections and forward each item individually, essentially flattening it
* `mapcat(f)` &mdash; same as `cat`, but first apply `f` to each collection

Just pass `cat` straight through like so: `compose(filter(x => x.length < 10), cat)`. That would take all arrays with a length less than 10 and flatten them out into a single array.

## Applying Transformations

Building data structure-agnostic transformations is cool, but how do you actually use them? `transducers.js` provides several integration points.

To use a transformation, we need to know how to iterate over the source data structure and how to build up a new one. The former is easy; we can work with arrays, objects, and anything can uses the ES6 iterator protocol (Maps, Sets, generators, etc). All the the below functions works with them.

For the latter, you need to specify what you want back. The following functions allow you to make a new data structure and possibly apply a transformation:

* `toArray(coll, xform?)` &mdash; Turn `coll` into an array, applying the transformation `xform` to each item if provided. The transform is optional in case you want to do something like turn an iterator into an array.
* `toObj(coll, xform?)` &mdash; Turn `coll` into an object if possible, applying the transformation `xform` if provided. When an object is iterated it produces two-element arrays `[key, value]`, and `obj` will turn these back into an object.
* `toIter(coll, xform?)` &mdash; Make an iterator over `coll`, and apply the transformation `xform` to each value if specified. Note that `coll` can just be another iterator. **Transformations will be applied lazily**.
* `seq(coll, xform)` &mdash; A generalized method that will return the same data type that was passed in as `coll`, with `xform` applied. You will usually use this unless you know you want an array, object, or iterator. If `coll` is an iterator, another iterator will be returned and transformations will be applied lazily.
* `into(to, xform, from)` &mdash; Apply `xform` to each item in `from` and append it to `to`. This has the effect of "pouring" elements into `to`. You will commonly use this when converting one type of object to another.
* `transduce(coll, xform, reducer, init?)` &mdash; Like `reduce`, but apply `xform` to each value before passing to `reducer`. If `init` is not specify it will attempt to get it from `reducer`.

The possibilities are endless:

```js
// Map an object
seq({ foo: 1, bar: 2 }, map(kv => [kv[0], kv[1] + 1]));
// -> { foo: 2, bar: 3 }

// Make an array from an object
toArray({ foo: 1, bar: 2 });
// -> [ [ 'foo', 1 ], [ 'bar', 2 ] ]

// Make an array from an iterable
function* nums() {
  var i = 1;
  while(true) {
    yield i++;
  }
}
into([], take(3), nums());
// -> [ 1, 2, 3 ]

// Lazily transform an iterable
var iter = seq(nums(), compose(map(x => x * 2),
                               filter(x => x > 4));
iter.next().value; // -> 6
iter.next().value; // -> 8
iter.next().value; // -> 10
```

## Laziness

Transducers remove the requirement of being lazy to optimize for things like `take(10)`. However, it can still be useful to "bind" a collection to a set of transformations and pass it around, without actually evaluating the transformations.

As noted above, whenever you apply transformations to an iterator it does so lazily. It's easy convert array transformations into a lazy operation, just use the utility function `iterator` to grab an iterator of the array instead:

```js
seq(iterator([1, 2, 3]),
    compose(
      map(x => x + 1),
      filter(x => x % 2 === 0)))
// -> <Iterator>
```

Our transformations are completely blind to the fact that our transformations may or may not be lazy.

## Utility Functions

This library provides a few small utility functions:

* `iterator(coll)` &mdash; Get an iterator for `coll`, which can be any type like array, object, iterator, or custom data type
* `push(arr, value)` &mdash; Push `value` onto `arr` and return `arr`
* `merge(obj, value)` &mdash; Merge `value` into `obj`. `value` can be another object or a two-element array of `[key, value]`
* `range(n)` &mdash; Make an array of size `n` filled with numbers from `0..n`.

## immutable-js

We've talked about how this can be applied to any data structure &mdash; let's see that in action. Here's how you could use this with [immutable-js](https://github.com/facebook/immutable-js).

```js
Immutable.fromJS(
  seq(Immutable.Vector(1, 2, 3, 4, 5),
      compose(
        map(function(x) { return x + 10; }),
        map(function(x) { return x * 2; }),
        filter(function(x) { return x % 5 === 0; }),
        filter(function(x) { return x % 2 === 0; })))
)
```

We can use our familiar `seq` function because `Immutable.Vector` implements the iterator protocol, so we can iterator over it. Because `seq` is working with an iterator, it returns a new iterator that will *lazily transform each value*. We can simply pass this iterator into `Immutable.Vector.from` to construct a new one, and we have a new transformed immutable vector with no intermediate collections except for one lazy transformer!

The builtin transformations perform well because they minimize allocations, but since we don't have any intermediate structures or laziness machinery, this performs slightly better. The point is not to beat it, but to show that both are high-performance but we can apply our performance to any data structure.

## CSP Channels

This not only works with all the JavaScript data structures you can think of, but it even works for things like streams. Soon channels from [js-csp](https://github.com/ubolonton/js-csp) will be able to take a transformation and you get all of this for channels for free:

```js
var ch = chan(1, compose(
  cat,
  map(x => x + 1),
  dedupe(),
  drop(3)
));
```

## The `transducer` protocol

While it's great that you can apply transducers to custom data structures, it's a bit annoying to always have to use constructor functions like `Immutable.fromJS`. One option is to define a new protocol complementary to `iterator`.

This conforms to the [official transducer spec](https://github.com/cognitect-labs/transducers-js/issues/20) so if you implement this, you can use it with all transducer libraries that conform to it.

To implement the transducer protocol, you add methods to the prototype of your data structure. A transformer is an object with three methods: `init`, `result`, and `step`. `init` returns a new empty object, `result`, can perform any finalization steps on the resulting collection, and `step` performs a reduce. 

These methods are namespaced and in the future could be symbols. Here's what it looks like for `Immutable.List`:

```js
Immutable.List.prototype['@@transducer/init'] = function() {
  return Immutable.List().asMutable();
};

Immutable.List.prototype['@@transducer/result'] = function(lst) {
  return lst.asImmutable();
};

Immutable.List.prototype['@@transducer/step'] = function(lst, x) {
  return lst.push(x);
};
```

If you implement the transducer protocol, now your data structure will work with *all* of the builtin functions. You can just use `seq` like normal and you get back an immutable vector!

```js
t.seq(Immutable.List.of(1, 2, 3, 4, 5),
      t.compose(
        t.map(function(x) { return x + 10; }),
        t.map(function(x) { return x * 2; }),
        t.filter(function(x) { return x % 5 === 0; }),
        t.filter(function(x) { return x % 2 === 0; })));
// -> List [ 30 ]
```

## Running Tests

```
npm install
gulp
mocha build/tests
```

[BSD LICENSE](https://github.com/jlongster/transducers.js/blob/master/LICENSE)
