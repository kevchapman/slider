function Slider(ele,opts){
	if(!ele.length){return}
	var defaults = {
		next: 'a.next',
		prev: 'a.prev',
		paging: 'div.slider_paging',
		scroll: 'div.slider_scroll',
		mask: 'div.slider_mask',
		items:'div.slider_item',
		touch:true,
		speed: 200,
		offset:0,
		autoInit:true,
		row:1,
		extend_layout:false,
		callback:false,
		css3:true,
		resizeItems:true,
		startItem:0,
		threshold:0.4,
		jsonFeed:false, // set path to json feed, used for ajax call
		jsonData:false,
		views:{
			item:function(json){
				return '<div class="slider_item">'+json.Content+'</div>';
			}
		}
	}
	var o = $.extend({},defaults,opts);
	this.opts = o;
	this.index = 0;
	this.ele = ele;
	this.mask = this.ele.find(o.mask);
	this.scroller = this.ele.find(o.scroll);
	this.items = this.scroller.find(o.items);
	this.btn_next = this.ele.find(o.next);
	this.btn_prev = this.ele.find(o.prev);
	this.pagingNav = this.ele.find(o.paging);
	this.x = 0;
	this.y = 0;
	this.css3 = o.touch && o.css3 && 'webkitTransform' in this.ele[0].style;
	
	if(o.autoInit){ this.init(); }
	return this;
}
Slider.prototype = {
	init:function(){
		var t = this;
		// bind btns
		this.btn_next.click(function(){
			t.stop();
			t.next();
			return false;
		});
		this.btn_prev.click(function(){
			t.stop();
			t.prev();
			return false;
		});
		// set auto timer 
		if(this.opts.auto){
			this.start();
			// bind mouseOver events
			this.ele.on({
				mouseenter:function(){
					t.pause();
				},
				mouseleave:function(){
					t.start();
				}
			});
		}
		this.layout();
		if(this.pagingNav){ this.initPaging(); }
		// set disabled classes on btns and paging
		this.setBtnStatus();
		this.goTo(this.opts.startItem);
		if(this.opts.jsonData){
			this.updateView(this.opts.jsonData);
		}
		if(this.opts.touch){
			this.bindTouch();
		}
		return this;
	},
	layout:function(){
		var t = this, mw = t.mask.width(), margin = (t.opts.row-1)*(t.opts.offset*2);
		var w = t.opts.row > 1 ? (mw - margin) / t.opts.row : mw;
		this.maskW = mw;
		this.items = this.scroller.find(this.opts.items);
		this.items.css({float:'left',marginLeft:t.opts.offset,marginRight:t.opts.offset});
		if(this.opts.resizeItems){ this.items.width(w); }
		this.totalW = (function(t){
			var w = 0;
			t.items.each(function(){
				w = w+$(this).outerWidth(true);
			});
			return w;
		})(this);
		this.itemW = t.items.outerWidth(true) * t.opts.row;
		this.total = t.items.length / t.opts.row;
		this.scroller
			.width(t.total * t.itemW )
			.css({marginLeft:-t.offset});	
		this.parent && !t.pagingNav ? t.parent.setHeight() : '';
		if(this.opts.extend_layout){ this.opts.extend_layout(); };
	},
	getIndex:function(){
		if( this.index <=0 ){ this.index = 0 }
		else if(this.index > this.total - 1 ) { this.opts.auto ? this.index = 0 : this.index = this.total-1 }
		return this.index;
	},
	bindTouch:function(){
		var t = this;
		if(this.total <= 1){return}
		this.scroller[0].ontouchstart = function(e){
			t.opts.auto ? t.stop() : '';
			if (e.targetTouches.length != 1 || event.touches.length !=1) {return false;}
			t.scroller[0].style.webkitTransition = '';
			t.startX = e.targetTouches[0].clientX;
			t.cTouch = t.startX;
			t.startY = e.targetTouches[0].clientY;
			t.getPosition(t.scroller[0].style.webkitTransform);
		}
		this.scroller[0].ontouchmove = function(e){
			if (e.targetTouches.length != 1) { return false; }
			if (e.targetTouches.length != 1  || event.touches.length !=1) { return false; }
			var leftDelta = e.targetTouches[0].clientX - t.startX;
			var topDelta = e.targetTouches[0].clientY - t.startY;
			Math.abs(leftDelta) > 5 ? e.preventDefault() : '';
			t.move(leftDelta,0);
			t.cTouch = e.targetTouches[0].clientX;
		}
		this.scroller[0].ontouchend = function(e){
			var difX = t.startX - t.cTouch, limit = t.mask.width()*t.opts.threshold;
			e.preventDefault();
			if (e.targetTouches.length > 0 || e.touches.length > 0) { return false; }
			if(difX > limit){ t.next();}
			else if( difX < -limit ){ t.prev();}
			else {t.goTo(t.getIndex());}
		}
	},
	next:function(){
		this.index++;
		this.goTo(this.getIndex());
	},
	prev:function(){
		this.index--;
		this.goTo(this.getIndex());
	},
	start:function(){
		if(this.opts.auto){
			var t = this;
			this.timer = setInterval(function(){ t.next(); }, this.opts.auto);
		}
	},
	stop:function(){
		if(this.opts.auto) {
			clearInterval(this.timer);
			this.opts.auto = false;
		};
	},
	pause:function(){
		if(this.opts.auto) {
			clearInterval(this.timer)
		};
	},
	aMove:function(n,x){
		var
			t = this,
			move = (x || x === 0 ? x : this.itemW * n) + t.opts.offset;
			max = (move+this.maskW);
		if( max > this.totalW){
			move = this.totalW - this.mask.width();
		}
		if(this.css3){
			this.scroller[0].style.webkitTransition = '-webkit-transform '+this.opts.speed+'ms ease';
			this.scroller[0].style.webkitTransform = 'translate3d(-'+move+'px,0,0)';
			this.scroller.one('webkitTransitionEnd',function(){
				t.getPosition(this.style.webkitTransform);
				this.style.webkitTransition = '';
				transitionEnd();
			});
			return;
		}
		this.scroller.animate({left:-move},this.opts.speed,function(){
			transitionEnd();
		});

		function transitionEnd(){
			t.index = n;
			if(t.opts.callback){ t.opts.callback(t);}
			t.setActive();
		}
	},
	move:function(x,y){
		var newX = parseInt(this.x+x);
		this.scroller[0].style.webkitTransform = 'translate3d('+newX+'px,0,0)';
	},
	goTo:function(n){
		if(!n && n !== 0){return;}
		this.index = parseInt(n);
		this.aMove(n);
		this.setBtnStatus();
	},
	initPaging:function(){
		var pi = '<ul class="sliderPaging">',t=this;
		if(this.total > 1){
			for(var i=0; i<this.total; i++){ pi+='<li><a href="#"><span>'+parseInt(i)+'</span></a></li>';}
			this.pagingNav.html(pi+'</ul>');
			this.pagingLinks = this.pagingNav.find('a');
			this.pagingLinks.click(function(){ t.stop();t.goTo( $(this).find('span').text() ); return false; })
			this.setActive();
		}
		t.parent ? t.parent.setHeight() : '';
	},
	setActive:function(){
		var pl = this.pagingLinks || [];
		if(pl.length){ 
			pl.filter('.active').removeClass('active');
			$(pl[this.index]).addClass('active');
		}
	},
	setBtnStatus:function(){
		if( this.index == 0 ){ this.btn_prev.addClass('disabled');this.btn_next.removeClass('disabled'); if(this.total == 1){this.btn_next.addClass('disabled')} }
		else if(this.index >= this.total -1 ){ this.btn_next.addClass('disabled');this.btn_prev.removeClass('disabled'); }
		else { this.btn_prev.add(this.btn_next).removeClass('disabled'); }
	},
	getPosition:function(transform){
		var v = transform.replace(/[a-z]/g,'').replace('3(','').replace(')','').split(',') || [0,0,0];
		this.x = parseInt(v[0]);
		this.y = parseInt(v[1]);
	},
	reInit:function(sliderIndex){
		var n = sliderIndex || this.getIndex();
		this.items = this.scroller.find(this.itemsSelect);
		this.total = Math.ceil(this.items.length / this.row);
		this.layout();
		this.scroller.width( this.total * this.itemW );
		if( n === 'first' ){ n = 0 }
		this.goTo(n);
		if( this.pagingNav.length ) { this.initPaging(); }
		this.setBtnStatus();
	},
	getJson:function(){
		if(!this.opts.jsonFeed){ return }
		var t = this;
		$.ajax({
			url:this.opts.jsonFeed,
			dataType:'json',
			success:function(data){
				t.updateView(data);
			}
		})
	},
	updateView:function(data){
		var l = data.length, i, html = '';
		for(i=0; i<l; i++){
			html+=this.opts.views.item(data[i]);
		}
		this.scroller.html(html);
		this.reInit(0);
	}
}
// jQuery fn wrappers -----------------
!function($){
	$.fn.slider = function(opts){
		return this.each(function(){
			$(this).data().slider = new Slider($(this),opts);
		});
	}
}(jQuery);
