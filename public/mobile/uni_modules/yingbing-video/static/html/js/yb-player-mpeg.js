class YbMpeg {
	constructor () {
		this.canvas = null
		this._src = null//播放链接
		this.duration = null//总时长
		this.jsmpeg = null//jsmpeg实例
		this.readyState = 0//视频状态
		this._event = {}//事件对象
		this._init = null//是否已经初始化
		this._isSeeking = false//是否正在跳转
		this._seekingTime = null//正在跳转的时间
		this.init()
	}
	//操作播放链接
	get src () {
		return this._src
	}
	set src (value) {
		this._src = value
	}
	//操作静音
	get muted () {
		return this.jsmpeg?.volume == 0 ? true : false
	}
	set muted (value) {
		if ( this.jsmpeg ) {
			this.jsmpeg.volume = value ? 0 : 1
			this.emit('volumechange')
		}
	}
	//操作进度
	get currentTime() {
	    return this.jsmpeg?.currentTime
	}
	//设置进度
	set currentTime(value) {
	  if ( this.jsmpeg ) {
		  this.jsmpeg.currentTime = value
		  this._isSeeking = true
		  this._seekingTime = value
		  this.emit('seeking')
	  }
	}
	//获取视频宽度
	get videoWidth () {
		return this.jsmpeg?.video?.destination?.width
	}
	//获取视频高度
	get videoHeight () {
		return this.jsmpeg?.video?.destination?.height
	}
	//获取暂停状态
	get paused () {
		return this.jsmpeg?.paused
	}
	//播放事件
	get onplay () {
		return this._event.onplay || null
	}
	set onplay (callback) {
		this._event.onplay = callback
	}
	//暂停事件
	get onpause () {
		return this._event.onpause || null
	}
	set onpause (callback) {
		this._event.onpause = callback
	}
	//播放结束事件
	get onended () {
		return this._event.onended || null
	}
	set onended (callback) {
		this._event.onended = callback
	}
	//数据不足等待加载事件
	get onwaiting () {
		return this._event.onwaiting || null
	}
	set onwaiting (callback) {
		this._event.onwaiting = callback
	}
	//恢复播放事件
	get onplaying () {
		return this._event.onplaying || null
	}
	set onplaying (callback) {
		this._event.onplaying = callback
	}
	//开始加载事件
	get onloadstart () {
		return this._event.onloadstart || null
	}
	set onloadstart (callback) {
		this._event.onloadstart = callback
	}
	//加载到元数据事件
	get onloadedmetadata () {
		return this._event.onloadedmetadata || null
	}
	set onloadedmetadata (callback) {
		this._event.onloadedmetadata = callback
	}
	//加载到第一帧事件
	get onloadeddata () {
		return this._event.onloadeddata || null
	}
	set onloadeddata (callback) {
		this._event.onloadeddata = callback
	}
	//可以播放事件
	get oncanplay () {
		return this._event.oncanplay || null
	}
	set oncanplay (callback) {
		this._event.oncanplay = callback
	}
	//加载全部数据事件
	get oncanplaythrough () {
		return this._event.oncanplaythrough || null
	}
	set oncanplaythrough (callback) {
		this._event.oncanplaythrough = callback
	}
	get oncontextmenu () {
		return this.canvas?.oncontextmenu || null
	}
	set oncontextmenu (callback) {
		if ( this.canvas ) this.canvas.oncontextmenu = callback
	}
	//音量改变事件
	get onvolumechange () {
		return this._event.onvolumechange || null
	}
	set onvolumechange (callback) {
		this._event.onvolumechange = callback
	}
	//总时长改变事件
	get ondurationchange () {
		return this._event.ondurationchange || null
	}
	set ondurationchange (callback) {
		this._event.ondurationchange = callback
	}
	//事件进度更新事件
	get ontimeupdate () {
		return this._event.ontimeupdate || null
	}
	set ontimeupdate (callback) {
		this._event.ontimeupdate = callback
	}
	//跳转中事件
	get onseeking () {
		return this._event.onseeking || null
	}
	set onseeking (callback) {
		this._event.onseeking = callback
	}
	//跳转完成事件
	get onseeked () {
		return this._event.onseeked || null
	}
	set onseeked (callback) {
		this._event.onseeked = callback
	}
	//中断事件
	get onabort () {
		return this._event.onabort || null
	}
	set onabort (callback) {
		this._event.onabort = callback
	}
	init() {
		this.canvas = document.createElement('CANVAS')
	}
	//设置属性
	setAttribute (attr, value) {
		this.canvas.setAttribute(attr, value)
	}
	//移除属性
	removeAttribute (attr) {
		//如果移除的属性是src，则清空src
		if ( attr == 'src' ) {
			this._src = null
		} else {
			this.canvas.removeAttribute(attr)
		}
	}
	//是否包含某个节点
	contains (target) {
		return this.canvas.contains(target)
	}
	//配置文件
	setConfig (config) {
		this.config = config
	}
	setDecoder (decoder) {
		this.decoder = decoder
	}
	//加载视频
	load () {
		this.unload()
		if ( !this._src ) return
		this.jsmpeg = new this.decoder.Player(this._src, {
		    canvas: this.canvas,
			...this.config,
			//当源接收到所有数据时调用的回调
		    onSourceCompleted: () => {
				this.readyState = 4
				this.emit('canplaythrough')
		    },
			//当source第一次接收到数据时调用的回调
			onSourceEstablished: () => {
				this.readyState = 1
				this.emit('canplay')
				this.emit('loadedmetadata')
			},
			//已连接
		    onSourceConnected: () => {
				this.emit('loadstart')
		    },
			//视频流解码完毕
			onVideoDecode: (decoder, time) => {
				//还未初始化
				if ( !this._init ) {
					//更新readyState状态
					this.readyState = 3
					this.emit('loadeddata')
					this._init = true
				} else {
					//如果刚才处于卡顿中
					if ( this.readyState == 2 ) {
						this.readyState = 3//更改视频状态
						this.emit('playing')//触发playing
					}
					//处于跳转当中，并且当前时间和跳转时间相近，则认为跳转完成
					if (this._isSeeking && Math.abs(this.jsmpeg.currentTime - this._seekingTime) < 0.1) {
					  this._isSeeking = false;
					  this._seekingTime = null
					  this.emit('seeked');
					}
					this.emit('timeupdate')
					
				}
				if ( this.jsmpeg.currentTime > this.duration ) this.duration = this.jsmpeg.currentTime + 1//直播流/实时流是没有总播放时长的，但为了方便外部调用duration不会报错，这里默认给duration实时更新
				this.emit('durationchange')
			},
			//连接断开
		    onSourceDisconnected: () => {
				this.readyState = 0
				this.emit('abort')
		    },
			//当播放开始时调用的回调函数
			onPlay: () => {
				this.emit('play')
			},
			//当播放暂停时调用的回调函数(例如当.pause()被调用或源结束时)
			onPause: () => {
				this.emit('pause')
			},
			//当播放到达源的末尾时调用(只在loop=false调用)
			onEnded: () => {
				this.emit('ended')
			},
			//当没有足够的数据播放时调用的回调
			onStalled: () => {
				this.readyState = 2
				this.emit('waiting')
			}
		});
		this.jsmpeg.volume = this.config.muted ? 0 : 1
	}
	//卸载视频
	unload () {
		this.jsmpeg?.destroy()
		this.jsmpeg = null
		this.duration = null
		this.jsmpeg = null
		this.readyState = 0
		this._init = null
	}
	//播放视频
	play () {
		this.jsmpeg?.play()
	}
	//暂停视频
	pause () {
		this.jsmpeg?.pause()
	}
	//抛出事件
	emit (name, ...args) {
		this._event['on' + name] && this._event['on' + name](...args)
	}
	//移除视频
	remove () {
		this.canvas?.remove()
		this.canvas = null
	}
}
//兼容new Function，为了挂载到window对象上
if ( typeof window != 'undefined' ) {
	window.YbMpeg = YbMpeg
}