define(['jquery', 'underscore'], function($, _) {
	var api = {};

	function _error(func) {
		if (!_.isFunction(func)) {
			throw "parameter func is not a function!";
		}

		return function(data) {
			if (data.result !== 0) {
				throw "server error";
			}

			return func.call(null, data);
		}
	}

	api.slice = function(offset, length) {
		if (arguments.length === 0) {
			offset = 0;
			length = 10;
		} else if (arguments.length === 1) {
			length = 10;
		} else {
			offset = arguments[0];
			length = arguments[1];
		}

		return $.get("/images", {
			offset: offset,
			length: length
		}, "json").then(_error(function(data) {
			return data.images;
		}));
	};

	return api;
});