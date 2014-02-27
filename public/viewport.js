define(["jquery", "underscore", "api"], function($, _, api) {
	var COLUMNS = 5;
	var CARD_WIDTH = 180;
	var GUTTER = 15;

	function CellView = function(cell) {
		this.cell = cell;
		this.el = $(CellView.template({
			width: CARD_WIDTH,
			height: cell.height
			link: cell.image.link
		}))[0];
	};

	CellView.template = _.template("<div class='cell'>" +
		"<img src='<%-link%>' width='<%-width%>' height='<%-width%>'>" +
		"</div>");
	CellView.prototype.onCreate = function() {};
	CellView.prototype.onDestroy = function() {};

	function Cell(image) {
		this.image = image;
		var d = image.dimension;
		this.height = d.width / CARD_WIDTH * d.height;
	}

	Cell.prototype.column = function() {
		return this.x % (CARD_WIDTH + GUTTER);
	};

	function _getColumnHeight(col) {
		return _.reduce(_.filter(this.cells, function(cell) {
			return cell.column = col;
		}), function(height, cell) {
			return Math.max(cell.y + cell.height, height);
		}, 0);
	}

	function _getMinHeightColumn() {
		var col = 0;
		var height = _getColumnHeight.call(this, col);
		for (var i = 1; i < OOLS; i++) {
			var _height = getHeight(i);
			if (height < _height) {
				height = _height;
				col = i;
			}
		}

		return {
			index: col,
			height: _height;
		};
	}

	function _getViewsRange() {
		var bottom = _.reduce(_.map(this.visibleCells, function(cell) {
			return cell.y + cell.height;
		}), Math.min, 0);


		var top = _.reduce(_.map(this.visibleCells, function(cell) {
			return cell.y;
		}), Math.max, 0) + 1;

		return {
			top: top,
			bottom: bottom
		};
	}

	function _getFrameRange() {
		return {
			top: this.el.offsetHeight,
			bottom: this.el.offsetHeight + this.el.height
		};
	}

	function _isFullfilled() {
		var viewsRange = _getViewsRange.call(this);
		var frameRange = _getFrameRange.call(this);
		return viewRange.top <= frameRange.top &&
			frameRange.bottom < viewsRange.bottom;
	}

	function ViewPort(el) {
		this.el = el;
		this.$el = $(el);
		this.cells = [];
		this.visibleCells = [];
		this.cellViews = [];
		this.columns = new Array(COLUMNS);
		for (var i = 0; i < COLUMNS; i++) {
			this.columns[i] = [];
		}
	}

	function _getVisibleCellsOfColumn(col) {
		return _.filter(this.visibleCells, function(cell) {
			return col === cell.column();
		});
	}

	function _getFirstVisibleCellOfColumn(col) {
		return _.reduce(_getVisibleCellsOfColumn.call(this, col), function(memo, cell) {
			return memo.y < cell.y ? memo : cell;
		});
	}


	function _getLastVisibleCellOfColumn(col) {
		return _.reduce(_getVisibleCellsOfColumn.call(this, col), function(memo, cell) {
			return memo.y < cell.y ? memo : cell;
		});
	}

	function _addVisibleCell(cell) {
		this.visibleCells.push(cell);
		var cellView = new CellView(cell);
		this.$el.append(cellView.el);
		cellView.onCreate();
		this.cellViews.push(cellView);
	}

	function _removeVisibleCell(cell) {
		this.visibleCells.remove(cell);
		var view = _.find(this.cellViews, function(view) {
			return view.cell === cell;
		});
		this.cellViews.remove(view);
		this.$el.remove(view.el);
		view.el.onDestroy();
	}

	function _needLoadMoreCells() {
		for (var i = 0; i < COLUMNS; i++) {
			var cell = _getLastVisibleCellOfColumn.call(this, i);
			if (cell.bottom === this.el.scrollHeight) {
				return true;
			}
		}

		return false;
	}

	ViewPort.prototype.ensureCellViews = function() {
		if (_isFullfilled.call(this)) {
			return;
		}

		var viewsRange = _getViewsRange.call(this);
		var frameRange = _getFrameRange.call(this);
		if (viewsRange.top > frame.top) {
			_.each(_.range(COLUMNS), function(col) {
				var cells = _getVisibleCellsOfColumn.call(this, col);
				var cell = _getFirstVisibleCellOfColumn.call(this, col);
				var index = _.indexOf(cells, cell);
				var pos = index;
				while (pos >= 0 && cells[pos].y > frame.top) {
					_addVisibleCell.call(this, cells[pos--])
				}
			});
		} else {
			_.each(_.range(COLUMNS), function(col) {
				var cells = _getVisibleCellsOfColumn.call(this, col);
				var cell = _getFirstVisibleCellOfColumn.call(this, col);
				var index = _.indexOf(cells, cell);
				var pos = index;
				while (cells[pos].bottom <= frame.top) {
					_remoteVisibleCell.call(this, cells[pos++]);
				}
			});
		}

		if (viewsRange.bottom <= frame.bottom) {
			if (_needLoadMoreCells.call(this)) {

			} else {

			}
		} else {
			_.each(_.range(COLUMNS), function(col) {
				var cells = _getVisibleCellsOfColumn.call(this, col);
				var cell = _getLastVisibleCellOfColumn.call(this, col);
				var index = _.indexOf(cells, cell);
				var pos = index;
				while (cells[pos].up > frame.bottom) {
					_remoteVisibleCell.call(this, cells[pos--]);
				}
			});
		}
	};


	return ViewPort;
});