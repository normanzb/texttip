/*!require: jquery.fn.dropTo */
/*
JQueryPlugin: jQuery.fn.texttip

Display a tip on the input box, when tip is clicked, input gets the focus.
when input gets the focus, tip will be disappeared.

Usage:
// init texttip
$('.target').texttip('hoveringElementClass');
// clearing hovered tips on the page
$('.target').texttipClear();

Options:
className - class name for the hovering element.
chainUpdate - true or false, true to update all hover state when one textbox value was updated. (fix browser autocomplete)

JQuery plugin: texttipClear

Clear the tip on specified elements.

*/
(function ($) {
    var defaultOptions = {
        className: null,
        chainUpdate: true
    };

    var dataKey = 'texttipdata';

    var settingsHolder = {};

    // storing all 'data' object, data object contains all element-hover pairs and theirs settings
    var elQueue = [];

    // sigh, another ie bug here, somehow jquery.fn.offset gets wrong location when it was fired in window.resize, let delay it a little bit for ie < 8
    if ($.browser.msie && $.browser.version < 8)
        $(window).resize(function(){
            var args = arguments;
            var self = this;
            setTimeout(function(){
                handleResize.apply(self, args);
            }, 100);
        });
    else
        $(window).resize(handleResize);

    // initialize inputs
    function init(i, dom) {
        var el = $(dom);
        var tip = el.attr('title');

        var settings = {};
        $.extend(settings, settingsHolder);

        var tagName = el.attr('tagName').toLowerCase();
        // if it is not a input or input without title attr, bypass it.
        if ((tagName != 'input' &&
            tagName != 'textarea') ||
            tip == null ||
            tip == '' ||
            !el.is(':visible')) return;

        // get rid of title and disable autofill
        el.attr('title', '').attr('autocomplete','off');

        // create a hover element, and cover the input
        var hover = $('<div />')
            .html(tip)
            .addClass(settings.className)
            .appendTo(el.parent());

        cloneCss(hover, el);

        // if there are value in it, hide hover
        if (el.val() != ""){
            hover.hide();
        }

        var data = {
            settings: settings,
            input: el,
            hover: hover,
            tip: tip
        };

        elQueue.push(data);

        el.data(dataKey, data);
        hover.data(dataKey, data);

        hookEvents(el, hover);
    }

    function cloneCss(hover, el){
        // coodinates relative to doc
        var offset = el.offset();
        var size = {
            width: el.width(),
            height: el.height()
        };

        var z = el.css('zIndex');
        z = z == 'auto' ? 0 : z;

        hover.css({
                position: 'absolute',
                zIndex: z + 1, // a little bit higher than current element.
                overflow: 'hidden',
                width: size.width,
                height: size.height,
                paddingTop: el.css('paddingTop'),
                paddingLeft: el.css('paddingLeft'),
                paddingRight: el.css('paddingRight'),
                paddingBottom: el.css('paddingBottom'),
                marginTop: el.css('marginTop'),
                marginLeft: el.css('marginLeft'),
                marginRight: el.css('marginRight'),
                marginBottom: el.css('marginBottom'),
                cursor: 'text'
            })
            .dropTo(el).atCenter().atMiddle();
    }

    function clearHover(i, dom){
        var el = $(dom);
        var i = elQueue.length;
        while(i--){
            var cursor = elQueue[i];
            if (cursor.input.get(0) == el.get(0)){
                cursor.input.attr('title', cursor.tip).blur();
                cursor.hover.remove();
                elQueue.splice(i, 1);
            }
        }
    }

    function hookEvents(el, hover) {
        // autocomplete sucks, even we hooked to below events,
        // we still cannot detect value changed by autocomplete feature in all case
        // considering disable it by using autocomplete=off or kick of loop checking textbox value.
        el.blur(handleBlur).focus(handleFocus).change(handleChange).bind('input', handleChange);

        // comment out as jquery will do this for us and this bind may cause incompatibility issue in ie 6
        // .bind('propertychange', handleChange);

        hover.click(handleClick);
    }

    // repositioning hover elemnets when windows resized.
    function handleResize(){

        var i = elQueue.length;
        while(i--){
            var cursor = elQueue[i];
            cloneCss(cursor.hover, cursor.input);
        }
    }

    // handle when text blur, try to decide if hover need to be displayed.
    function handleBlur() {
        var self = $(this);
        var data = self.data(dataKey);
        var v = self.val();

        // do we need to check v == data.tip ?
        if (v == null ||
            v == '') {
            data.hover.show();
        }
        else{
            data.hover.hide();
        }
    }

    function handleFocus() {
        $(this).data(dataKey)
            .hover.hide();
    }

    function handleChange(){
        var data = $(this).data(dataKey);
        data.hover.hide();

        // clear hover when autocomplete
        if (data.settings.chainUpdate){
            var i = elQueue.length;
            while(i--){
                handleBlur.call(elQueue[i].input);
            }
        }
    }

    function handleClick(evt) {
        evt.stopPropagation();
        var input = $(this).hide()
            .data(dataKey)
            .input;
        input.focus();
        input.click();
    }

    $.fn.extend({
        texttip: function (method, options) {
            if (Object.prototype.toString.call(method) == '[object String]'){
                method = method.toLowerCase();
                switch(method){
                    case 'clear':
                        return this.each(init);
                        break;
                    default:
                        if (options == null){
                            options = {};
                        }
                        options.className = method;
                        break;
                }
            }
            else{
                options = method;
            }
            $.extend(settingsHolder, defaultOptions, options);
            return this.each(init);
        },
        texttipClear: function(){
            return this.each(clearHover);
        }
    });
})(jQuery);
