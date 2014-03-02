require.config({
	paths: {
		jquery: 'lib/jquery/dist/jquery.min',
		underscore: 'lib/underscore/underscore'
	}
});

require(['jquery', 'underscore', 'api', 'viewport'], function($, _, api, ViewPort) {
	$(function() {
		var viewport = new ViewPort($(".cells")[0]);
	});
});