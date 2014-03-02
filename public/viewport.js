define(["jquery", "underscore", "api"], function($, _, api) {
	var COLUMNS = 5;
	var CARD_WIDTH = 180;
	var GUTTER = 15;

	function CellLoader() {
		this.status = "initialized";
		this._count = 0;
	}

	CellLoader.prototype.isLoading = function() {
		return this.status === CellLoader.LOADING;
	};

	CellLoader.prototype.loadMore = function(offset) {
		var self = this;
		this.status = CellLoader.LOADING;

		var current = this._count;
		return api.slice(offset).then(function(images) {
			if (current !== self._count) {
				throw 'task has been cancelled';
			}

			this.status = CellLoader.SUCCESS;
			return images;
		}, function(err) {
			this.status = CellLoader.FAIL;
			throw err;
		});
	};

	CellLoader.prototype.cancel = function() {
		if (!this.isLoading()) {
			return console.error("Status is not loading, ignore!");
		}

		this._count++;
		this.status = CellLoader.INITIALIZED;
	};

	CellLoader.INITIALIZED = "initialized";
	CellLoader.LOADING = "loading";
	CellLoader.SUCCESS = "scucess";
	CellLoader.FAIL = "fail";

	function CellView(cell) {
		this.cell = cell;
		this.render();
	};

	CellView.template = _.template("<div class='cell'>" +
		"<img src='<%-link%>' width='<%-width%>' height='<%-height%>'>" +
		"</div>");
	CellView.prototype.onCreate = function() {};
	CellView.prototype.onDestroy = function() {};

	CellView.prototype.render = function() {
		var el = this.el = $(CellView.template({
			width: CARD_WIDTH,
			height: this.cell.height,
			link: this.cell.image.path
		}))[0];
		this.$el = $(el);
		this.$el.css("left", this.cell.x + "px");
		this.$el.css("top", this.cell.y + "px");
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

	Cell.prototype.bottom = function() {
		return this.y + this.height;
	}

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
		var cellsRange = this._getVisibleCellsRange();
		var frameRange = this._getFrameRange();
		return cellsRange.top <= frameRange.top &&
			frameRange.bottom < cellsRange.bottom;
	}

	function ViewPort(el) {
		this.el = el;
		this.$el = $(el);
		this.cells = [];
		this.visibleCells = [];
		this.cellViews = [];
		this.loader = new CellLoader();
		_ensureCellViews.call(this);

		window.onscroll = _.bind(_ensureCellViews, this);
		window.onresize = _.bind(_ensureCellViews, this);
	}

	function _getVisibleCellsOfColumn(col) {
		return _.filter(this.visibleCells, function(cell) {
			return col === cell.column();
		});
	}

	function _lowerCell(current, cell) {
		return (current != null && current.y < cell.y) ? current : cell;
	}

	function _higherCell(current, cell) {
		return (current != null && current.y > cell.y) ? current : cell;
	}

	function _getFirstVisibleCellOfColumn(col) {
		return _.reduce(_getVisibleCellsOfColumn.call(this, col), _lowerCell, null);
	}

	function _getLastVisibleCellOfColumn(col) {
		return _.reduce(_getVisibleCellsOfColumn.call(this, col), _higherCell, null);
	}

	function _getCellsOfColumn(col) {
		return _.filter(this.cells, function(cell) {
			return col === cell.column();
		});
	}

	function _getLastCellOfColumn(col) {
		return _.reduce(_getCellsOfColumn.call(this, col), _higherCell, null);
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
		var range = this._getFrameRange(this);
		return _.some(_.range(COLUMNS), function(col) {
			var cell = _getLastCellOfColumn.call(this, col);
			return cell === null || cell.bottom() <= range.bottom;
		}, this);
	}

	function _addCells(images) {
		_.each(images, function(img) {
			var cell = new Cell(img);
			var col = _getMinHeightColumn.call(this);
			var x = col.index * (CARD_WIDTH + GUTTER);
			var y = col.height === 0 ? 0 : col.height + GUTTER;
			cell.position(x, y);
			this.cells.push(cell);
		}, this);

		_ensureCellViews.call(this);
	};

	ViewPort.prototype._getFrameRange = function() {
		return {
			top: this.el.scrollTop,
			bottom: this.el.scrollTop + $(window).height()
		};
	};

	ViewPort.prototype._getVisibleCellsRange = function() {
		var bottom = _.reduce(_.map(this.visibleCells, function(cell) {
			return cell.y + cell.height;
		}), Math.min, 0);


		var top = _.reduce(_.map(this.visibleCells, function(cell) {
			return cell.y;
		}), Math.max, 0);

		return {
			top: top,
			bottom: bottom
		};
	};

	function _ensureCellViews() {
		if (_isFullfilled.call(this)) {
			return;
		}

		var cellsRange = this._getVisibleCellsRange();
		var frameRange = this._getFrameRange();
		console.log("cells range", cellsRange);

		if (cellsRange.top >= frameRange.top) {
			_.each(_.range(COLUMNS), function(col) {
				var cells = _getCellsOfColumn.call(this, col);
				if (cells.length !== 0) {
					var cell = _getFirstVisibleCellOfColumn.call(this, col);
					var pos = _.indexOf(cells, cell);
					while (pos >= 0 && cells[pos].y > frameRange.top) {
						_addVisibleCell.call(this, cells[--pos])
					}
				}
			});
		} else {
			_.each(_.range(COLUMNS), function(col) {
				var cells = _getVisibleCellsOfColumn.call(this, col);
				var cell = _getFirstVisibleCellOfColumn.call(this, col);
				var index = _.indexOf(cells, cell);
				var pos = index;
				while (cells[pos].bottom() <= frameRange.top) {
					_removeVisibleCell.call(this, cells[pos++]);
				}
			}, this);
		}

		if (cellsRange.bottom <= frameRange.bottom) {
			if (_needLoadMoreCells.call(this)) {
				if (this.loader.isLoading()) {
					this.loader.cancel();
				}

				this.loader.loadMore().then(_.bind(_addCells, this));
			} else {
				_.each(_.range(COLUMNS), function(col) {
					var cells = _getCellsOfColumn.call(this, col);
					var cell = _getLastVisibleCellOfColumn.call(this, col);
					var pos = cell === null ? 0 : _.indexOf(cells, cell) + 1;
					while (cells[pos].bottom() <= frameRange.bottom) {
						_addVisibleCell.call(this, cells[pos++]);
					}
				}, this);
			}
		} else {
			_.each(_.range(COLUMNS), function(col) {
				var cells = _getVisibleCellsOfColumn.call(this, col);
				var cell = _getLastVisibleCellOfColumn.call(this, col);
				var index = _.indexOf(cells, cell);
				var pos = index;
				while (cells[pos].y > frameRange.bottom) {
					_removeVisibleCell.call(this, cells[pos--]);
				}
			}, this);
		}
	}

	return ViewPort;
});