/*!require: jquery.fn.dropTo */
/*
JQueryPlugin: jQuery.fn.texttip

Display a tip on the input box, when tip is clicked, input gets the focus.
when input gets the focus, tip will be disappeared.

Usage:
// init texttip
$('.target').texttip('hoveringElementClass');
$('.target').texttip({
    className: 'hoveringElementClass',
    chainUpdate: false,
    autoPosition: false
});
// clearing hovered tips on the page
$('.target').texttipClear();

Options:
className - class name for the hovering element.
chainUpdate - true or false, true to update all hover state when one textbox value was updated. (fix browser autocomplete)
autoPosition - repositioning hover element when window resized.
hideOnFocus - hide the watermark when input gets focus


JQuery plugin: texttipClear

Clear the tip on specified elements.

*/
(function ($, etui) {
    var defaultOptions = {
        className: null,
        chainUpdate: true,
        autoPosition: true,
        hideOnFocus: true
    };

    var dataKey = 'texttipdata', propVisitor = $.fn.prop? 'prop': 'attr';

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

        var tagName = el[propVisitor]('tagName').toLowerCase();
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
            tip: tip,
            virgin: true
        };

        elQueue.push(data);

        el.data(dataKey, data);
        hover.data(dataKey, data);

        hookEvents(el, hover);
    }

    function cloneCss(hover, el){
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
                lineHeight: el.css('lineHeight'),
                cursor: 'text'
            })
            .dropTo(el).atCenter().atMiddle();
    }

    function findDataTarget(dom, data){
        var el = $(dom);
        var i = elQueue.length;
        while(i--){
            var cursor = elQueue[i];
            if (cursor.input.get(0) == el.get(0)){
                if (data!=null){
                    data.value = cursor;
                }
                return i;
            }
        }
        return -1;
    }

    function clearHover(i, dom){
        var data = {};
        i = findDataTarget(dom, data);
        if (i < 0){
            return;
        }
        data.value.input.attr('title', data.value.tip).blur();
        data.value.hover.remove();
        elQueue.splice(i, 1);
    }

    function hideHover(i, dom){
        var data = {};
        i = findDataTarget(dom, data);
        if (i < 0){
            return;
        }
        data.value.hover.hide();
    }

    function hookEvents(el, hover) {
        var ieInputEventFixDkey = 'prevText';

        // autocomplete sucks, even we hooked to below events,
        // we still cannot detect value changed by autocomplete feature in all case
        // considering disable it by using autocomplete=off or kick of loop checking textbox value.
        el
            .blur(handleBlur)
            .focus(handleFocus)
            .change(handleChange)
            .bind('input', handleChange)
            .bind('propertychange',(function(callback){
                return function(){
                    var el = $(this);
                    var pt = el.data(ieInputEventFixDkey);
                    el.data(ieInputEventFixDkey, el.val());
                    if (pt !== el.val()){
                        callback.apply(this, arguments);
                    }
                };
            })(handleChange))
            .data(ieInputEventFixDkey, el.val());

        // comment out as jquery will do this for us and this bind may cause incompatibility issue in ie 6
        // .bind('propertychange', handleChange);

        hover.click(handleClick);
    }

    // repositioning hover elemnets when windows resized.
    function handleResize(){

        var i = elQueue.length;
        while(i--){
            var cursor = elQueue[i];
            if (cursor.autoPosition){
                cloneCss(cursor.hover, cursor.input);
            }
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
        var data = $(this).data(dataKey);

        if (data.settings.hideOnFocus){
            data.hover.hide();
        }
    }

    function handleChange(){
        var data = $(this).data(dataKey);

        // if someone touched her.. then we are not going to display
        // the texttip when there is no char in it.
        if (data.input.val() !== false){
            data.virgin = false;
        }

        data.hover.hide();

        // clear hover when autocomplete
        if (data.settings.chainUpdate){
            var i = elQueue.length;
            while(i--){
                if (elQueue[i].input != data.input){
                    handleBlur.call(elQueue[i].input);
                }
            }
        }
    }

    function handleClick(evt) {
        evt.stopPropagation();
        var $el = $(this),
            data = $el.data(dataKey),
            input = data.input;
        
        if (data.settings.hideOnFocus){
            $el.hide();
        }

        input.focus();
        input.click();
    }

    var exports = {
        texttip: function (method, options) {
            if (Object.prototype.toString.call(method) == '[object String]'){
                method = method.toLowerCase();
                switch(method){
                    case 'clear':
                        return this.each(clearHover);
                        break;
                    case 'hide':
                        return this.each(hideHover);
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
    };

    $.fn.extend(exports);

    // add etui compatible plugin
    // if etui is loaded
    if (etui && etui.$ && !(etui.$.fn.texttip)){
        etui.$.fn.extend(exports);
    }

})(window.jQuery, window.etui);
