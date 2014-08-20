/**
 * @class TableView (Datagrid Decorator)
 * @constructor
 *
 * @param {Object} [viewOptions] Configuration object
 * @param {Boolean} [options.editable] will not set class is-selectable to prevent hover effect for complete rows
 * @param {Boolean} [options.removeRow] displays in the last column an icon to remove a row
 * @param {Object} [options.selectItem] Configuration object of select item (column)
 * @param {Boolean} [options.selectItem.inFirstCell] If true checkbox is in the first cell. If true checkbox gets its own cell
 * @param {String} [options.selectItem.type] Type of select [checkbox, radio]
 * @param {Boolean} [options.validation] enables validation for datagrid
 * @param {Boolean} [options.validationDebug] enables validation debug for datagrid
 * @param {Boolean} [options.addRowTop] adds row to the top of the table when add row is triggered
 * @param {Boolean} [options.startTabIndex] start index for tabindex
 * @param {String} [options.columnMinWidth] sets the minimal width of table columns
 * @param {String} [options.fullWidth] If true datagrid style will be full-width mode
 * @param {Array} [options.excludeFields=['id']] array of fields to exclude by the view
 * @param {Boolean} [options.showHead] if TRUE head would be showed
 * @param {Array} [options.icons] array of icons to display
 * @param {String} [options.icons[].icon] the actual icon which sould be displayed
 * @param {String} [options.icons[].column] the id of the column in which the icon should be displayed
 * @param {String} [options.icons[].align] the align of the icon. 'left' org 'right'
 * @param {Function} [options.icons.callback] a callback to execute if the icon got clicked. Gets the id of the data-record as first argument
 * @param {Boolean} [options.hideChildrenAtBeginning] if true children get hidden, if all children are loaded at the beginning
 * @param {String|Number|Null} [options.openChildId] the id of the children to open all parents for. (only relevant in a child-list)
 * @param {String|Number} [options.cssClass] css-class to give the the components element. (e.g. "white-box")
 * @param {Boolean} [options.highlightSelected] highlights the clicked row when selected
 *
 * @param {Boolean} [rendered] property used by the datagrid-main class
 * @param {Function} [initialize] function which gets called once at the start of the view
 * @param {Function} [render] function to render data
 * @param {Function} [destroy] function to destroy the view and unbind events
 * @param {Function} [onResize] function which gets automatically executed on window resize
 * @param {Function} [unbindCustomEvents] function to unbind the custom events of this object
 */
define(function() {

    'use strict';

    var defaults = {
            editable: false,
            fullWidth: false,
            removeRow: false,
            selectItem: {
                type: 'checkbox',      // checkbox, radio
                inFirstCell: false
            },
            noItemsText: 'This list is empty',
            addRowTop: true,
            excludeFields: [''],
            cssClass: '',
            thumbnailFormat: '50x50',
            showHead: true,
            /*hideChildrenAtBeginning: true,*/
            /*openChildId: null,*/
            highlightSelected: false,
            /*icons: []*/
        },

        constants = {
            fullWidthClass: 'fullwidth',
            selectedRowClass: 'selected',
            isSelectableClass: 'is-selectable',
            sortableClass: 'is-sortable',
            skeletonClass: 'husky-table',
            containerClass: 'table-container',
            overflowClass: 'overflow',
            emptyListElementClass: 'empty-list',
            rowRemoverClass: 'row-remover',
            checkboxClass: 'checkbox',
            radioClass: 'radio',
            cellFitClass: 'fit',
            tableClass: 'table',
            rowClass: 'row',
            thumbSrcKey: 'url',
            thumbAltKey: 'alt',
            removeIcon: 'trash-o',
            headerCellClass: 'header-cell',
            ascSortedClass: 'sorted-asc',
            descSortedClass: 'sorted-desc',
            headerCellLoaderClass: 'header-loader',
            headerLoadingClass: 'is-loading',
            editableItemClass: 'editable',
            editableInputClass: 'editable-input',
            inputWrapperClass: 'input-wrapper',
            editedErrorClass: 'server-validation-error',
            newRecordId: 'newrecord',
        },

        selectItems = {
            CHECKBOX: 'checkbox',
            RADIO: 'radio'
        },

        /**
         * Templates used by this class
         */
        templates = {
            skeleton: [
                '<div class="'+ constants.skeletonClass +'">',
                '   <div class="'+ constants.containerClass +'"></div>',
                '</div>'
            ].join(''),
            table: '<table class="'+ constants.tableClass +'"></table>',
            header: '<thead></thead>',
            body: '<tbody></tbody>',
            row: '<tr class="' + constants.rowClass + '"></tr>',
            headerCell: '<th class="'+ constants.headerCellClass +'"></th>',
            cell: '<td></td>',
            headerCellLoader: '<div class="'+ constants.headerCellLoaderClass +'"></div>',
            removeCellContent: '<span class="fa-' + constants.removeIcon + ' '+ constants.rowRemoverClass +'"></span>',
            editableCellContent: [
                '<span class="'+ constants.editableItemClass +'"><%= value %></span>',
                '<div class="'+ constants.inputWrapperClass +'">',
                '   <input type="text" class="form-element husky-validate '+ constants.editableInputClass +'" value="<%= value %>">',
                '</div>'
            ].join(''),
            img: '<img alt="<%= alt %>" src="<%= src %>"/>',
            checkbox: [
                '<div class="custom-checkbox">',
                '   <input class="' + constants.checkboxClass + '" type="checkbox" data-form="false"/>',
                '   <span class="icon"></span>',
                '</div>'
            ].join(''),
            radio: [
                '<div class="custom-radio">',
                '    <input class="' + constants.radioClass + '" name="<%= name %>" type="radio" data-form="false"/>',
                '    <span class="icon"></span>',
                '</div>'
            ].join(''),
            empty: [
                '<div class="'+ constants.emptyListElementClass +'">',
                '   <div class="fa-coffee icon"></div>',
                '   <span><%= text %></span>',
                '</div>'
            ].join('')
        },

        /**
         * used to update the table width and its containers due to responsiveness
         * @event husky.datagrid.update.table
         */
            UPDATE_TABLE = function() {
            return this.datagrid.createEventName.call(this.datagrid, 'update.table');
        },

        /**
         * used to update the table width and its containers due to responsiveness
         * @event husky.datagrid.table.open-child
         * @param {Number|String} id The id of the data-record to open the parents for
         */
            OPEN_PARENTS = function() {
            return this.datagrid.createEventName.call(this.datagrid, 'table.open-parents');
        },

        /**
         * triggered when a radio button inside the datagrid is clicked
         * @event husky.datagrid.table.open-child
         * @param {Number|String} id The id of the data-record to open the parents for
         * @param {String} columnName column name
         */
            RADIO_SELECTED = function() {
            return this.datagrid.createEventName.call(this.datagrid, 'radio.selected');
        },

        /**
         * triggered when children were collapsed
         * @event husky.datagrid.table.children.collapsed
         */
            CHILDREN_COLLAPSED = function() {
            return this.datagrid.createEventName.call(this.datagrid, 'children.collapsed');
        },

        /**
         * triggered when children were expanded
         * @event husky.datagrid.table.children.expanded
         */
            CHILDREN_EXPANDED = function() {
            return this.datagrid.createEventName.call(this.datagrid, 'children.expanded');
        };

    return {

        /**
         * Public methods used by the main datagrid class (start)
         * -------------------------------------------------------------------- */

        /**
         * Initializes the view, gets called only once
         * @param {Object} context The context of the datagrid class
         * @param {Object} options The options used by the view
         */
        initialize: function(context, options) {
            // store context of the datagrid-component
            this.datagrid = context;

            // make sandbox available in this-context
            this.sandbox = this.datagrid.sandbox;

            // merge defaults with options
            this.options = this.sandbox.util.extend(true, {}, defaults, options);

            this.setVariables();
        },

        /**
         * Method to render data in table view
         */
        render: function(data, $container) {
            this.$el = this.sandbox.dom.createElement(templates.skeleton);
            this.sandbox.dom.append($container, this.$el);
            this.addViewClasses();
            this.data = data;
            this.renderTable();
            this.bindDomEvents();
            if (this.datagrid.options.resizeListeners === true) {
                this.onResize();
            }
            this.rendered = true;
        },

        /**
         * Destroys the view
         */
        destroy: function() {
            this.sandbox.dom.remove(this.$el);
            this.sandbox.stop('*');
        },

        /**
         * Adds a row to the datagrid
         * @param record {Object} the new record to add
         */
        addRecord: function (record) {
            this.removeEmptyIndicator();
            this.renderBodyRow(record, this.options.addRowTop);
        },

        /**
         * Removes a record from the view
         * @param recordId {Number|String}
         */
        removeRecord: function(recordId) {
            this.datagrid.removeRecord.call(this.datagrid, recordId);
            this.sandbox.dom.remove(this.table.rows[recordId].$el);
            delete this.table.rows[recordId];
            if (Object.keys(this.table.rows).length === 0) {
                this.toggleSelectAllItem(false);
                this.renderEmptyIndicator();
            }
        },

        /**
         * Handles the responsiveness
         */
        onResize: function() {
            var $container = this.sandbox.dom.find('.' + constants.containerClass, this.$el),
                isOverflown = this.sandbox.dom.get($container, 0).scrollWidth > this.sandbox.dom.width($container);
            if (isOverflown === true) {
                this.sandbox.dom.addClass(this.$el, constants.overflowClass);
            } else {
                this.sandbox.dom.removeClass(this.$el, constants.overflowClass);
            }
        },

        /**
         * Public methods used by the main datagrid class (end)
         * -------------------------------------------------------------------- */

        /**
         * Sets the components starting properties
         */
        setVariables: function() {
            this.rendered = false;
            this.$el = null;
            this.table = {};
            this.data = null;
            this.rowClicked = false;
            this.keyHandlerExecuted = false;
        },

        /**
         * Adds css classes to the view element
         */
        addViewClasses: function () {
            this.sandbox.dom.addClass(this.$el, this.options.cssClass);
            if (this.options.fullWidth === true) {
                this.sandbox.dom.addClass(this.$el, constants.fullWidthClass);
            }
            if (this.options.highlightSelected === true) {
                this.sandbox.dom.addClass(this.$el, constants.isSelectableClass);
            }
        },

        /**
         * Render methods (start)
         * -------------------------------------------------------------------- */

        /**
         * Renders the table
         */
        renderTable: function() {
            this.table.$el = this.sandbox.dom.createElement(templates.table);
            if (this.options.showHead === true) {
                this.renderHeader();
            }
            this.renderBody();
            this.sandbox.dom.append(this.sandbox.dom.find('.' + constants.containerClass, this.$el), this.table.$el);
        },

        /**
         * Renders the table header
         */
        renderHeader: function() {
            this.table.header = {};
            this.table.header.$el = this.sandbox.dom.createElement(templates.header);
            this.table.header.$row = this.sandbox.dom.createElement(templates.row);
            this.sandbox.dom.append(this.table.header.$el, this.table.header.$row);
            this.renderHeaderSelectItem();
            this.renderHeaderCells();
            this.renderHeaderRemoveItem();
            this.sandbox.dom.append(this.table.$el, this.table.header.$el);
        },

        /**
         * Renders the select-all checkbox of the header
         */
        renderHeaderSelectItem: function() {
            if (!!this.options.selectItem && !!this.options.selectItem.type) {
                var $cell = this.sandbox.dom.createElement(templates.headerCell);
                this.sandbox.dom.addClass($cell, constants.cellFitClass);
                if (this.options.selectItem.type === selectItems.CHECKBOX) {
                    this.sandbox.dom.html($cell, templates.checkbox);
                }
                this.sandbox.dom.prepend(this.table.header.$row, $cell);
            }
        },

        /**
         * Renderes the cells in the header
         */
        renderHeaderCells: function() {
            var $headerCell;
            this.table.header.cells = {};

            this.sandbox.util.foreach(this.datagrid.matchings, function(column) {
                $headerCell = this.sandbox.dom.createElement(templates.headerCell);
                this.sandbox.dom.html($headerCell, this.sandbox.translate(column.content));
                this.sandbox.dom.data($headerCell, 'attribute', column.attribute);
                this.table.header.cells[column.attribute] = {
                    $el: $headerCell,
                    sortable: column.sortable
                };
                this.sandbox.dom.append(this.table.header.$row, this.table.header.cells[column.attribute].$el);
                this.setHeaderCellClasses(column.attribute);
            }.bind(this));
        },

        /**
         * Sets css classes on a header cell
         * @param column {String} the column attribute of the column to set the classes for
         */
        setHeaderCellClasses: function(column) {
            if (this.datagrid.options.sortable === true) {
                var $element = this.table.header.cells[column].$el,
                    sortedClass;
                if (this.table.header.cells[column].sortable === true) {
                    this.sandbox.dom.addClass($element, constants.sortableClass);
                    if (column === this.datagrid.sort.attribute) {
                        sortedClass = (this.datagrid.sort.direction === 'asc') ? constants.ascSortedClass : constants.descSortedClass;
                        this.sandbox.dom.addClass($element, sortedClass);
                    }
                }
            }
        },

        /**
         * Renderes an empty remove-row cell into the header
         */
        renderHeaderRemoveItem: function () {
            if (this.options.removeRow === true) {
                var $cell = this.sandbox.dom.createElement(templates.headerCell);
                this.sandbox.dom.addClass($cell, constants.cellFitClass);
                this.sandbox.dom.append(this.table.header.$row, $cell);
            }
        },

        /**
         * Renders the table body
         */
        renderBody: function() {
            this.table.$body = this.sandbox.dom.createElement(templates.body);
            this.table.rows = {};
            if (this.data.embedded.length > 0) {
                this.sandbox.util.foreach(this.data.embedded, function(record) {
                    this.renderBodyRow(record);
                }.bind(this));
            } else {
                this.renderEmptyIndicator();
            }
            this.sandbox.dom.append(this.table.$el, this.table.$body);
        },

        /**
         * Renders the checkbox or radio button for a row in the tbody
         * @param id {Number|String} the id of the row to add the select-item for
         */
        renderRowSelectItem: function(id) {
            if (!!this.options.selectItem && !!this.options.selectItem.type && this.options.selectItem.inFirstCell === false) {
                var $cell = this.sandbox.dom.createElement(templates.cell);
                this.sandbox.dom.addClass($cell, constants.cellFitClass);
                if (this.options.selectItem.type === selectItems.CHECKBOX) {
                    this.sandbox.dom.html($cell, templates.checkbox);
                } else if (this.options.selectItem.type === selectItems.RADIO) {
                    this.sandbox.dom.html($cell, this.sandbox.util.template(templates.radio)({
                        name: 'datagrid-' + this.datagrid.options.instanceName
                    }));
                }
                this.sandbox.dom.prepend(this.table.rows[id].$el, $cell);
            }
        },

        /**
         * Renderes a single table row. If the row already exists it replaces the exiting one
         * @param record {Object} the record
         * @param prepend {Boolean} if true row gets prepended
         */
        renderBodyRow: function (record, prepend) {
            this.removeNewRecordRow();
            var $row = this.sandbox.dom.createElement(templates.row),
                insertMethod = (prepend === true) ? this.sandbox.dom.prepend : this.sandbox.dom.append,
                $oldElement = (!!this.table.rows[record.id]) ? this.table.rows[record.id].$el : null;
            record.id = (!!record.id) ? record.id : constants.newRecordId

            this.sandbox.dom.data($row, 'id', record.id);
            this.table.rows[record.id] = {
                $el: $row,
                cells: {}
            };

            this.renderRowSelectItem(record.id);
            this.renderBodyCellsForRow(record);
            this.renderRowRemoveItem(record.id);

            // if there already was a row with the same id, override it with the new one
            if (!!$oldElement && !!$oldElement.length) {
                this.sandbox.dom.after($oldElement, this.table.rows[record.id].$el);
                this.sandbox.dom.remove($oldElement);
            } else {
                insertMethod(this.table.$body, this.table.rows[record.id].$el);
            }

            this.executeRowPostRenderActions(record);
        },

        /**
         * Manipulates a row of a rendered after it has been rendered. For examples checks the checkbox or focuses an input
         * @param record {Object} the data of the record
         */
        executeRowPostRenderActions: function(record) {
            if (record.selected === true) {
                this.toggleSelectRecord(record.id, true);
            } else {
                this.toggleSelectAllItem(false);
            }
            // select first input if record is new and editable is true
            if (this.options.editable === true && record.id === constants.newRecordId) {
                this.showInput(record.id);
            }
        },

        /**
         * Renderes the all the content cells in a body row
         * @param record {Object} the data for the row
         */
        renderBodyCellsForRow: function(record) {
            // foreach matching grab the corresponding data and render the cell with it
            this.sandbox.util.foreach(this.datagrid.matchings, function(column) {
                if (this.options.excludeFields.indexOf(column.attribute) === -1) {
                    this.renderBodyCell(record, column);
                }
            }.bind(this));
        },

        /**
         * Renders the remove item for a row in the tbody
         * @param id {Number|String} the id of the row to add the select-item for
         */
        renderRowRemoveItem: function (id) {
            if (this.options.removeRow === true) {
                var $cell = this.sandbox.dom.createElement(templates.cell);
                this.sandbox.dom.html($cell, templates.removeCellContent);
                this.sandbox.dom.addClass($cell, constants.cellFitClass);
                this.sandbox.dom.append(this.table.rows[id].$el, $cell);
            }
        },

        /**
         * Renders a single cell
         * @param record {Object} the record to render the cell for
         * @param column {Object} the column which should be rendered
         */
        renderBodyCell: function(record, column) {
            var $cell = this.sandbox.dom.createElement(templates.cell),
                content = this.getCellContent(record, column);

            this.sandbox.dom.html($cell, content);
            this.sandbox.dom.data($cell, 'attribute', column.attribute);

            this.table.rows[record.id].cells[column.attribute] = {
                $el: $cell,
                originalData: record[column.attribute],
                editable: !!column.editable
            };
            // append cell to corresponding row
            this.sandbox.dom.append(
                this.table.rows[record.id].$el,
                this.table.rows[record.id].cells[column.attribute].$el
            );
        },

        /**
         * Gets the actual content for a cell
         * @param record {Object} the record to get the content for
         * @param column {Object} the column for which the content should be returned
         * @returns {String|Object} the dom object for the cell content or html
         */
        getCellContent: function(record, column) {
            var content = record[column.attribute];
            if (!!column.type && column.type === this.datagrid.types.THUMBNAILS) {
                content = this.datagrid.manipulateContent(content, column.type, this.options.thumbnailFormat);
                content = this.sandbox.util.template(templates.img)({
                   alt: content[constants.thumbAltKey],
                   src: content[constants.thumbSrcKey]
                });
            } else {
                content = this.datagrid.processContentFilter(
                    column.attribute,
                    content,
                    column.type,
                    Object.keys(this.table.rows).length
                );
            }
            if (this.options.editable === true && column.editable === true) {
                content = this.getEditableCellContent(content);
            }
            return content;
        },

        /**
         * Takes a string and retruns the markup for an editable cell
         * @param content {String} the original value
         * @returns {String|Object} html or a dom object
         */
        getEditableCellContent: function(content) {
            var returnHTML = this.sandbox.util.template(templates.editableCellContent)({
                value: content
            });
            return returnHTML;
        },

        /**
         * Renders the empty list element
         */
        renderEmptyIndicator: function() {
            this.sandbox.dom.append(this.$el, this.sandbox.util.template(templates.empty)({
                text: this.sandbox.translate(this.options.noItemsText)
            }));
        },

        /**
         * Removes the "new" record row
         */
        removeNewRecordRow: function() {
            if (!!this.table.rows[constants.newRecordId]) {
                this.sandbox.dom.remove(this.table.rows[constants.newRecordId].$el);
                delete !!this.table.rows[constants.newRecordId];
            }
        },

        /**
         * Render methods (end)
         * -------------------------------------------------------------------- */

        /**
         * Bindes dom related events
         */
        bindDomEvents: function () {
            // select or deselect items if the body recognizes a change event
            this.sandbox.dom.on(
                this.table.$body, 'click', this.selectItemChangeHandler.bind(this),
                '.' + constants.checkboxClass + ', .' + constants.radioClass
            );
            // handle click on body row
            this.sandbox.dom.on(this.table.$body, 'click', this.bodyRowClickHandler.bind(this), '.' + constants.rowClass);
            // remove row event
            if (this.options.removeRow === true) {
                this.sandbox.dom.on(this.table.$body, 'click', this.removeItemClickHandler.bind(this), '.' + constants.rowRemoverClass);
            }
            if (!!this.table.header) {
                // select all
                this.sandbox.dom.on(this.table.header.$el, 'change', this.allSelectItemChangeHandler.bind(this));

                // click on sortable item
                if (this.datagrid.options.sortable === true) {
                    this.sandbox.dom.on(
                        this.table.header.$el, 'click', this.sortItemClickHandler.bind(this),
                        '.' + constants.headerCellClass + '.' + constants.sortableClass
                    );
                }
            }
            // click on editable item
            if (this.options.editable === true) {
                this.sandbox.dom.on(this.table.$body, 'click', this.editableItemClickHandler.bind(this), '.' + constants.editableItemClass);
                this.sandbox.dom.on(this.table.$body, 'focusout', this.editableInputFocusoutHandler.bind(this), '.' + constants.editableInputClass);
                this.sandbox.dom.on(this.table.$body, 'keypress', this.editableInputKeyHandler.bind(this), '.' + constants.editableInputClass);
            }
        },

        /**
         * Handles the click on a sortable item
         * @param event {Object} the event object
         */
        sortItemClickHandler: function(event) {
            this.sandbox.dom.stopPropagation(event);
            var attribute = this.sandbox.dom.data(event.currentTarget, 'attribute'),
                direction = 'asc';
            if (this.datagrid.sort.attribute === attribute && this.datagrid.sort.direction === direction) {
                direction = 'desc';
            }
            this.startHeaderCellLoader(attribute);
            // delegate sorting to datagrid
            this.datagrid.sortGrid.call(this.datagrid, attribute, direction);
        },

        /**
         * Handles the click on an editable item
         * @param event {Object} the event object
         */
        editableItemClickHandler: function(event) {
            this.sandbox.dom.stopPropagation(event);
            var recordId = this.sandbox.dom.data(this.sandbox.dom.parents(event.currentTarget, '.' + constants.rowClass), 'id'),
                attribute = this.sandbox.dom.data(this.sandbox.dom.parents(event.currentTarget, 'td'), 'attribute');
            this.showInput(recordId, attribute);
        },

        /**
         * Shows a edit-input for a row and an attribute if no attribute passed shows the first input in row
         * @param recordId {Number|String}
         * @param attribute {String}
         */
        showInput: function(recordId, attribute) {
            var $cell, $inputs;
            if (!attribute) {
                $inputs = this.sandbox.dom.find('.' + constants.editableInputClass, this.table.rows[recordId].$el);
                attribute = this.sandbox.dom.data(this.sandbox.dom.parents($inputs[0], 'td'), 'attribute');
            }
            $cell = this.table.rows[recordId].cells[attribute].$el
            this.sandbox.dom.show(this.sandbox.dom.find('.' + constants.inputWrapperClass, $cell));
            this.sandbox.dom.select(this.sandbox.dom.find('.' + constants.editableInputClass, $cell));
        },

        /**
         * Handles keypress events of the editable inputs
         * @param event {Object} the event object
         */
        editableInputKeyHandler: function(event) {
            var recordId;
            // on enter
            if (event.keyCode === 13) {
                this.sandbox.dom.stopPropagation(event);
                recordId = this.sandbox.dom.data(this.sandbox.dom.parents(event.currentTarget, '.' + constants.rowClass), 'id');
                this.keyHandlerExecuted = true;
                this.editRow(recordId);
            }
        },

        /**
         * Handles the focusout of an editable input
         * @param event {Object} the event object
         */
        editableInputFocusoutHandler: function (event) {
            if (this.keyHandlerExecuted === false) {
                this.sandbox.dom.stopPropagation(event);
                var recordId = this.sandbox.dom.data(this.sandbox.dom.parents(event.currentTarget, '.' + constants.rowClass), 'id');
                this.editRow(recordId);
            }
        },

        /**
         * Gets the data of all edit-inputs in a row and saves their values
         * @param recordId {String|Number} the id of the row to edit
         */
        editRow: function(recordId) {
            var modifiedRecord = {};
            // build new record object out of the inputs in the row
            this.sandbox.util.each(this.table.rows[recordId].cells, function (attribute, cell) {
                if (!!this.sandbox.dom.find('.' + constants.editableInputClass, cell.$el).length) {
                    modifiedRecord[attribute] = this.sandbox.dom.val(
                        this.sandbox.dom.find('.' + constants.editableInputClass, cell.$el)
                    );
                }
            }.bind(this));
            this.saveRow(recordId, modifiedRecord, this.editedSuccessCallback.bind(this), this.editedErrorCallback.bind(this, recordId));
        },

        /**
         * Clears everything up after a row was edited. (hides the input and updates the values)
         * @param record {Object} the changed data record
         */
        editedSuccessCallback: function (record) {
            var $row;
            if (!!record.id && !!this.table.rows[record.id]) {
                $row = this.table.rows[record.id].$el
            } else if (!!this.table.rows[constants.newRecordId]) {
                $row = this.table.rows[constants.newRecordId].$el
            }
            if (!!$row && !!$row.length) {
                this.sandbox.dom.hide(this.sandbox.dom.find('.' + constants.inputWrapperClass, $row));
                this.renderBodyRow(record, this.options.addRowTop);
            }
        },

        /**
         * Adds a css class to all inputs in a row, if the editing request returned with an error
         * @param recordId
         */
        editedErrorCallback: function (recordId) {
            var $row = this.table.rows[recordId].$el;
            this.sandbox.dom.addClass(
                this.sandbox.dom.find('.' + constants.inputWrapperClass, $row),
                constants.editedErrorClass
            );
        },

        /**
         * Replaces a record with an existing one and sends it to a server
         * @param recordId {Number|String} the id of the record to override
         * @param newRecordData {Object} the new record data
         * @param successCallback {Function} gets executed after success
         * @param errorCallback {Function} gets executed after error
         */
        saveRow: function (recordId, newRecordData, successCallback, errorCallback) {
            var hasChanged = false,
                record;
            this.sandbox.util.each(this.table.rows[recordId].cells, function (attribute, cell) {
                if (cell.editable === true && cell.originalData !== newRecordData[attribute]) {
                    hasChanged = true;
                }
            }.bind(this));
            // merge record data
            record = this.sandbox.util.extend(
                true, {}, this.data.embedded[this.datagrid.getRecordIndexById(recordId)], newRecordData
            );
            if (recordId === constants.newRecordId) {
                delete record.id;
            }
            if (hasChanged === true) {
                // pass data to datagrid to save it
                this.datagrid.saveGrid.call(this.datagrid,
                    record, this.datagrid.getUrlWithoutParams.call(this.datagrid),
                    successCallback, errorCallback, this.options.addRowTop);
            } else {
                typeof successCallback === 'function' && successCallback(record);
            }
        },

        /**
         * Starts a loader in a cell in the header
         * @param column {String} the attribute of the header cell to insert the loader in
         */
        startHeaderCellLoader: function(column) {
            var $container = this.sandbox.dom.createElement(templates.headerCellLoader);
            this.sandbox.dom.addClass(this.table.header.cells[column].$el, constants.headerLoadingClass);
            this.sandbox.dom.append(this.table.header.cells[column].$el, $container);
            this.sandbox.start([
                {
                    name: 'loader@husky',
                    options: {
                        el: $container,
                        size: '10px',
                        color: '#999999'
                    }
                }
            ]);
        },

        /**
         * Handles the click on a body row
         * @param event {Object} the event object
         */
        bodyRowClickHandler: function (event) {
            this.sandbox.dom.stopPropagation(event);
            var recordId = this.sandbox.dom.data(event.currentTarget, 'id');
            this.emitRowClickedEvent(event);
            if (this.options.highlightSelected === true) {
                this.uniqueHighlightRecord(recordId);
            }
        },

        /**
         * Emits the row clicked event
         * @param event {Object} the original click event
         */
        emitRowClickedEvent: function (event) {
            if (this.rowClicked === false) {
                this.rowClicked = true;
                var recordId = this.sandbox.dom.data(event.currentTarget, 'id'),
                    parameter = recordId || event;
                this.datagrid.emitItemClickedEvent.call(this.datagrid, parameter);
                // delay to prevent multiple emits on double click
                this.sandbox.util.delay(function () {
                    this.rowClicked = false;
                }.bind(this), 500);
            }
        },

        /**
         * Handles the click on the remove item
         * @param event {Object} the event object
         */
        removeItemClickHandler: function(event) {
            this.sandbox.dom.stopPropagation(event);
            var recordId = this.sandbox.dom.data(this.sandbox.dom.parents(event.currentTarget, '.' + constants.rowClass), 'id');
            this.removeRecord(recordId);
        },

        /**
         * Handles the change event of the select items
         * @param event {Object} the event object
         */
        selectItemChangeHandler: function (event) {
            this.sandbox.dom.stopPropagation(event);
            var recordId = this.sandbox.dom.data(this.sandbox.dom.parents(event.target, '.' + constants.rowClass), 'id'),
                isChecked = this.sandbox.dom.is(event.target, ':checked');
            if (this.options.selectItem.type === selectItems.CHECKBOX) {
                this.toggleSelectRecord(recordId, isChecked);
            } else if (this.options.selectItem.type === selectItems.RADIO) {
                this.uniqueSelectRecord(recordId);
            }
        },

        /**
         * Handles the change event of a select item in the header
         * @param event {Object} the event object
         */
        allSelectItemChangeHandler: function (event) {
            this.sandbox.dom.stopPropagation(event);
            var isChecked = this.sandbox.dom.is(event.target, ':checked');
            if (isChecked === true) {
                this.selectAllRecords();
            } else {
                this.deselectAllRecords();
            }
        },

        /**
         * Highlights a record an unhighlights all other rows
         * @param id {Number|String} the id of the record to highlight
         */
        uniqueHighlightRecord: function (id) {
            this.sandbox.dom.removeClass(
                this.sandbox.dom.find('.' + constants.rowClass + '.' + constants.selectedRowClass, this.table.$body),
                constants.selectedRowClass
            );
            this.sandbox.dom.addClass(this.table.rows[id].$el, constants.selectedRowClass);
        },

        /**
         * Selejcts all records
         */
        selectAllRecords: function () {
            this.datagrid.selectAllItems.call(this.datagrid);
            this.sandbox.dom.prop(this.sandbox.dom.find('.' + constants.checkboxClass, this.table.$body), 'checked', true);
        },

        /**
         * Deselects all records
         */
        deselectAllRecords: function () {
            this.datagrid.deselectAllItems.call(this.datagrid);
            this.sandbox.dom.prop(this.sandbox.dom.find('.' + constants.checkboxClass, this.table.$body), 'checked', false);
        },

        /**
         * Selects or deselects a record with a given id
         * @param id {Number|String} the id of the record to select or deselect
         * @param select {Boolean} true to select false to deselect
         */
        toggleSelectRecord: function (id, select) {
            var areAllSelected;
            if (select === true) {
                this.datagrid.setItemSelected.call(this.datagrid, id);
                // ensure that checkboxes are checked
                this.sandbox.dom.prop(
                    this.sandbox.dom.find('.' + constants.checkboxClass, this.table.rows[id].$el), 'checked', true
                );
            } else {
                this.datagrid.setItemUnselected.call(this.datagrid, id);
                // ensure that checkboxes are unchecked
                this.sandbox.dom.prop(
                    this.sandbox.dom.find('.' + constants.checkboxClass, this.table.rows[id].$el), 'checked', false
                );
            }
            // check or uncheck checkboxes in the header
            if (!!this.table.header) {
                areAllSelected = this.datagrid.getSelectedItemIds.call(this.datagrid).length === this.data.embedded.length;
                this.toggleSelectAllItem(areAllSelected);
            }
        },

        /**
         * Selects or deselects the select all item
         * @param select {Boolean} true to select false to deselect the select all item
         */
        toggleSelectAllItem: function (select) {
            if (!!this.table.header) {
                this.sandbox.dom.prop(
                    this.sandbox.dom.find('.' + constants.checkboxClass, this.table.header.$el), 'checked', select
                );
            }
        },

        /**
         * Selects a record and deselects all other records
         * @param id {Number|String} the id of the record to select
         */
        uniqueSelectRecord: function (id) {
            this.datagrid.deselectAllItems.call(this.datagrid);
            this.datagrid.setItemSelected.call(this.datagrid, id);
        },

        /**
         * Removes the empty list element
         */
        removeEmptyIndicator: function() {
            this.sandbox.dom.remove(this.sandbox.dom.find('.' + constants.emptyListElementClass, this.$el));
        }
     };
});
