class YbDanmu {
	constructor (container, data, config = {}) {
		this.container = typeof container == 'string' ? document.querySelector(container) : container
		this.config = {...YbDanmu.DEFAULT_CONFIG, ...config}
		this.data = data
		this.filter = new YbDanmuFilter(this.config.filter)//过滤规则
		this.list = this._filterData(data)
		this.runline = []//正在跑动的弹幕列表
		this.canvas = null//canvas元素
		this.ctx = null//canvas实例
		this.paused = true//是否暂停
		this.currentTime = 0//当前时间轴
		this._animation = null//动画实例
	}
	static DEFAULT_CONFIG = {
		accuracy: 1,//绘制精度 auto-自动使用屏幕DPI 任意整数-自定义精度 高精度会导致性能问题，谨慎使用
		speed: 1,//弹幕运行速度
		playbackRate: 1,//弹幕倍速
		color: '#FFFFFF',//弹幕默认颜色
		fontSize: 18,//弹幕默认大小
		fontScale: 1,//弹幕规格（多少倍大小）
		fontFamily: 'Microsoft Yahei',//弹幕默认字体
		opacity: 1,//弹幕透明度
		top: 0,//舞台顶部间距
		bottom: 0,//舞台底部间距
		lineGap: 5,//弹幕行间距
		overlap: false,//开启防重叠
		timeDiffrence: 0,//时间差（用于校准弹幕和视频进度的时间差，一般不需要）
		disableScroll: false,//关闭滚动弹幕
		disableTop: false,//关闭顶端弹幕
		disableBottom: false,//关闭底端弹幕
		disableFilter: false,//关闭弹幕过滤
		filter: []//过滤列表
	}
	//格式化b站XML文件弹幕
	static parseBiliXml (content) {
		var pattern = /<d\b[^>]*>(.*?)<\/d\s*>/g;
		var danmuku = []
		let match = ''
		while ((match = pattern.exec(content)) !== null) {
			var attr = match[0].match(/p=\"*([\s\S]*?)\"/)[1]
			var attrs = attr.split(',')
			danmuku.push({
				mode: attrs[1],
				time: Number(attrs[0]),
				color: YbDanmu.decimalToRgb(Number(attrs[3])),
				fontSize: attrs[2],
				text: match[1]
			})
		}
		return danmuku
	}
	//格式化b站ssa文件弹幕
	static parseBiliSsa (content) {
		const lines = content.split('\n');
		let events = [];
		let currentSection;
		lines.forEach(line => {
		    line = line.trim();
		    if (line.startsWith('[') && line.endsWith(']')) {
		        currentSection = line.slice(1, -1).toLowerCase();
		        return;
		    }
		    if (currentSection === 'events') {
		        if (line.toLowerCase().startsWith('format:')) {
		            // 解析事件格式行
		            const format = line.slice(7).split(',').map(item => item.trim().toLowerCase());
		            // 存储事件格式定义
		        } else if (line.toLowerCase().startsWith('dialogue:')) {
		            // 解析对话行
		            const dialogueValues = line.slice(10).split(',').map(item => item.trim());
		            // 注意：文本部分可能包含逗号，所以不能简单分割
		            const textIndex = 9; // 根据format，文本通常是第9个字段（从0开始计数）
		            const text = dialogueValues.slice(9).join(','); // 合并文本部分
		            const dialogueData = {
		                start: dialogueValues[1],
		                end: dialogueValues[2],
		                style: dialogueValues[3],
		                text: text
		            };
		            events.push(dialogueData);
		        }
		    }
		});
		return events.filter(e => !e.text.includes('\\a5\\pos')).map(e => {
			var style = e.text.match(/\{*([\s\S]*?)\}/)[1]
			var arr = style.split('\\')
			return {
				mode: 1,
				time: timeToSeconds(e.start),
				color: arr[2].replace('c&H', '#'),
				fontSize: arr[3].replace('fs', ''),
				text: e.text.replace(/\{.*?\}/g, '')
			}
		})
	}
	
	//根据文字颜色自动生成反色边框
	static getStrokeColor (color) {
		var r,g,b
		if ( color.startsWith('#') ) {
			color = color.length == 7 ? color : '#' + color.slice(1, 4) + color.slice(1, 4)
			r = parseInt(color.slice(1,3),16);
			g = parseInt(color.slice(3,5),16);
			b = parseInt(color.slice(5,7),16);
		}
		if ( color.startsWith('rgb') ) {
			var match = color.match(/rgb\(*([\s\S]*?)\)/)
			var colors = match[1].split(',')
			r = colors[0];
			g = colors[1];
			b = colors[2];
		}
		var $grayLevel = (r * 0.299) + (g * 0.587) + (b * 0.144) / 255;
		//判断是否是深色
		if ($grayLevel < 0.5) return '#ffffff'
		else return '#000000'
	}
	
	static colorToRgba (color, opacity) {
		if ( color.startsWith('#') ) {
			color = color.length == 7 ? color : '#' + color.slice(1, 4) + color.slice(1, 4)
			let str="rgba("
			const r = parseInt(color.slice(1,3),16).toString();
			const g = parseInt(color.slice(3,5),16).toString();
			const b = parseInt(color.slice(5,7),16).toString();
			str += r+","+g+","+b+","+opacity+")";
			return str;
		}
		if ( color.startsWith('rgb') ) {
			var str="rgba("
			var match = color.match(/rgb\(*([\s\S]*?)\)/)
			var colors = match[1].split(',')
			var r = colors[0];
			var g = colors[1];
			var b = colors[2];
			str += r+","+g+","+b+","+opacity+")";
			return str;
		}
	}
	//16进制转rgb
	static decimalToRgb (decimal) {
		var r = (decimal >> 16) & 255;
		var g = (decimal >> 8) & 255;
		var b = decimal & 255;
		return 'rgb(' + r + ',' + g + ',' + b + ')'
	}
	//加载弹幕
	load () {
		if ( this.container ) {
			var canvas = document.createElement('CANVAS')
			this.container.appendChild(canvas)
			this.canvas = canvas
			this.ctx = canvas.getContext('2d')
			this.updateSize()
		}
	}
	//卸载弹幕
	unload () {
		this._clearAnimationFrame()
		this.list = []
		this.runline = []
		if ( this.ctx ) this.ctx = null
		if ( this.canvas ) {
			this.canvas.remove()
			this.canvas = null
		}
	}
	//更新数据
	setData (data) {
		this.data = data
		this.reset()
	}
	//动态配置
	setConfig (key, value) {
		this.config[key] = value
	}
	//播放弹幕
	play () {
		this.paused = false
		this._render()
	}
	//暂停弹幕
	pause () {
		this._clearAnimationFrame()
		this.paused = true
	}
	//跳转弹幕
	seek (time) {
		this.currentTime = time
		this.reset()
	}
	//更新时间轴（需要外部更新时间轴否则弹幕不会运行）
	time (time) {
		//计算本次更新时间和上次时间的时间差
		var diffrenece = time - this.currentTime
		//记录新时间
		this.currentTime = time
		//新列表
		var newList = []
		//跑动列表
		var runline = []
		//循环弹幕列表
		this.list.forEach(danmu => {
			//当前时间减去弹幕显示时间
			var range = this.getCurrentTime() - danmu.time
			//获取当前时间和上次时间的时间差以内的弹幕
			if ( range >= 0 && range < Math.abs(diffrenece) ) runline.push(danmu)
			//记录不在范围内的弹幕
			else newList.push(danmu)
		});
		//去掉已经渲染的弹幕
		this.list = newList
		//计算需要渲染弹幕的布局
		for ( let i = 0; i < runline.length; i++ ) {
			var bar = this._layout(runline[i])
			if ( bar ) this.runline.push(bar)
		}
		//排序弹幕
		this.runline.sort((a, b) => a.time - b.time)
	}
	//清空画布
	clear () {
		this.ctx && this.ctx.clearRect(0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);
	}
	//显示弹幕舞台
	show () {
		this.container.style.visibility = 'visible'
	}
	//隐藏弹幕舞台
	hide () {
		this.container.style.visibility = 'hidden'
	}
	//更新尺寸
	updateSize () {
		var width = this.container.offsetWidth
		var height = this.container.offsetHeight
		var dpr = this.config.accuracy == 'auto' ? window.devicePixelRatio : this.config.accuracy;
		this.canvas.width = width * dpr
		this.canvas.height = height * dpr
		this.canvas.style.width = width
		this.canvas.style.height = height
		this.ctx.scale(dpr, dpr)
	}
	//重置数据和画布
	reset () {
		this.clear()
		this.list = this._filterData(this.data)
		this.runline = []
		var duration = this.canvas.offsetWidth / (this.config.speed * this.config.playbackRate) / 60//滚动周期（除以60是因为为大概每秒60帧）根据滚动周期去获取可能出现在屏幕上的弹幕
		var newList = []
		var runline = []
		this.list.forEach(danmu => {
			var range = this.getCurrentTime() - danmu.time
			//重置数据的时候，考虑到播放进度可能在中间，未避免弹幕丢失，将时间误差控制在滚动周期以内
			if ( range >= 0 && range < duration ) runline.push(danmu)
			//记录不在范围内的弹幕
			else newList.push(danmu)
		});
		//去掉已经渲染的弹幕
		this.list = newList
		//计算渲染弹幕的布局
		for ( let i = 0; i < runline.length; i++ ) {
			var bar = this._layout(runline[i])
			if ( bar ) this.runline.push(bar)
		}
		this.runline.sort((a, b) => a.time - b.time)//排序弹幕
	}
	refresh () {
		this.updateSize()
		this.reset()
	}
	//弹幕是否正在显示
	getVisible () {
		return this.container ? this.container.style?.visibility == 'visible' : false
	}
	//获取时间进度
	getCurrentTime () {
		return this.currentTime + this.config.timeDiffrence//加上时间差
	}
	/**
	 * 发送弹幕
	 * @param {Object} danmu 弹幕数据
	 * @param {Boolean}border 使用边框
	*/
	send (danmu, border) {
		this.data.push(danmu)
		this.runline.push(this._layout({...danmu, time: danmu.time + this.config.timeDiffrence}, border, true))//强制显示弹幕
	}
	//插入弹幕数据，但不会渲染
	insert (danmu) {
		this.data.push(danmu)
		this.list.push(danmu)
	}
	//渲染弹幕
	_render () {
		this._clearAnimationFrame()
		if ( this.paused ) return
		if (this.runline.length) {
			this.clear();
			for (let i = 0; i < this.runline.length; i++) {
				var b = this.runline[i];
				//移除渲染完毕的弹幕
				if (b.left + b.width <= 0 || b.boxWidth <= 0) {
					this.runline.splice(i, 1)
					i--;
					continue;
				}
				// b.speed = this._detectionBump(b);//碰撞检测，保留位置，可能不需要
				var speed = (this.config.speed + b.speed) * this.config.playbackRate//弹幕随机的速度加上默认设置速度再乘以倍速，才是真正移动的速度
				if ( b.mode == 1 || !b.mode ) b.left -= speed;//滚动弹幕将x轴位置减去速度，实现滚动动画
				else b.boxWidth -= speed//顶端和底端弹幕，将记录的画布宽度减去速度，实现渲染时长
				//非滚动弹幕，当boxWidth大于画布宽度时，则不绘制，避免弹幕提前出现
				if ( b.mode == 1 || !b.mode || b.boxWidth <= this.canvas.offsetWidth )this._drawText(b);
			}
		}
		this._animation = window.requestAnimationFrame(() => this._render());
	}
	/**
	* 计算弹幕布局
	* @param { Object|String } danmu 弹幕对象
	* @param {Boolean} border 是否使用边框
	* @param {Boolean} force 是否强制显示
	*/
	_layout (danmu, border, force) {
		var ctx = this.ctx
		var canvas = this.canvas
		var config = this.config
		var boxWidth = canvas.offsetWidth
		var fontSize = danmu.fontSize || config.fontSize
		var fontFamily = danmu.fontFamily || config.fontFamily
		var fontScale = config.fontScale
		var color = danmu.color || config.color
		var mode = danmu.mode || 1
		var text = danmu.text
		var time = danmu.time
		ctx.font = `${fontSize * fontScale}px ${fontFamily}`;//设置字体大小和样式
		var width = Math.ceil(ctx.measureText(text).width);//测算文本宽度
		var speed = mode == 1 ? Math.random() * 0.1 : 0//随机移动速度（弹幕一帧移动的距离，加上随机数，可以让弹幕滚动更加有层次感）
		var offset = (this.getCurrentTime() - time) * 60 * (config.speed + speed)//根据弹幕出现时间和当前时间轴的时间差，计算弹幕的初始偏移值
		var left = mode == 1 ? boxWidth - offset : (boxWidth / 2) - (width / 2)//获取弹幕x轴位置
		var track = this._getTrack(fontSize, mode, offset, force);//获取弹幕y轴位置
		var top = track.top
		if ( top > -1 ) {
			return {
				mode,
				text,
				time,
				fontSize,
				color,
				top,
				left,
				speed: track.isOverlap ? speed + 2 + (Math.random() * 0.5) : speed,//如果是重叠的弹幕则加快速度，避免一直重叠，这样观感不好
				width,
				boxWidth: boxWidth - offset,//顶部和底部弹幕的显示时间根据舞台宽度和移动速度决定
				border//自己发送的弹幕需要加上边框，作区别显示
			}
		}
		return false;
	}
	/**
	* 绘制文字
	* @param {Object} danmu 弹幕对象
	* @param {String} mode 弹幕模式 1-滚动 4-底部 5-顶部
	*/
	_drawText (danmu, mode=1) {
		var ctx = this.ctx
		var config = this.config
		if ( ctx ) {
			ctx.beginPath();
			var fontSize = danmu.fontSize || config.fontSize
			var fontFamily = danmu.fontFamily || config.fontFamily
			var color = danmu.color || config.color
			var opacity = config.opacity
			var fontScale = config.fontScale
			var newFontSize = fontSize*fontScale
			ctx.font = `${fontSize*fontScale}px ${fontFamily}`;
			ctx.strokeStyle = YbDanmu.colorToRgba(YbDanmu.getStrokeColor(color), opacity);
			ctx.strokeText(danmu.text, danmu.left, danmu.top);
			ctx.fillStyle = YbDanmu.colorToRgba(color, opacity);
			ctx.fillText(danmu.text, danmu.left, danmu.top);
			if ( danmu.border ) {//如果带边框
				ctx.strokeStyle = color;//边框颜色
				ctx.lineWidth = 2;//边框宽度
				ctx.strokeRect(danmu.left, danmu.top - newFontSize, danmu.width, newFontSize + config.lineGap);//绘制边框
			}
			ctx.closePath();
		}
	}
	/**
	* 计算弹幕应该放在哪条轨道
	* @param fontSize（弹幕字体大小）
	* @param mode（弹幕模式）1-滚动 4-底部 5-顶部
	* @param offset（弹幕初始x轴位置偏差值）
	* @param force（是否强制显示，用于弹幕发送）
	*/
	_getTrack (fontSize, mode=1, offset=0, force) {
		//canvas绘制文字x,y坐标是按文字左下角计算，预留30px
		var canvas = this.canvas
		var isOverlap = false//是否重叠
		var nowTop = -1;//最终返回的顶部距离
		var minLen = -1;//最小弹幕数量
		var minTop = -1;//最小弹幕数量轨道
		var boxWidth = canvas.offsetWidth
		var boxHeight = canvas.offsetHeight
		var config = this.config
		var lineGap = config.lineGap
		var top = config.top
		var bottom = config.bottom
		var fontScale = config.fontScale
		var newFontSize = fontSize * fontScale
		var reserve = 5 //画布预留位置（给画布底部流出一段距离）不预留可能导致最后一个轨道的弹幕显示不全
		var trackLen = Math.floor((boxHeight - top - bottom) / (newFontSize + lineGap))//计算轨道数量
		var tracks = []
		if ( mode == 4 ) {
			//弹幕模式为底端，从底部开始加载，所以要用画布高度减去轨道高度，才是底端弹幕渲染的轨道高度
			for ( let i = 0; i < trackLen;i++ ) tracks.push( boxHeight - ((i * newFontSize) + (i * lineGap) + top + reserve) )//排列轨道
		} else {
			for ( let i = 0; i < trackLen;i++ ) tracks.push( ((i + 1) * newFontSize) + (i * lineGap) + top )//排列轨道
		}
		for ( let i = 0; i < tracks.length; i++ ) {
			var trackTop = tracks[i]
			//当前轨道上有多少条弹幕
			var danmus = this.runline.filter(danmu => danmu.top < trackTop + newFontSize && (danmu.fontSize * fontScale) + danmu.top > trackTop && danmu.mode == mode );
			if ( danmus.length < minLen || minLen == -1 ) {//获取最少弹幕数量的轨道
				minLen = danmus.length
				minTop = trackTop
			}
			if ( danmus.length == 0 ) {//当前轨道没有弹幕运行，直接插入该轨道
				nowTop = trackTop;
				break;
			} else {
				if ( danmus.length > 0 && mode == 1 ) {//当前轨道有弹幕运行，且弹幕模式是滚动模式时
					var arr = danmus.map(danmu => danmu.left + danmu.width);
					var max = Math.max(...arr);//获取当前轨道最右的弹幕
					//如果当前轨道还有空位则将弹幕放入当前轨道
					if ( max < boxWidth - offset - 10 ) {//预留10像素间隔
						nowTop = trackTop;
						break;
					}
				}
			}
		}
		if ( nowTop == -1 && (!config.overlap || force) ) {//没有找到可插入的轨道，但没有开启防重叠或者需要强制显示弹幕，这个弹幕弹幕会无视原来的弹幕开启新的弹幕墙
			nowTop = minTop//将弹幕强制插入最少弹幕数量的轨道
			isOverlap = true//重叠弹幕
		}
		return {
			top: nowTop + top,//加上上边距top
			isOverlap
		}
	}
	//过滤数据
	_filterData (data) {
		var config = this.config
		var disableScroll = config.disableScroll
		var disableTop = config.disableTop
		var disableBottom = config.disableBottom
		return YbPlayer.deepClone(data.filter(item => (item.mode != 1 || !disableScroll) && (item.mode != 5 || !disableTop) && (item.mode != 4 || !disableBottom) && !this.filter.filter(item.text)))
	}
	
	_clearAnimationFrame () {
		if ( this._animation ) {
			window.cancelAnimationFrame(this._animation)
			this._animation = null
		}
	}
}
//弹幕过滤
class YbDanmuFilter {
    constructor(list) {
        this.rules = list || [];
    }
    // 添加
    add(rule) {
		//判断是否存在同类型的相同规则
		var index = this.rules.findIndex(r => r.pattern == rule.pattern && r.type == rule.type)
		if ( index > -1 ) return false//如果已经存在返回false，表示插入失败
        this.rules.push(rule);
		return true//添加成功返回true
    }
    
    // 删除
    remove(index) {
        this.rules.splice(index, 1);
    }
    
    // 过滤弹幕
    filter(danmu) {
        for (let rule of this.rules) {
            if (rule.type === 'string') {
                // 字符串匹配
                if (danmu.includes(rule.pattern)) {
                    return true;
                }
            } else if (rule.type === 'regex') {
                // 正则表达式匹配
                try {
                    const regex = new RegExp(rule.pattern);
                    if (regex.test(danmu)) {
                        return true;
                    }
                } catch (e) {
                    console.error('无效的正则表达式:', rule.pattern, e);
                }
            }
        }
        return false;
    }
    
    // 获取所有规则
    getRules() {
        return this.rules;
    }
}

//兼容new Function，为了挂载到window对象上
if ( typeof window != 'undefined' ) {
	window.YbDanmu = YbDanmu
}