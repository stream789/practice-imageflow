define(["jquery", "underscore", "api"], function($, _, api) {
	var COLUMNS = 5;
	var CARD_WIDTH = 180;
	var GUTTER = 15;

	function CellLoader() {
		this.status = CellLoader.INITIALIZED;
	}

	CellLoader.prototype.isLoading = function() {
		return this.status === CellLoader.LOADING;
	};

	CellLoader.prototype.loadMore = function(offset) {
		var self = this;
		this.status = CellLoader.LOADING;
		return api.slice(offset).then(function(images) {
			self.status = CellLoader.SUCCESS;
			return images;
		}, function(err) {
			self.status = CellLoader.FAIL;
			throw err;
		});
	};

	CellLoader.INITIALIZED = "initialized";
	CellLoader.LOADING = "loading";
	CellLoader.SUCCESS = "success";
	CellLoader.FAIL = "fail";

	function CellView(cell) {
		this.cell = cell;
	};

	CellView.template = _.template(
		"<div class='cell'>" +
		"	<img src='<%-link%>' width='<%-width%>' height='<%-height%>'>" +
		"</div>");

	CellView.prototype.onCreate = function() {
		this.img = this.$el.find("img")[0];
		this.img.onload = _.bind(function() {
			this.$el.css("background", "transparent");
		}, this);
	};

	CellView.prototype.onDestroy = function() {
		this.img.onload = null;
	};

	CellView.prototype.render = function() {
		var el = this.el = $(CellView.template({
			width: CARD_WIDTH,
			height: this.cell.height,
			link: this.cell.image.path
		}))[0];
		this.$el = $(el);
		this.$el.css("left", this.cell.x + "px");
		this.$el.css("top", this.cell.y + "px");
		this.$el.css("width", this.cell.width + "px");
		this.$el.css("height", this.cell.height + "px");
		if (this.cell.column() === 0) {
			this.$el.addClass("left");
		}
		return el;
	};

	function Cell(image) {
		this.image = image;
		var d = image.dimension;
		this.height = CARD_WIDTH / d.width * d.height;
	}

	Cell.prototype.position = function(x, y) {
		this.x = x;
		this.y = y;
	};

	Cell.prototype.isVisible = function(range) {
		var maxTop = Math.max(this.y, range.top);
		var minBottom = Math.min(this.bottom(), range.bottom);
		return minBottom >= maxTop;
	};

	Cell.prototype.bottom = function() {
		return this.y + this.height;
	};

	Cell.prototype.column = function() {
		return Math.floor(this.x / (CARD_WIDTH + GUTTER));
	};

	function _getColumnHeight(col) {
		return _.reduce(_.filter(this.cells, function(cell) {
			return cell.column() == col;
		}), function(height, cell) {
			return Math.max(cell.bottom(), height);
		}, 0);
	}

	function _getMinHeightColumn() {
		return _.reduce(_.map(_.range(COLUMNS), function(col) {
			return {
				height: _getColumnHeight.call(this, col),
				index: col
			};
		}, this), function(current, column) {
			return current.height <= column.height ? current : column;
		});
	}

	function _isFullfilled() {
		var cellsRange = this._getShownCellsRange();
		var frameRange = this._getFrameRange();
		var result = cellsRange.top <= frameRange.top &&
			frameRange.bottom < cellsRange.bottom;
	}

	function ViewPort(el) {
		this.el = el;
		this.$el = $(el);
		this.cells = [];
		this.shownCells = [];
		this.cellViews = [];
		this.$window = $(window);
		this.loader = new CellLoader();
		this.dryup = false;
		_ensureCellViews.call(this);

		window.onscroll = _.bind(_ensureCellViews, this);
		window.onresize = _.bind(_ensureCellViews, this);
	}

	function _getShownCellsOfColumn(col) {
		return _.filter(this.shownCells, function(cell) {
			return col === cell.column();
		});
	}

	function _lowerCell(current, cell) {
		return (current != null && current.y < cell.y) ? current : cell;
	}

	function _higherCell(current, cell) {
		return (current != null && current.y > cell.y) ? current : cell;
	}

	function _getFirstShownCellOfColumn(col) {
		return _.reduce(_getShownCellsOfColumn.call(this, col), _lowerCell, null);
	}

	function _getLastShownCellOfColumn(col) {
		return _.reduce(_getShownCellsOfColumn.call(this, col), _higherCell, null);
	}

	function _getCellsOfColumn(col) {
		return _.filter(this.cells, function(cell) {
			return col === cell.column();
		});
	}

	function _getLastCellOfColumn(col) {
		return _.reduce(_getCellsOfColumn.call(this, col), _higherCell, null);
	}

	function _showCell(cell) {
		console.log("show cell", cell.image.id);
		if (~_.indexOf(this.shownCells, cell)) {
			return;
		}

		this.shownCells.push(cell);
		var cellView = new CellView(cell);
		this.$el.append(cellView.render());
		cellView.onCreate();
		this.cellViews.push(cellView);
	}

	function _hideCell(cell) {
		console.log("hide cell", cell.image.id);
		this.shownCells = _.without(this.shownCells, cell);
		var view = _.find(this.cellViews, function(view) {
			return view.cell === cell;
		});
		this.cellViews = _.without(this.cellViews, view);
		view.$el.remove();
		view.onDestroy();
	}

	function _needLoadMoreCells() {
		var range = this._getFrameRange();
		var hasSpace = _.some(_.range(COLUMNS), function(col) {
			var cell = _getLastCellOfColumn.call(this, col);
			return cell === null || cell.bottom() < range.bottom;
		}, this);
		return hasSpace && !this.loader.isLoading() && !this.dryup;
	}

	function _onCellsChanged() {
		var highestCell = _.reduce(this.cells, function(c1, c2) {
			return c1.bottom() > c2.bottom() ? c1 : c2;
		});
		this.$el.css("height", highestCell.bottom() + "px");
		_ensureCellViews.call(this);
	}

	function _addCells(images) {
		if (images.length === 0) {
			this.dryup = true;
			return;
		}

		_.each(images, function(img) {
			var cell = new Cell(img);
			var col = _getMinHeightColumn.call(this);
			var x = col.index * (CARD_WIDTH + GUTTER);
			var y = col.height === 0 ? 0 : col.height + GUTTER;
			cell.position(x, y);
			this.cells.push(cell);
		}, this);
		_onCellsChanged.call(this);
	};

	ViewPort.prototype._getFrameRange = function() {
		return {
			top: this.$window.scrollTop(),
			bottom: this.$window.scrollTop() + this.$window.height()
		};
	};

	ViewPort.prototype._getShownCellsRange = function() {
		var ranges = _.map(_.range(COLUMNS), function(col) {
			var first = _getFirstShownCellOfColumn.call(this, col);
			var last = _getLastShownCellOfColumn.call(this, col);
			return {
				top: first !== null ? first.y : this.$window.scrollTop(),
				bottom: last !== null ? last.bottom() : this.$window.scrollTop()
			};
		}, this);

		return _.reduce(ranges, function(range, item) {
			return {
				top: Math.max(range.top, item.top),
				bottom: Math.min(range.bottom, item.bottom)
			};
		});
	};

	function _deleteInvisibleCells() {
		var viewRange = this._getFrameRange();
		_.each(_.range(COLUMNS), function(col) {
			_.each(_getShownCellsOfColumn.call(this, col), function(cell) {
				if (!cell.isVisible(viewRange)) {
					_hideCell.call(this, cell);
				}
			}, this);
		}, this);
	}

	function _addVisibleCells() {
		var viewRange = this._getFrameRange();
		_.each(_.range(COLUMNS), function(col) {
			var shownCells = _getShownCellsOfColumn.call(this, col);
			_.each(_getCellsOfColumn.call(this, col), function(cell) {
				if (~_.indexOf(shownCells, cell)) {
					return;
				}

				if (cell.isVisible(viewRange)) {
					_showCell.call(this, cell);
				}
			}, this);
		}, this);
	}

	function _ensureCellViews() {
		if (_isFullfilled.call(this)) {
			return;
		}

		_deleteInvisibleCells.call(this);
		_addVisibleCells.call(this);

		if (_needLoadMoreCells.call(this)) {
			this.loader.loadMore(this.cells.length)
				.then(_.bind(_addCells, this));
		}
	}

	return ViewPort;
});