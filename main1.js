//预先加载图像
jQuery.fn.loadthumb = function(options) {
 options = $.extend({
   src : ""
 },options);
 var _self = this;
 _self.hide();
 var img = new Image();
 $(img).load(function(){
  _self.attr("src", options.src);
  _self.fadeIn("slow");
 }).attr("src", options.src); 
 return _self;
}
$(document).ready(function(){
  var index = 0;
 showImg(index);
});

function showImg(index){
 $(".cells").find("img").each(function() {
  $(this).loadthumb({src:$(this).attr("src") });        
    });;
}
