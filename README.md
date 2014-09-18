
# transducers.js

A small library for generalized transformation of data. This provides a small amount a transformation functions that can be applied to any data structure. It is a direct port of Clojure's [transducers](http://blog.cognitect.com/blog/2014/8/6/transducers-are-coming) in JavaScript. *This is early work and should not be used in production yet*

```
npm install transducers.js
```

For browsers, grab the file `dist/transducers.js`.

When writing programs, we frequently write methods that take in collections, do something with them, and return a result. The problem is that we frequently only write these functions to work a specific data structure, so if we ever change our data type or wanted to reuse that functionality, you can't. We need to decouple these kinds of concerns.

A transducer is just a reducing function that transforms the value in some way. A reducing function has the form `function(result, input) {}` and returns a new result. If we express our transformations as these functions, we can easily compose them together without any knowledge of the source or destination result. [Read the introduction blog post](#) for much more thorough explanation.

Available transformations:

* `map(f, coll?)`
* `filter(f, coll?)`
* `remove(f, coll?)`
* `keep(f, coll?)`
* `dedupe(coll?)`
* `take(n, coll?)`
* `takeWhile(f, coll?)`
* `drop(n, coll?)`
* `dropWhile(f, coll?)`
* `cat`
* `mapcat(f)`

Most of these transformations optionally takes a collection, and it will immediately run the transformation over it. These are highly optimized for builtin data types so if you pass an array in `map` it literally just runs a `while` loop and calls your function on each value.

If you don't pass a collection, it returns a transducer that you can apply in several ways. You can use `compose` to combine transformations. Here's an example. `sequence` returns a collection of the same type with the transformations applied to each value:

```js
sequence(
  compose(
    cat,
    map(x => x + 1),
    dedupe(),
    drop(3)
  ),
  [[1, 2], [3, 4], [4, 5]]
)
// -> [ 5, 6 ]
```

## Applying Transducers

Use transducers with the following functions:

* `sequence(xform, coll)` - get a collection of the same type and fill it with the results of applying `xform` over each item in `coll`
* `transduce(xform, f, init, coll)` - reduce a collection starting with the initial value `init`, applying `xform` to each value and running the reducing function `f`
* `into(to, xform, from)` - apply xform to each value in the collection `from` and append it to the collection `to`

Additionally, a CSP channel from [js-csp](https://github.com/jlongster/js-csp) can take a transducer: `chan(1, xform)`. You can apply the exact same transformations over channels (which are basically streams!):

```js
var ch = chan(1, compose(
  cat,
  map(x => x + 1),
  dedupe(),
  drop(3)
));

go(function*() {
  yield put(ch, [1, 2]);
  yield put(ch, [3, 4]);
  yield put(ch, [4, 5]);
});

go(function*() {
  while(!ch.closed) {
    console.log(yield take(ch));
  }
});

// output: 5, 6
```

## Iterating and Building

In order to apply a transducer, we need to know two things: how to iterate the collection and how to build up a new collection (assuming we aren't using `transduce` where you can build up anything). Luckily ES6 already gives a protocol for iteration, so anything conforming to that can be iterated over (generators, NodeLists, etc). If you attempt to iterate over an object, transducers.js will automatically convert it into an array of two-dimensional arrays of key/value pairs.

Here's just a few examples:

```js
var xform = compose(map(x => x * 2),
                    filter(x => x > 5));

into([], xform, [1, 2, 3, 4]);
// -> [ 6, 8 ]

console.log(into([],
     map(kv => [kv[0], kv[1] * 2]),
                 { x: 1, y: 2 }));
// -> [ [ 'x', 2 ], [ 'y', 4 ] ]

function *data() {
  yield 1;
  yield 2;
  yield 3;
  yield 4;
}

into([], xform, data());
// -> [ 6, 8 ]

// assuming div.page and div.article exist:
into([], map(x => x.className), document.querySelectorAll('div'));
// -> [ '.page', '.article' ]
```

In all of those examples, we are collecting the results into an array. So what about building data structures? What if we want an object, or something else back?

If you ask to build up an object, transducers.js will automatically transform an array of two-dimensional array key/value pairs into an object. Unfortunately, there is no existing protocol to make this happen for arbitrary data types like there is for iteration. We have to make our own.

If you are authoring a new data structure, you could provide functions for running transducers and implement that yourself. But we don't really want to force authors to be aware of transducers, and it's healthier for the community if we adopt protocols instead. So I'm proposing two new methods that all data structures can implement: `@@append` and `@@empty`.

* `@@append` - add a new item to the collection
* `@@empty` - return a newly-allocated empty collection of the same type

With these two methods, we can build up new collections arbitrarily without caring our their actual implementation. They are prefixed with two `at`s because ideally they are ES6 symbols, and that's how we write them in docs. Since symbols aren't implemented everywhere yet, you can just add methods literally called `"@@append"`.

With JavaScript prototypes, you can actually monkeypatch existing libraries quite easily. Let's say we wanted to use [immutable-js](https://github.com/facebook/immutable-js). It already implement the iterator protocol with a method `@@iterator`, but let's add two more:

```js
Immutable.Vector.prototype['@@append'] = function(x) {
  return this.push(x);
};

Immutable.Vector.prototype['@@empty'] = function(x) {
  return Immutable.Vector();
};
```

Now we can work with `Immutable.Vector` in all of our functions:

```
into(Immutable.Vector(),
     map(x => x + 1),
     [1, 2, 3, 4]);
// -> Immutable.Vector(2, 3, 4, 5)

sequence(compose(
           map(x => x * 2),
           filter(x => x > 5)
         ),
         Immutable.Vector(1, 2, 3, 4));
// -> Immutable.Vector(6, 8)
```

You could do the same thing with ES6 `Set` and `Map` types. Separating concerns provides a powerful way to write programs that can be reused easily.

[BSD LICENSE](#)
