## Procnet ![build](https://travis-ci.org/AGhost-7/procnet.svg?branch=master)
A remote provider built for use with [pogostick](https://github.com/AGhost-7/pogostick) (although you could use a different rpc 
library).

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
module.exports = procnet.service(['math'], function(math) {
	return {
		surface: function(h, w) {
			return math.multiply(h, w);
		}
	};
});
```

### Read More
- [API Docs](http://aghost-7.github.io/procnet/module-procnet.html)
- [Tests](https://github.com/AGhost-7/procnet/tree/master/test)
