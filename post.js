
// All transformations can ultimately be expressed with reduce:

[1, 2, 3].reduce(function(acc, x) {
  return acc + x;
}, 0);

// Reduce essentially is a simple iterator, but it also threads an
// arbitrary value through the iteration allowing you complete control
// over how it builds up the result. If you're result is an array, you
// could add multiple items in a single step, or even remove items,
// which you couldn't do if you were bound to a map-like interface.

// The function above `function(acc, x) {}` is a *reducing* function, meaning
// it's just a function that can be passed to `reduce`. It takes two
// values, a result and input, and produces a new result.

// The problem with the above `reduce` is that it has several
// assumptions. We are using a reduce that only works on native
// arrays, which implies eager and sequential iteration. In fact, all
// JavaScript transformations have this problem. We can't reuse any
// transformations between data types.

// Let's make map.

function map(coll, f) {
  coll.reduce(function(acc, x) {
    acc.push(f(x));
    return acc;
  }, []);
}

