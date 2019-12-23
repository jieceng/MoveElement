/**
 * 将一个元素变成可移动的
 */
export default class MoveElement {
		constructor(option) {
			//元素
			this.$el = this.disSelector(option.el);
			this.style = option.style || null;

			//大小
			this.w = this.$el.getBoundingClientRect().width || this.$el.offsetWidth;
			this.h = this.$el.getBoundingClientRect().height || this.$el.offsetHeight;

			//运行环境
			this.ismobi = MoveElement.isMobiFun();

			/*可配置项*/
			//移动的频率
			this.rate = option.rate || 50;

			//每次位移值
			this.moveX = 0;
			this.moveY = 0;

			//移动之前原来的位移值（点击时的值）
			this.beforeX = null;
			this.beforeY = null;
			
			//按下的鼠标位置信息
			this.startX = null;
			this.startY = null;

			//最早的位移位置
			this.originX = option.originX || this.disX;
			this.originY = option.originY || this.disY;

			//模式
			this.mode = option.mode || 'position';
			this.positionValue = option.positionValue || 'absolute';

			//移动的方向
			this.noDirection = option.noDirection ? option.noDirection.toLowerCase() : ''; //'tblr'上下左右禁用
			
			//绑定事件的是否采用捕获模式
			this.useCapture = option.useCapture || false;
			/*钩子函数*/
			this.beforeInit = option.beforeInit; //初始化之前
			this.inited = option.inited; //初始化之后
			
			this.beforeStart = option.beforeStart; //点击内部事务执行之前
			this.started = option.started; //点击内部事务执行之后
			
			this.beforeMove = option.beforeMove; //每次移动内部事务执行之前(高频率触发!)
			this.moved = option.moved; //每次移动内部事务执行之后(高频率触发!)
			
			this.beforeEnd = option.beforeEnd; //每次结束移动内部事务执行之前
			this.ended = option.ended; //每次结束移动内部事务执行之后
			console.dir(document.body);
			//初始化
			this._init();
		}

		/**
		 * @description 给元素初始化
		 * @param {Object} el 元素
		 */
		_init() {
			//初始化之前
			this.beforeInit && this.beforeInit();

			//监听属性
			this.listen();

			//初始化移动的模式
			this.initMode();

			//初始化样式
			this.setStyle(this.style);

			//绑定事件
			this.bindEvent();

			//初始化之后
			this.inited && this.inited();
			console.dir(this)
		}

		/**
		 * @description 给元素设置样式
		 * @param {Object} el 元素
		 * @param {Object} style 设置的样式
		 */
		setStyle(style) {
			for (let key in style) {
				if (style.hasOwnProperty(key)) {
					this.$el.style[key] = style[key];
				}
			}
		}

		/**
		 * @description 给元素绑定事件
		 * @param {Object} el 元素
		 */
		bindEvent() {
			//事件名称
			let startName, moveName, endName;
			if (this.ismobi) {
				startName = 'touchstart';
				moveName = 'touchmove';
				endName = 'touchend';
			} else {
				startName = 'mousedown';
				moveName = 'mousemove';
				endName = 'mouseup';
			}
			/*移动事件*/
			let moveFun = MoveElement.throttle(e => {
				if (this.status) { //解决定时器在抬起事件未关闭函数（节流后成为异步函数）
					e = e || window.event;
					//取消移动的默认动作(移动不用)
					if (!this.ismobi) {
						e.preventDefault();
					}
					if (this.ismobi) { // 兼容移动端
						e = e.touches[0];
					}
					this.beforeMove && this.beforeMove(e) //每次移动内部事务执行之前(高频率触发)
			
					//本次移动的距离
					this.moveX = e.clientX - this.startX;
					this.moveY = e.clientY - this.startY;
			
					//根据方向设置值（这里可以对方向做一个拦截，达到设置方向的效果）
					this.setTranslateByDirection(this.moveX, this.moveY);
			
					this.moved && this.moved(e) //每次移动内部事务执行之后(高频率触发)
					return false;
				}
			}, this.rate)
			
			/*结束事件*/
			
			let endFun = e => {
				e = e || window.event;
				this.beforeEnd && this.beforeEnd(e); //每次结束移动内部事务执行之前
			
				document.body.removeEventListener(moveName,moveFun,this.useCapture);
				document.body.removeEventListener(endName,endFun,this.useCapture);
				//改变状态
				this.status = false;
			
				this.ended && this.ended(e) //每次结束移动内部事务执行之后
				return false;
			}
			
			/*按下事件*/
			let startFun = e => {
			console.log('按下')
				e = e || window.event;
				e.stopPropagation ? e.stopPropagation() : e.cancelBubble = true;
				//点击内部事务执行之前
				this.beforeStart && this.beforeStart();
				if (this.ismobi) { // 兼容移动端
					if(!e.touches){
						return false;
					}
					e = e.touches[0];
				}
				//改变状态
				this.status = true;

				//按下的鼠标位置信息
				this.startX = e.clientX;
				this.startY = e.clientY;

				//记录原来的值
				this.beforeX = this.disX;
				this.beforeY = this.disY;
				
				//点击内部事务执行之后
				this.started && this.started(e)
				document.body.addEventListener(moveName, moveFun, this.useCapture);
				document.body.addEventListener(endName, endFun, this.useCapture);
				return false;
			}
			this.$el.addEventListener(startName, startFun, this.useCapture);//绑定事件
		}

		/**
		 * 移动模式初始化
		 */
		initMode() {
			
			if(this.mode === 'position'){
				//设置样式
				this.setStyle({
					position: this.positionValue,
					left: this.disX,
					top: this.disY
				});
			}else{
				this.disX = this.getTranslateValue().x;
				this.disY = this.getTranslateValue().y;
			}
		}


		/**
		 * 监听属性
		 */
		listen() {
			Object.defineProperty(this, 'x', {
				get() {
					return this.$el.getBoundingClientRect().left;
				}
			})
			Object.defineProperty(this, 'y', {
				get() {
					return this.$el.getBoundingClientRect().top;
				}
			})
			Object.defineProperty(this, 'disX', {
				set(value) {
					//位移设置的值，根据模式获取相关值
					if(this.mode === 'position'){
						this.$el.style.left = value + 'px';
					}else{
						this.$el.style.transform = `translate(${value}px,${this.disY}px)`;
					}
				},
				get() {
					if(this.mode === 'position'){
						return this.toNum(this.$el.style.left);
					}else{
						return this.getTranslateValue().x;
					}
				}
			})
			Object.defineProperty(this, 'disY', {
				set(value) {
					//位移设置的值，根据模式获取相关值
					if(this.mode === 'position'){
						this.$el.style.top = value + 'px';
					}else{
						this.$el.style.transform = `translate(${this.disX}px,${value}px)`;
					}
				},
				get() {
					if(this.mode === 'position'){
						return this.toNum(this.$el.style.top);
					}else{
						return this.getTranslateValue().y;
					}
				}
			})
		}

		/**
		 * @description 转成数字
		 * @param {Any} NaN null undefind '' '5px'  7 => 0 0 0 5px
		 */
		toNum(arg) {
			if (Number.isNaN(arg) || !arg) {
				return 0;
			} else {
				return Number.parseInt(arg);
			}
		}

		/**
		 * 根据方向来设置值
		 */
		setTranslateByDirection(x, y) {
			//需要设置的值
			let disX = x + this.beforeX,
					disY = y + this.beforeY,
					originX = this.originX,
					originY = this.originY,
					noDirection = this.noDirection;
					
			if (noDirection.indexOf('l') !== -1) {
				disX = disX > originX ? disX : originX;
			}
			if (noDirection.indexOf('r') !== -1) {
				disX = disX > originX ? originX : disX;
			}
			if (noDirection.indexOf('t') !== -1) {
				disY = disY > originY ? disY : originY;
			}
			if (noDirection.indexOf('b') !== -1) {
				disY = disY > originY ? originY : disY;
			}
			
			//最后改变this.disX，this.disY
			this.disX = disX;
			this.disY = disY;
		}

		/**
		 * @description 获取元素的属性值
		 * @param {String} attr  属性
		 * @return {String} 返回一个属性值
		 */
		getStyleValue(attr) {
			if (this.$el.currentStyle) { //IE  
				return this.$el.currentStyle[attr];
			} else {
				return getComputedStyle(this.$el,null)[attr]; //Firefox  
			}
		}
		
		/**
		 * @description  获取元素的tansform属性中的translate值
		 * @param {Element}  元素
		 * @retuan {Object|Null} 返回一个对象{x:value,y:value}
		 */
		getTranslateValue(el){
			el = el || this.$el;
			let matrix = this.getStyleValue('transform');
			if(matrix === 'none'){
				return {
					x: 0,
					y: 0
				};
			}else{
				matrix = matrix.split(',');
				return {
					x: this.toNum(matrix[4]),
					y: this.toNum(matrix[5])
				}
			}
		}


		/**
		 * @description 处理传入的元素或者字符串
		 * @param {String | Element} 选择器字符或者元素
		 * @return {Element} 返回一个元素
		 */
		disSelector(el) {
			if (!el) { //没有传入就创建
				let newEle = document.createElement('div');
				return newEle;
			} else if (typeof el == 'string') { //选择器
				let ele = document.querySelector(el);
				if (!ele) { //没有找到元素
					throw Error('Cannot get element based on incoming el')
				}
				return document.querySelector(el);
			} else if (el instanceof Element) { //是一个元素就返回
				return el;
			} else { //非法数值的选择器
				throw Error('The incoming El cannot be resolved');
			}
		}

		/**
		 * @description 判断当前设备是否是移动端
		 * @return {Boolean} ture是移动端，false是pc端
		 */
		static isMobiFun() {
			return window.navigator.userAgent.toLowerCase().indexOf('mobi') !== -1;
		}


		/**
		 * @description 事件节流
		 * @param {Function} fn 节流的函数
		 * @param {Number} delay 节流的时间
		 */

		static throttle(fn, delay = 300) {
			let timer = null;
			return function() {
				let context = this;
				let arg = arguments;
				if (!timer) {
					timer = setTimeout(function() {
						fn.apply(context, arg);
						timer = null;
					}, delay)
				}
			}
		}

	}
