(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as anonymous module.
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    // Node / CommonJS
    factory(require('jquery'));
  } else {
    // Browser globals.
    factory(jQuery);
  }
})(function ($) {
  'use strict';

  var $window = $(window);
  var $document = $(document);
  var NAMESPACE = 'completer';
  var EVENT_RESIZE = 'resize';
  var EVENT_MOUSE_DOWN = 'mousedown';

  function Completer(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, Completer.DEFAULTS, $.isPlainObject(options) && options);
    this.init();
  }

  function espace(s) {
    return s.replace(/([\.\$\^\{\[\(\|\)\*\+\?\\])/g, '\\$1');
  }

  function toRegexp (s) {
    if (typeof s === 'string' && s !== '') {
      s = espace(s);

      return new RegExp(s + '+[^' + s + ']*$', 'i');
    }

    return null;
  }

  function toArray(s) {
    if (typeof s === 'string') {
      // 识别[]内的任意字符
      /**
       * replace 是将字串中的{、}、[、]、"、'替换成空，即去掉字串中的这些符号
       * split 是将字串转成数组
       **/
      s = s.replace(/[\{\}\[\]"']+/g, '').split(/\s*,+\s*/);
    }

    // $.map遍历数组，对每个元素做相应的处理
    s = $.map(s, function (n) {
      return typeof n !== 'string' ? n.toString() : n;
    });

    return s;
  }

  Completer.prototype = {
    constructor: Completer,

    init: function () {
      var options = this.options;

      this.data = options.source ? toArray(options.source) : [];  
      
      this.regexp = toRegexp(options.separator);
      // 自动补全html代码容器
      this.$completer = $(options.template);
      this.$completer.hide().appendTo(options.parent);
      this.style(); // 设置插件位置以及样式

      // 绑定事件
      this.$element.attr('autocomplete', 'off').on({
        focus: $.proxy(this.enable, this),
        blur: $.proxy(this.disable, this)
      });

      //在初始化时，input如果focus则弹出自动补全列表
      if (this.$element.is(':focus')) { 
        this.enable();
      }
    },

    enable: function () {
      if (!this.active) {
        this.active = true;
        this.$element.on({
          // 强制将this.keydown这个函数的scope 指定为this，即Completer
          keydown: $.proxy(this.keydown, this), 
          keyup: $.proxy(this.keyup, this)
        });
        this.$completer.on({
          mousedown: $.proxy(this.mousedown, this),
          mouseover: $.proxy(this.mouseover, this)
        });
      }
    },

    disable: function () {
      if (this.active) {
        this.active = false;
        this.$element.off({
          keydown: this.keydown,
          keyup: this.keyup
        });
        this.$completer.off({
          mousedown: this.mousedown,
          mouseover: this.mouseover
        });
      }
    },
    
    attach: function (val) {
      var options = this.options;
      var separator = options.separator;
      var regexp = this.regexp;
      var part = regexp ? val.match(regexp) : null;
      var matched = [];
      var all = [];
      var that = this;
      var reg;
      var item;

      if (part) {
        part = part[0];
        val = val.replace(regexp, '');
        reg = new RegExp('^' +  espace(part), 'i');
      }

      $.each(this.data, function (i, n) {
        n = separator + n;
        item = that.template(val + n);

        if (reg && reg.test(n)) {
          matched.push(item);
        } else {
          all.push(item);
        }
      });

      matched = matched.length ? matched.sort() : all;

      if (options.position === 'top') {
        matched = matched.reverse();
      }

      this.fill(matched.join(''));
    },

    /**
     * @param val input当前的值
     **/
    suggest: function (val) {
      var reg = new RegExp(espace(val), 'i');
      var that = this;
      var matched = [];
      this.valKey = that.options.ajax ? that.options.ajax.key : null;

      that.options.ajax 
      ? (function(sender){

        $.ajax({
          type: sender.method || 'get',
          url: sender.url,
          data: sender.data || {key: val},
          cache: false,
          dataType: 'json',
          async: false,
          success: function(res){
            matched = sender.filter ? sender.filter(res) : res;
          },
          error: function(){
            console.log('Error: CONNECT ERROR!');
          }
        });
      })(that.options.ajax) 
      : $.each(this.data, function (i, n) {
        if (reg.test(n)) {
          matched.push(n);
        }
      });

      matched.sort(function (a, b) {

        return that.options.ajax 
               ? a[that.valKey].indexOf(val) - b[that.valKey].indexOf(val) 
               : a.indexOf(val) - b.indexOf(val);
      });

      $.each(matched, function (i, n) {
        matched[i] = that.template(n);
      });
      this.fill(matched.join(''));
    },

    template: function (sender) {
      var that = this;
      var options = this.options;
      var tag = options.itemTag;
      var attrs = "";
      options.setAttr && $.each(options.setAttr, function(i, v){
        attrs += ' data-'+v+'="'+sender[v]+'"';
      });

      var val = sender instanceof Object ? sender[that.valKey] : sender; 

      return ('<'+tag+attrs+' title="'+val+'">'+val+'</'+tag+'>');
    },

    fill: function (html) {
      var filter;

      this.$completer.empty();  //移除completer的html代码

      if (html) {
        filter = this.options.position === 'top' ? ':last' : ':first';
        this.$completer.html(html);
        this.$completer.children(filter).addClass(this.options.selectedClass);
        this.show();
      } else {
        this.hide();
      }
    },
  
    complete: function () {
      var options = this.options;
      var val = options.filter(this.$element.val()).toString();

      if (val === '') {
        this.hide();
        return;
      }

      if (options.suggest) {
        this.suggest(val);
      } else {
        this.attach(val);
      }
    },

    keydown: function (e) {
      var keyCode = e.keyCode || e.which || e.charCode;

      if (keyCode === 13) {
        e.stopPropagation();
        e.preventDefault();
      }
    },

    keyup: function (e) {
      var keyCode = e.keyCode || e.which || e.charCode;
          // enter          //up arrow        // down arrow
      if (keyCode === 13 || keyCode === 38 || keyCode === 40) {
        this.toggle(keyCode);
      } else {
        this.complete();
      }
    },

    mouseover: function (e) {
      var options = this.options;
      var selectedClass = options.selectedClass,
          $target = $(e.target);

      if ($target.is(options.itemTag)) {
        $target.addClass(selectedClass).siblings().removeClass(selectedClass);
      }
    },

    mousedown: function (e) {
      e.stopPropagation();
      e.preventDefault();
      this.setValue($(e.target).text());
    },

    setValue: function (val) {
      this.$element.val(val);
      this.options.complete();
      this.hide();
      // extend by issac
      this.options.search && this.options.search.call(this);
    },

    // 移动选中元素
    toggle: function (keyCode) {
      var selectedClass = this.options.selectedClass;
      var $selected = this.$completer.find('.' + selectedClass);

      switch (keyCode) {

        // Down
        case 40:
          $selected.removeClass(selectedClass);
          $selected = $selected.next();
          break;

        // Up
        case 38:
          $selected.removeClass(selectedClass);
          $selected = $selected.prev();
          break;

        // Enter
        case 13:
          this.setValue($selected.text());
          break;

        // No default
      }

      if ($selected.length === 0) {
        $selected = this.$completer.children(keyCode === 40 ? ':first' : ':last');
      }

      $selected.addClass(selectedClass);
    },

    // extend by issac
    style: function () {
      var $element = this.$element;
      var height = $element.outerHeight();
      // var width = $element.outerWidth();
      console.log(this.options.style);

      var styles = this.options.style ? this.options.style : {
        right: 0, top: height
      };
      // styles.minWidth = width;
      styles.top = height + 5;
      // styles.zIndex = this.options.zIndex;

      this.$completer.css(styles);
    },

    show: function () {
      this.$completer.show();
      $window.on(EVENT_RESIZE, $.proxy(this.place, this));
      $document.on(EVENT_MOUSE_DOWN, $.proxy(this.hide, this));
    },

    hide: function () {
      this.$completer.hide();
      $window.off(EVENT_RESIZE, this.place);
      $document.off(EVENT_MOUSE_DOWN, this.hide);
    },

    destroy: function () {
      var $this = this.$element;

      this.hide();
      this.disable();

      $this.off({
        focus: this.enable,
        blur: this.disable
      });

      $this.removeData(NAMESPACE);
    }
  };

  Completer.DEFAULTS = {
    parent: 'body',
    itemTag: 'li',
    position: 'bottom', // or 'right'
    style: {
      zIndex: 1
    },
    source: [],
    selectedClass: 'completer-selected',
    separator: '',
    suggest: false,
    template: '<ul class="completer-container"></ul>',
    complete: $.noop,
    filter: function (val) {
      return val;
    },
  };

  Completer.setDefaults = function (options) {
    $.extend(Completer.DEFAULTS, options);
  };

  // Save the other completer
  Completer.other = $.fn.completer;

  // Register as jQuery plugin
  $.fn.completer = function (option) {
    var args = [].slice.call(arguments, 1);
    var result;

    this.each(function () {
      var $this = $(this);
      var data = $this.data(NAMESPACE);
      var options;
      var fn;

      if (!data) {
        if (/destroy/.test(option)) {
          return;
        }

        options = $.extend({}, $this.data(), $.isPlainObject(option) && option);
        $this.data(NAMESPACE, (data = new Completer(this, options)));
      }

      if (typeof option === 'string' && $.isFunction(fn = data[option])) {
        result = fn.apply(data, args);
      }
    });

    return typeof result !== 'undefined' ? result : this;
  };

  $.fn.completer.Constructor = Completer;
  $.fn.completer.setDefaults = Completer.setDefaults;

  // No conflict
  $.fn.completer.noConflict = function () {
    $.fn.completer = Completer.other;
    return this;
  };

  $(function () {
    $('[data-toggle="completer"]').completer();
  });
});