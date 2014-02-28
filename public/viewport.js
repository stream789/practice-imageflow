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
		return api.images(offset).then(function(images) {
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

	Cell.prototype.position = function(x, y) {
		this.x = x;
		this.y = y;
	};

	Cell.prototype.bottom = function() {
		return this.y + this.height;
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
		
		window.onscroll = _.bind(this.ensureViews, this);
		window.onresize = _.bind(this.ensureViews, this);
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
			return memo.y > cell.y ? memo : cell;
		});
	}

	function _getCellsOfColumn(col) {
		return _.filter(this.cells, function(cell) {
			return col === cell.column();
		});
	}

	function _getLastCellOfColumn(col) {
		return _.reduce(_getLastCellOfColumn.call(this, col), function(memo, cell) {
			return memo.y > cell.y ? memo : cell;
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
			if (cell.bottom() === this.el.scrollHeight) {
				return true;
			}
		}

		return false;
	}

	function _addCells = function(images) {
		var self = this;
		var cells = _.map(images, function(img) {
			var cell = new Cell(img);

			var col = _getMinHeightColumn.call(self);
			var x = col * (CARD_WIDTH + GUTTER);
			var y = _getLastCellOfColumn(col).bottom() + GUTTER;
			cell.position(x, y);

			return cell;
		});
		this.cells = this.cells.concat(cells);
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
		}), Math.max, 0) + 1;

		return {
			top: top,
			bottom: bottom
		};
	};

	ViewPort.prototype.ensureCellViews = function() {
		if (_isFullfilled.call(this)) {
			return;
		}

		var cellsRange = this._getVisibleCellsRange();
		var frameRange = this._getFrameRange();
		if (cellsRange.top > frame.top) {
			_.each(_.range(COLUMNS), function(col) {
				var cells = _getCellsOfColumn.call(this, col);
				var cell = _getFirstVisibleCellOfColumn.call(this, col);
				var pos = _.indexOf(cells, cell);
				while (pos >= 0 && cells[pos].y > frame.top) {
					_addVisibleCell.call(this, cells[--pos])
				}
			});
		} else {
			_.each(_.range(COLUMNS), function(col) {
				var cells = _getVisibleCellsOfColumn.call(this, col);
				var cell = _getFirstVisibleCellOfColumn.call(this, col);
				var index = _.indexOf(cells, cell);
				var pos = index;
				while (cells[pos].bottom() <= frame.top) {
					_remoteVisibleCell.call(this, cells[pos++]);
				}
			});
		}

		// TODO
		if (cellsRange.bottom <= frame.bottom) {
			if (_needLoadMoreCells.call(this)) {
				if (this.loader.isLoading()) {
					this.loader.cancel();
				}

				this.loader.loadMore().then(_.bind(_addCells, this));
			} else {
				_.each(_.range(COLUMNS), function(col) {
					var cells = _getCellsOfColumn.call(this, col);
					var cell = _getLastVisibleCellOfColumn.call(this, col);
					var pos = _.indexOf(cells, cell);
					while (cells[pos].bottom() <= frame.bottom) {
						_removeVisibleCell.call(this, cells[++pos]);
					}
				});
			}
		} else {
			_.each(_.range(COLUMNS), function(col) {
				var cells = _getVisibleCellsOfColumn.call(this, col);
				var cell = _getLastVisibleCellOfColumn.call(this, col);
				var index = _.indexOf(cells, cell);
				var pos = index;
				while (cells[pos].y > frame.bottom) {
					_remoteVisibleCell.call(this, cells[pos--]);
				}
			});
		}
	};

	return ViewPort;
});