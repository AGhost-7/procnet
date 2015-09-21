## Procnet ![build](https://travis-ci.org/AGhost-7/procnet.svg?branch=master)
A remote provider built for use with [pogostick](https://github.com/AGhost-7/pogostick) (although you could use a different rpc library).

### Define Services
Seperate network code from your service definition.

```javascript
// For example a `math` service
module.exports = procnet.service(function() {
	return {
		add: function(a, b) {
			return a + b;
		},
		multiply: function(a, b) {
			return a * b;
		}
	}
});
```

### Compose Services
```javascript
// An example `rectangle` service.
module.exports = procnet.service(['math'], function(math) {
	return {
		surface: function(h, w) {
			return math.multiply(h, w);
		}
	};
});
```

### Unit Test Services
One of the benefit of seperating your logic this way is the way it permits you to unit 
test your services, mocking dependencies.

```javascript
// You can pick any promise library you want, just need to provide a factory function.
var mock = procnet.mocker(promiseFactory);
var mocked = mock({ 
	math: {
		// Our fake multiply always returns 1 instead
		multiply: function() { return 1; }
	} 
}, rectangle);

mocked
	.surface(2, 2)
	.then(function(r) {
		assert.equal(r, 1);
	});
```

### Read More
- [API Docs](http://aghost-7.github.io/procnet/module-procnet.html)
- [Tests](https://github.com/AGhost-7/procnet/tree/master/test)
