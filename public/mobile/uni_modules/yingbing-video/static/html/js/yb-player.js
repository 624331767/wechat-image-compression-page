class YbPlayer {
	constructor ({
		container,
		src,
		segments,
		title,
		poster,
		type,
		three,
		autoplay,
		loop,
		muted,
		playbackRate,
		preload,
		isLive,
		header,
		controls,
		height,
		crossOrigin,
		objectFit,
		openDirection,
		exitDirection,
		initialTime,
		duration,
		danmu,
		custom,
		decoder,
		quality,
		works,
		workIndex,
		subtitles,
		subtitleIndex
	}) {
		this.container = typeof container == 'string' ? document.querySelector(container) : container
		this.src = src//播放链接 
		this.segments = segments//切片列表 仅支持flv.js segments权重比src小，如果同时传入src和segments,以src优先
		this.title = title//标题
		this.poster = poster || undefined//封面
		this.type = type//解码类型
		this.three = three || 'none'//3D模式
		this.autoplay = autoplay//是否自动播放
		this.loop = loop//是否循环播放
		this.muted = muted//是否静音
		this.playbackRate = playbackRate || 1//默认播放倍速
		this.preload = preload//是否预加载
		this.isLive = isLive//是否直播
		this.header = header//显示头部控制栏
		this.controls = controls//显示底部控制栏
		this.height = height || 'auto'//视频高度
		this.crossOrigin = crossOrigin//跨域属性 anonymous-它有一个默认值。它定义了将在不传递凭据信息的情况下发送CORS请求 use-credentials-将发送带有凭据、cookie 和证书的 cross-origin 请求
		this.objectFit = objectFit//当视频宽高超出容器时的表现形式 fill-内容拉伸填充 contain-保持比例内容缩放 cover-保持比例内容可能被剪切 none-内容不重置 scale-down-保持比例从none或contain选一个 initial-默认值
		this.openDirection = openDirection || 'auto'//全屏方向 auto-自动计算 landscape-横屏 portrait-竖屏
		this.exitDirection = exitDirection || 'portrait'//退出全屏时锁定的屏幕方向 landscape-横屏 portrait-竖屏
		this.initialTime = initialTime//初始化时间
		this.duration = duration//自定义时长
		this.danmu = danmu || []//弹幕列表
		this.custom = custom || {}//自定义配置
		this.decoder = decoder || {}//解码器
		this.quality = quality || []//画质列表
		this.works = works || []//分p列表
		this.subtitles = subtitles || []//字幕
		this.subtitleIndex = subtitleIndex || -1//字幕索引 -1 - 关闭字幕
		this.workIndex = workIndex || 0//分P索引
		this.video = null//视频
		this.pano = null//3D实例
		this.cm = null//弹幕实例
		this.hls = null//hls实例
		this.flv = null//flv实例
		this.gesture = null//手势实例
		this.subtitle = null//字幕实例
		this.disabled = false//是否锁屏
		this._isSeeking = false//正在拖动进度中
		this._isDirection = false//是否已经调用setDirection
		this._controlsTimer = null//控制栏隐藏定时器
		this._toastTimer = null//消息隐藏定时器
		this._danmuTimer = null//弹幕定时器
		this._seizingTimer = null//卡死定时器（播放一些直播源的时候，可能会出现卡死无反应的情况，需要做出处理）
		this._event = {}
	}
	//开启全屏按钮
	static openfullIcon = `
		<svg t="1758178660741" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="18274" width="48" height="48"><path d="M392.704 893.44H186.368c-31.232 0-55.808-24.576-55.808-55.808v-204.8c0-7.168 6.144-13.312 13.312-13.312h83.456c7.168 0 13.312 6.144 13.312 13.312v138.24c0 7.168 6.144 13.312 13.312 13.312h137.728c7.168 0 13.312 6.144 13.312 13.312v81.408c1.024 8.192-5.12 14.336-12.288 14.336z m444.928 0h-200.704c-7.168 0-13.312-6.144-13.312-13.312V798.72c0-7.168 6.144-13.312 13.312-13.312h133.632c7.168 0 13.312-6.144 13.312-13.312V634.88c0-7.168 6.144-13.312 13.312-13.312h82.432c7.168 0 13.312 6.144 13.312 13.312v202.752c0.512 31.232-24.064 55.808-55.296 55.808z m42.496-490.496h-82.432c-7.168 0-13.312-6.144-13.312-13.312V252.416c0-7.168-6.144-13.312-13.312-13.312h-134.656c-7.168 0-13.312-6.144-13.312-13.312v-81.92c0-7.168 6.144-13.312 13.312-13.312h201.728c31.232 0 55.808 24.576 55.808 55.808v203.264c-0.512 7.168-6.656 13.312-13.824 13.312zM227.328 404.48H143.872c-7.168 0-13.312-6.144-13.312-13.312v-204.8c0-31.232 24.576-55.808 55.808-55.808h206.336c7.168 0 13.312 6.144 13.312 13.312V225.28c0 7.168-6.144 13.312-13.312 13.312h-138.24c-7.168 0-13.312 6.144-13.312 13.312v137.728c-0.512 8.704-6.144 14.848-13.824 14.848z" p-id="18275"></path></svg>
	`
	//退出全屏按钮
	static exitfullIcon = `
		<svg viewBox="0 0 24 24">
		    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
		</svg>
	`
	//中间播放按钮
	static playcenterIcon = `
		<svg width="100" height="100" viewBox="0 0 100 100" id="svgButton">
		    <circle cx="50" cy="50" r="45" stroke="white" stroke-width="2" fill="none" />
		    <path id="play" d="M40,30 L40,70 L70,50 Z" fill="white" />
		</svg>
	`
	//播放按钮
	static playIcon = `
		<svg t="1758177095662" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5880" width="48" height="48"><path d="M882.734114 459.147258l0.024559-0.024559L244.016061 21.12718l-0.199545 0.188288C230.582097 8.748245 212.62819 1.014096 192.840518 1.014096c-40.704051 0-73.699536 32.66905-73.699536 72.996524 0 22.148439-0.954745 65.513086 0 64.572668l0 373.422851 0 393.071354c0 0.325411 0 25.249057 0 44.935422 0 40.302915 32.995485 72.972988 73.699536 72.972988 19.862373 0 37.892005-7.78429 51.125401-20.466124l0.050142 0.025583 638.742613-437.982216-0.024559-0.038886c13.886265-13.270235 22.549575-31.889291 22.549575-52.531424 0-0.050142 0-0.088004 0-0.150426 0-0.050142 0-0.11154 0-0.149403C905.28369 491.048829 896.620379 472.41647 882.734114 459.147258z" p-id="5881"></path></svg>
	`
	//暂停按钮
	static pauseIcon = `
		<svg t="1758178251644" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="11765" width="48" height="48"><path d="M432 176v672c0 26.5-21.5 48-48 48H224c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48h160c26.5 0 48 21.5 48 48zM848 176v672c0 26.5-21.5 48-48 48H640c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48h160c26.5 0 48 21.5 48 48z" p-id="11766"></path></svg>
	`
	//上一个按钮
	static prevIcon = `
		<svg viewBox="0 0 1024 1024"><path d="M409.6 379.965l290.673-183.214c43.049-27.136 77.967-8.396 77.967 42.046v546.406c0 50.36-34.857 69.223-77.967 42.046L409.6 644.035V757.76a81.92 81.92 0 1 1-163.84 0V266.24a81.92 81.92 0 1 1 163.84 0v113.725z"></path></svg>
	`
	//下一个按钮
	static nextIcon = `
		<svg viewBox="0 0 1024 1024"><path d="M614.4 379.965V266.24a81.92 81.92 0 1 1 163.84 0v491.52a81.92 81.92 0 1 1-163.84 0V644.035L323.727 827.249c-43.11 27.177-77.967 8.315-77.967-42.046V238.797c0-50.442 34.918-69.182 77.967-42.046L614.4 379.965z"></path></svg>
	`
	//加载图标
	static loadIcon = `
		<svg class="spinner" viewBox="0 0 50 50">
		    <circle cx="25" cy="25" r="20" fill="none"/>
		</svg>
	`
	//音量图标
	static voiceIcon = `
		<svg viewBox="0 0 24 24">
		    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
		</svg>
	`
	//返回图标
	static backIcon = `
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
		  <path d="M19 12H5M5 12L11 18M5 12L11 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	`
	//重加载图标
	static errorIcon = `
		<svg t="1756091252738" class="icon" viewBox="0 0 1024 1024" p-id="5051">
			<path d="M637.76 138.112a391.744 391.744 0 0 1 5.12 748.8l43.776 26.24a32 32 0 0 1-19.008 59.52 32 32 0 0 1-16-4.8l-106.56-65.6a32 32 0 0 1-10.56-43.968l65.6-106.56a32 32 0 1 1 54.592 33.408l-22.848 38.144a327.808 327.808 0 0 0-12.544-624 32 32 0 0 1 18.432-61.184zM391.872 79.36l115.2 49.152a32 32 0 0 1 17.088 17.6 32 32 0 0 1 0 24.448l-49.088 115.008a32 32 0 0 1-29.76 19.52 32 32 0 0 1-29.44-44.608l21.44-49.92a327.808 327.808 0 0 0-3.84 633.792 32 32 0 0 1-7.68 62.912 29.76 29.76 0 0 1-8.32-1.152 391.744 391.744 0 0 1-14.08-752.256L366.72 138.24a32 32 0 1 1 25.152-58.88z" p-id="5052"></path>
		</svg>
	`
	//锁屏图标
	static lockIcon = `
		<svg t="1756887430264" viewBox="0 0 1024 1024"><path d="M394.304 316.608A124.672 124.672 0 0 1 518.72 192a124.704 124.704 0 0 1 124.48 124.608V416h-248.896V316.608zM544 704a32 32 0 0 1-64 0v-128a32 32 0 0 1 64 0v128z m256.256-288H707.2V316.608A188.736 188.736 0 0 0 518.72 128c-103.904 0-188.416 84.608-188.416 188.608V416h-106.56A64 64 0 0 0 160 480.096v319.84A64 64 0 0 0 223.744 864h576.512A64 64 0 0 0 864 799.936v-319.84A64 64 0 0 0 800.256 416z" p-id="10429"></path></svg>
	`
	//解开锁屏图标
	static unlockIcon = `
		<svg t="1756887487890" class="icon" viewBox="0 0 1024 1024"><path d="M544 704a32 32 0 0 1-64 0v-128a32 32 0 0 1 64 0v128z m256.256-288H394.304V316.608A124.672 124.672 0 0 1 518.72 192a124.704 124.704 0 0 1 124.48 124.608 32 32 0 1 0 64 0A188.736 188.736 0 0 0 518.72 128c-103.904 0-188.416 84.608-188.416 188.608V416h-106.56A64 64 0 0 0 160 480.096v319.84A64 64 0 0 0 223.744 864h576.512A64 64 0 0 0 864 799.936v-319.84A64 64 0 0 0 800.256 416z" p-id="11412"></path></svg>
	`
	//更多图标
	static moreIcon = `
		<svg t="1756887864084" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="21526" width="48" height="48"><path d="M512 416c53.02 0 96 42.98 96 96s-42.98 96-96 96-96-42.98-96-96 42.98-96 96-96z m320 0c53.02 0 96 42.98 96 96s-42.98 96-96 96-96-42.98-96-96 42.98-96 96-96z m-640 0c53.02 0 96 42.98 96 96s-42.98 96-96 96-96-42.98-96-96 42.98-96 96-96z" p-id="21527"></path></svg>
	`
	static postMessage (data) { //向app通信
		if ( typeof uni != 'undefined' ) {
			uni.postMessage({ data: YbPlayer.deepClone(data) })
		} else {
			const parent = window.parent || window.top
			if ( parent ) parent.postMessage(YbPlayer.deepClone(data));
		}
	}
	static getDecodeType (decoder, src) {//根据后缀获取解码类型
		if ( src.startsWith('ws://') || src.startsWith('wss://') || src.includes('.ts') ) return 'jsmpeg'
		else if ( src.includes('.m3u8') && decoder.hls.loader.isSupported() ) return 'hls'
		else if ( src.includes('.flv') && decoder.flv.loader.isSupported() ) return 'flv'
		else if ( src.includes('.mp4') || src.includes('.webm') || src.includes('.ogg') || (!decoder.hls.loader.isSupported() && src.includes('.m3u8')) || (!decoder.flv.loader.isSupported() && src.includes('.flv')) ) return 'video'
		else return ''
	}
	//尝试加载hls
	static checkWithHls (Hls, src) {
		return new Promise((resolve) => {
			let hls = new Hls();
			hls.on(Hls.Events.ERROR, function(event, data) {
			    if (data.fatal) {//加载失败返回false
			        hls.destroy();
					hls = null
					resolve(false)
			    }
			});
			hls.loadSource(src);
			hls.on(Hls.Events.MANIFEST_PARSED, function() {
			    hls.destroy();
				hls = null
			    resolve('hls');
			});
		})
	}
	//尝试加载flv
	static checkWithFlv (flvjs, src) {
		return new Promise((resolve) => {
			let flvPlayer = flvjs.createPlayer({
			    type: 'flv',
			    url: src
			});
			flvPlayer.on(flvjs.Events.ERROR, function(e) {//加载flv失败
				flvPlayer.pause();
				flvPlayer.unload();
				flvPlayer.detachMediaElement();
				flvPlayer.destroy();
				flvPlayer= null;
			    resolve(false);
			});
			flvPlayer.on(flvjs.Events.LOADING_COMPLETE, function() {//加载flv成功
			   flvPlayer.pause();
			   flvPlayer.unload();
			   flvPlayer.detachMediaElement();
			   flvPlayer.destroy();
			   flvPlayer= null;
			   resolve('flv');
			});
			flvPlayer.load();
		})
	}
	
	//时间格式化
	static timeFormat (value) {
		let hours = Math.floor(value / 60 / 60 % 60) >= 10 ? Math.floor(value / 60 / 60 % 60) : '0' + Math.floor(value / 60 / 60 % 60);
		let minutes = Math.floor(value / 60 % 60) >= 10 ? Math.floor(value / 60 % 60) : '0' + Math.floor(value / 60 % 60);
		let seconds = Math.floor(value % 60) >= 10 ? Math.floor(value % 60) : '0' + Math.floor(value % 60);
		return hours == '00' ? (minutes + ':' + seconds) : (hours + ':' + minutes + ':' + seconds);
	}
	//时分秒转换秒
	static timeToSeconds (timeStr) {
		const timeRegex = /^(\d{1,2}):(\d{1,2}):(\d{1,2})\.(\d{1,3})$/;
		const match = timeStr.match(timeRegex);
		if (!match) {
		    throw new Error("Invalid time format");
		}
		// 提取匹配结果
		const [, hours, minutes, seconds, milliseconds] = match;
		
		// 将时分秒毫秒转换为总秒数
		const totalSeconds = (+hours * 3600) + (+minutes * 60) + (+seconds) + (+milliseconds / 1000);
		return totalSeconds;
	}
	
	/**
	* 深度克隆
	* @param { Object } obj 克隆对象
	*/
	static deepClone (obj) {  
		if(typeof obj !== "object" && typeof obj !== 'function') {
			//原始类型直接返回
		    return obj;
		}
		var o = Object.prototype.toString.call(obj) === '[object Array]' ? [] : {}; 
		for(let i in obj) {  
		    if(obj.hasOwnProperty(i)){ 
		        o[i] = i === 'loader' ? '' : Object.prototype.toString.call( obj[i] ) === '[object XMLHttpRequest]' ? "" : typeof obj[i] === "object" ? YbPlayer.deepClone(obj[i]) : obj[i]; 
		    } 
		} 
		return o;
	}
	
	static isFlvFatalError(errorType, errorDetail, errorInfo) {
	    // HTTP 状态码错误
	    return errorInfo && errorInfo.code && errorInfo.code >= 400
	    // 格式不支持错误
	    const fatalErrors = [
	        'MEDIA_FORMAT_UNSUPPORTED',
	        'MEDIA_CODEC_UNSUPPORTED',
	        'NETWORK_STATUS_CODE_INVALID',
	        'DEMUXER_ERROR'
	    ];
	    return fatalErrors.includes(errorDetail);
	}
	load () {
		this.container.innerHTML =  `
			<div class="yb-player-wrapper" style="height: ${this.height}">
				<div class="yb-player-header"></div>
				<div class="yb-player-controls">
					<div class="yb-player-progress"></div>
					<div class="yb-player-controls-bottom yb-player-hide yb-player-full"></div>
				</div>
				<div class="yb-player-locks yb-player-hide">
					<div class="yb-player-lock yb-player-lock-left">${YbPlayer.lockIcon}</div>
					<div class="yb-player-lock yb-player-lock-right">${YbPlayer.lockIcon}</div>
				</div>
				<div class="yb-player-danmu"></div>
				<div class="yb-player-toast"></div>
				<div class="yb-player-bottom-progress yb-player-hide"></div>
			</div>
		`
		this._bindfullscreenerror = this._fullscreenerror.bind(this)
		this._bindfullscreenchanged = this._fullscreenchanged.bind(this)
		this.container.addEventListener('fullscreenerror', this._bindfullscreenerror);
		this.container.addEventListener('mozfullscreenerror', this._bindfullscreenerror);
		this.container.addEventListener('msfullscreenerror', this._bindfullscreenerror);
		this.container.addEventListener('webkitfullscreenerror', this._bindfullscreenerror);
		this.container.addEventListener('fullscreenchange',  this._bindfullscreenchanged);
		this.container.addEventListener('mozfullscreenchange', this._bindfullscreenchanged);
		this.container.addEventListener('msfullscreenchange', this._bindfullscreenchanged);
		this.container.addEventListener('webkitfullscreenchange', this._bindfullscreenchanged);
	}
	unload () {
		this._clearDanmuTimer()
		this._clearToastTimer()
		this._clearControlsTimer()
		this._removeBackbuttonListener()
		this._event = {}//卸载所有监听事件
		if ( this.container ) {
			this.container.removeEventListener('fullscreenerror', this._bindfullscreenerror);
			this.container.removeEventListener('mozfullscreenerror', this._bindfullscreenerror);
			this.container.removeEventListener('msfullscreenerror', this._bindfullscreenerror);
			this.container.removeEventListener('webkitfullscreenerror', this._bindfullscreenerror);
			this.container.removeEventListener('fullscreenchange', this._bindfullscreenchanged);
			this.container.removeEventListener('mozfullscreenchange', this._bindfullscreenchanged);
			this.container.removeEventListener('msfullscreenchange', this._bindfullscreenchanged);
			this.container.removeEventListener('webkitfullscreenchange', this._bindfullscreenchanged);
			this._bindfullscreenerror = null
			this._bindfullscreenchanged = null
			this.container.innerHTML = '';
			this.container = null;
		}
	}
	/**
	 * 加载视频
	 * @param {String} type 加载类型 init-初始化视频 quality-切换画质 error-错误重加载
	*/
	loadVideo (type = 'init') {
		this.video = YbPlayer.getDecodeType(this.decoder, this.src) == 'jsmpeg' || this.type == 'jsmpeg' ? new YbMpeg() : document.createElement('VIDEO')
		var wrapperEl = this.container.getElementsByClassName('yb-player-wrapper')[0]
		var lockEls = this.container.getElementsByClassName('yb-player-lock')
		var bProgressEl = this.container.getElementsByClassName('yb-player-bottom-progress')[0]
		this.showLoading()
		if ( !this.isLive ) this.loadRange()
		for ( let i = 0; i < lockEls.length; i++ ) {
			lockEls[i].onclick = () => {
				if ( this.disabled ) this.enable()
				else this.disable()
			}
		}
		this.video.oncanplay = () => {
			this.emit('canplay', {
				duration: this.getDuration(),
				videoWidth: this.video.videoWidth,
				videoHeight: this.video.videoHeight,
				type
			})
		}
		this.video.oncanplaythrough = () => {
			this.emit('canplaythrough', {
				duration: this.getDuration(),
				videoWidth: this.video.videoWidth,
				videoHeight: this.video.videoHeight,
				type
			})
		}
		this.video.onloadedmetadata = () => {
			this.hideLoading()
			this.setInnerHTML('yb-player-time', (this.isLive ? '直播中 · ' : '') + '00:00')
			this.setInnerHTML('yb-player-duration', YbPlayer.timeFormat(this.getDuration()))
			//非直播时初始化播放时长
			if ( this.initialTime && !this.isLive ) this.seek(this.initialTime)
			this.emit('loadedmetadata', {
				duration: this.getDuration(),
				videoWidth: this.video.videoWidth,
				videoHeight: this.video.videoHeight,
				type
			})
		}
		this.video.ondurationchange = () => {
			this.setInnerHTML('yb-player-duration', YbPlayer.timeFormat(this.getDuration()))
			this.emit('durationchange', this.getDuration())
		}
		this.video.onloadeddata = () => {
			this.emit('loadeddata', {
				duration: this.getDuration(),
				videoWidth: this.video.videoWidth,
				videoHeight: this.video.videoHeight,
				type
			})
		}
		this.video.onloadstart = () => {
			this.emit('loadstart', { type })
		}
		this.video.onended = () => {
			this.emit('ended', {
				workIndex: this.workIndex
			})
		}
		this.video.onvolumechange = () => {
			var mutedEl = this.container.getElementsByClassName('yb-player-muted')[0]
			if ( mutedEl ) this.video.muted ? mutedEl.classList.add('yb-player-icon-close') : mutedEl.classList.remove('yb-player-icon-close')
			this.emit('mutedchange', this.video.muted)
		}
		this.video.onratechange = () => {
			var playbackRate = this.video.playbackRate
			this.cm?.setConfig('playbackRate', playbackRate)
			this.emit('ratechange', playbackRate)
			this.setInnerHTML('yb-player-header-rate', '倍速x' + playbackRate)
			var rateEl = this.container.getElementsByClassName('yb-player-rate')[0] || document.createElement('DIV')
			if ( ![1, 1.0].includes(playbackRate) ) {
				rateEl.setAttribute('class', 'yb-player-rate')
				rateEl.innerHTML = `
					<div class="yb-player-rate-icon">
						<i></i><i></i><i></i>
					</div>
					<span class="yb-player-rate-span">${playbackRate + '倍速播放中'}</span>
				`
				var wrapperEl = this.container.getElementsByClassName('yb-player-wrapper')[0]
				if ( wrapperEl ) wrapperEl.appendChild(rateEl)
			} else {
				rateEl?.remove()
			}
		}
		this.video.ontimeupdate = () => {
			//如果是直播，需要更新直播时长，initialTime初始播放时长
			if ( !this._isSeeking ) {
				var currentTime = this.isLive ? this.video.currentTime + (this.initialTime || 0) : this.video.currentTime
				this.setInnerHTML('yb-player-time', (this.isLive ? '直播中 · ' : '') + YbPlayer.timeFormat(currentTime))
				var rate = currentTime / this.getDuration()
				var rangeEl = this.container.getElementsByClassName('yb-player-range-box')[0]
				var focusEl = this.container.getElementsByClassName('yb-player-range-focus')[0]
				var thumbEl = this.container.getElementsByClassName('yb-player-range-thumb')[0]
				if ( focusEl ) focusEl.style.width = (rate * 100) + '%'
				if ( thumbEl && rangeEl ) thumbEl.style.transform = `translate(calc(-50% + ${rate*rangeEl.offsetWidth}px), -50%)`
				bProgressEl.style.width = (currentTime / this.getDuration() * 100) + '%'
			}
			//如果自定义最大播放时长，当播放时长大于等于最大播放时长且不是直播时
			if ( this.duration && this.video.currentTime >= this.duration && !this.isLive ) {
				if ( this.loop ) this.seek(0)//开启了循环播放则跳转0秒
				else {//未开启循环播放，则触发暂停，并派发ended事件，模拟视频播放结束事件
					this.video.pause();
					this.emit('ended', {
						workIndex: this.workIndex
					})
				}
			}
			this._clearSeizingTimer()
			this._seizingTimer = window.setTimeout(() => {
				if ( this.video && this.video.src && !this.video.paused ) this.emit('seizing')
			}, 5000)
			this.emit('timeupdate', this.video.currentTime)
		}
		this.video.onplay = () => {
			this.playDanmu()
			this.playSubtitle()
			this.playPano()
			this.setInnerHTML('yb-player-toggle', YbPlayer.pauseIcon)
			this.hideLoading()
			//如果有自定义时长，当播放时长大于等于最大时长时，强制跳转到0秒，模拟视频播放完结束后点击重新播放
			if ( this.duration && this.video.currentTime >= this.duration && !this.isLive ) this.seek(0)
			this.emit('play')
		}
		this.video.onpause = () => {
			this.stopDanmu()
			this.stopSubtitle()
			this.setInnerHTML('yb-player-toggle', YbPlayer.playIcon)
			this.hideLoading()
			this.emit('pause')
		}
		this.video.onseeking = () => {
			this.emit('seeking', this.video.currentTime)
		}
		this.video.onseeked = () => {
			this.seekDanmu(this.video.currentTime)
			this.emit('seeked', this.video.currentTime)
		}
		this.video.onplaying = () => {
			this.playDanmu()
			this.playSubtitle()
			this.hideLoading()
			this.emit('playing')
		}
		this.video.onwaiting = () => {
			this.stopDanmu()
			this.stopSubtitle()
			this.showLoading()
			this.emit('waiting')
		}
		this.video.onprogress = () => {
			var bufferer = this.video.buffered
			if (bufferer.length > 0) {
			    var bufferedEnd = bufferer.end(bufferer.length - 1);
			    var duration = this.getDuration();
			    var bufferPercent = (bufferedEnd / duration) * 100;
				var preload = this.container.getElementsByClassName('yb-player-range-preload')[0]
			   if ( preload ) preload.style.width = bufferPercent + '%';
			}
			this.emit('progress')
		}
		this.video.onabort = () => {
			this.showError('播放中断')
			this.unloadVideo()
			this.emit('abort')
		}
		this.video.onerror = (e) => {
			if ( e && e.target.error) { // 网络问题或其他不可恢复的错误
				var code = e.target.error.code
				var errorMsg = ''
				switch(code) {
				    case 1:
				        errorMsg = '视频加载中止，请检查网络连接';
				        break;
				    case 2:
				        errorMsg = '网络错误，请检查网络连接';
				        break;
				    case 3:
				        errorMsg = '视频解码错误，格式可能不受支持';
				        break;
				    case 4:
				        errorMsg = '视频源不支持或地址无效';
				        break;
				}
			    this.showError(errorMsg)
				this.unloadVideo()
			}
			this.emit('error', e)
		}
		//视频长按菜单取消
		this.video.oncontextmenu = function (e) {
			e.preventDefault()
		}
		//设置属性，让video不被劫持
		this.video.setAttribute('x-webkit-airplay', 'allow');
		this.video.setAttribute('webkit-playsinline', true);
		this.video.setAttribute('playsinline', true);
		this.video.setAttribute('x5-video-player-type', 'h5');
		this.video.setAttribute('x5-video-play', true);
		this.video.setAttribute('style', 'width: 100%;height:100%;object-fit:' + this.objectFit)
		this.video.setAttribute('poster', this.poster)
		if ( this.crossOrigin ) this.video.setAttribute('crossOrigin', this.crossOrigin)
		//设置video基础属性
		this.video.autoplay = ['quality', 'error'].includes(type) ? true : this.autoplay//加载类型为切换画质和错误重加载时，需要自动播放，不保证一定能成功
		this.video.loop = this.loop
		this.video.muted = this.muted
		this.video.defaultMuted = this.muted
		this.video.playbackRate = this.playbackRate
		this.video.defaultPlaybackRate = this.playbackRate
		this.video.preload = this.preload
		this.video.controls = false
		this.video.volume = 1
		wrapperEl.insertBefore(this.getVideoElement(), this.container.getElementsByClassName('yb-player-danmu')[0])//将视频插入弹幕容器前方，让弹幕容器层级高于视频
		//如果传入了src，去判断播放链接的类型
		if ( this.src && (!this.decoder[this.type] || this.type == 'auto') ) this.type = YbPlayer.getDecodeType(this.decoder, this.src)
		else if ( this.segments && this.segments.length ) this.type = 'flv'//否则如果传入了segments，解码器直接使用flv
		if ( this.type == 'video' ) this.video.src = this.src
		else this.loadDecoder()//异步加载解码器加载视频链接（此时可以不再管理视频）
		if ( this.three != 'none' ) this.loadPano()//加载3D场景
		else this.loadCustom()//加载自定义配置 如果开启了3D，则不需要主动去加载自定义配置，因为加载完3D场景后会自动去加载一次
	}
	//卸载视频
	unloadVideo () {
		this._clearSeizingTimer()
		this.unloadCustom()
		this.unloadDecoder()
		this.unloadPano()
		if ( this.video ) {
			//判断一下是否是video元素
			this.video.onclick = null
			this.video.onloadedmetadata = null
			this.video.onended = null
			this.video.onvolumechange = null
			this.video.ontimeupdate = null
			this.video.onplay = null
			this.video.onpause = null
			this.video.onseeked = null
			this.video.onplaying = null
			this.video.onwaiting = null
			this.video.onprogress = null
			this.video.onerror = null
			this.video.oncontextmenu = null
			this.video.pause()
			//移除src 释放视频资源
			this.video.removeAttribute('src')
			this.video.load()
			this.video.remove()
			this.video = null
		}
		this.unloadRange()
	}
	
	//加载解码器
	async loadDecoder () {
		if ( !this.type ) this.type = YbPlayer.getDecodeType(this.decoder, this.src)
		if ( !this.type ) this.type = await YbPlayer.checkWithHls(this.decoder.hls.loader, this.src)
		if ( !this.type ) this.type = await YbPlayer.checkWithFlv(this.decoder.flv.loader, this.src)
		if ( this.type == 'hls' ) {
			var loader = this.decoder[this.type].loader
			var config = this.decoder[this.type].config
			this.hls = new loader(config);
			this.hls.loadSource(this.src);
			this.hls.attachMedia(this.video);
			this.hls.on(loader.Events.ERROR, (e, data) => {
				this.emit('hlserror', {event: e, data})
				if ( data.fatal ) {
					switch (data.type) {
				      case loader.ErrorTypes.NETWORK_ERROR://对于网络相关的错误
				        this.hls.startLoad();
				        break;
				      case loader.ErrorTypes.MEDIA_ERROR://媒体/视频相关错误
				        this.hls.recoverMediaError();
				        break;
				      default://不可恢复的错误
				        this.showError()
				        this.unloadVideo()
				        break;
				    }
				}
			});
		} else if ( this.type == 'flv' ) {
			var loader = this.decoder[this.type].loader
			var config = this.decoder[this.type].config || {}
			this.flv = loader.createPlayer(
				{
					type: "flv",
					isLive: this.isLive,
					url: this.src,
					segments: this.segment && this.segments.length ? this.segment : null,
					...config
				},
				{
					enableWorker: false, //不启用分离线程
					enableStashBuffer: false, //关闭IO隐藏缓冲区
					isLive: this.isLive,
					lazyLoad: false,
					...config
				}
			)
			this.flv.on('error', (errorType, errorDetail, errorInfo) => {
				this.emit('flverror', {errorType, errorDetail, errorInfo})
				if (YbPlayer.isFlvFatalError(errorType, errorDetail, errorInfo)) {
				    this.showError()
					this.unloadVideo()
				}
			});
			this.flv.attachMediaElement(this.video);
			this.flv.load()
		} else if ( this.type == 'jsmpeg' ) {
			var loader = this.decoder[this.type].loader
			var config = this.decoder[this.type].config || {}
			this.video.setDecoder(loader)
			this.video.setConfig({...config,
				loop: this.loop,
				autoplay: this.autoplay,
				poster: this.poster,
				muted: this.muted
			})
			this.video.src = this.src
			this.video.load()
		} else {
			this.showError('解码失败')
			this.unloadVideo()
		}
	}
	//卸载解码器
	unloadDecoder () {
		if (this.hls) {
			this.hls.destroy();
			this.hls = null;
		}
		if ( this.flv ) {
			this.flv.pause();
			this.flv.unload();
			this.flv.detachMediaElement();
			this.flv.destroy();
			this.flv = null;
		}
	}
	
	//加载3D场景
	loadPano () {
		this.pano = new YbPano(this, this.custom.pano || {})
		this.pano.init()
		//当前视频正在播放，需要同步播放3D
		if ( this.video && !this.video.paused ) this.playPano()
		//加载3D后需要重新loadCustom
		this.unloadCustom()
		this.loadCustom()
		if ( !this.gesture ) return
		var controlsType = this.pano.getControlsType()
		if ( controlsType == 'orbit' ) this.disableGesture()
		else this.enableGesture()
	}
	//卸载3D场景
	unloadPano () {
		if ( this.pano ) {
			this.pano.dispose()
			this.pano = null
			//卸载3D模式后后需要重新loadCustom
			this.unloadCustom()
			this.loadCustom()
			
			//开启手势事件
			this.enableGesture()
		}
	}
	//播放3D
	playPano () {
		var panoEl = this.container.getElementsByClassName('yb-player-pano')[0]
		if ( panoEl && panoEl.style.visibility != 'visible' ) {
			panoEl.style.visibility = 'visible'
			//加载视频纹理
			this.pano && this.pano.createVideoSphere()
		}
		this.pano && this.pano.animate()
	}
	//刷新3D场景
	refreshPano () {
		if ( !this.pano ) return
		this.pano.updateSize(); //重置大小
	}
	
	//加载弹幕
	loadDanmu () {
		if ( this.video ) {
			var config = Object.assign({}, {
				show: true,
				speed: 1,
				timeDiffrence: 0,
				overlap: true,
				fontScale: 1,
				fontSize: 18,
				opacity: 1.0,
				color: '#ffffff',
				overlap: false,
				disableScroll: false,//关闭滚动弹幕
				disableTop: false,//关闭顶端弹幕
				disableBottom: false,//关闭底端弹幕
				disableFilter: false//关闭弹幕过滤
			}, this.custom.danmu || {})
			this.custom.danmu = config
			this.cm = new YbDanmu(
				this.container.getElementsByClassName('yb-player-danmu')[0],
				YbPlayer.deepClone(this.danmu || []),
				config
			);
			this.cm.load()
			if ( this.video.currentTime > 0 ) this.seekDanmu(this.video.currentTime)
			if ( !this.video.paused ) this.playDanmu()
			//加载弹幕后需要重新loadCustom
			this.unloadCustom()
			this.loadCustom()
			if ( config.show ) this.showDanmu()
			else this.hideDanmu()
		}
	}
	//卸载弹幕
	unloadDanmu () {
		if ( this.cm ) {
			this.stopDanmu()
			this.cm.unload()
			this.cm = null
			//卸载弹幕后需要重新loadCustom
			this.unloadCustom()
			this.loadCustom()
		}
	}
	//展示弹幕
	showDanmu () {
		if( this.cm ) {
			this.cm.show()
			var danmuVisibleEl = this.container.getElementsByClassName('yb-player-danmu-visible')[0]
			danmuVisibleEl.classList.remove('yb-player-icon-close')
		}
	}
	//隐藏弹幕
	hideDanmu () {
		if ( this.cm ) {
			this.cm.hide()
			var danmuVisibleEl = this.container.getElementsByClassName('yb-player-danmu-visible')[0]
			danmuVisibleEl.classList.add('yb-player-icon-close')
		}
	}
	/**
	* 发送并显示弹幕
	* @param { Object|String } danmu 弹幕内容
	* @param { Boolean } border 使用边框
	*/
	sendDanmu (danmu, border) {
		if ( !this.cm ) return
		var time = this.video.currentTime
		danmu = typeof danmu == 'string' ? {text: danmu} : danmu
		var obj = {time, color: '#ffffff', ...danmu}
		if ( this.danmu ) this.danmu.push(obj)
		this.cm.send(obj, border)
		this.emit('danmusend', obj)
	}
	/**
	* 插入弹幕数据
	* @param { Object|String } danmu 弹幕内容
	*/
	insertDanmu (danmu) {
		if ( !this.cm ) return
		var time = this.video.currentTime
		danmu = typeof danmu == 'string' ? {text: danmu} : danmu
		var obj = {time, color: '#ffffff', ...danmu}
		if ( this.danmu ) this.danmu.push(obj)
		this.cm.insert(obj)
	}
	//播放弹幕
	playDanmu () {
		this._clearDanmuTimer()
		if ( this.cm ) this.cm.play();
		this._danmuTimer = window.setInterval(() => {
			this.cm && this.cm.time(this.video.currentTime)
		}, 100)
	}
	//暂停弹幕
	stopDanmu () {
		this._clearDanmuTimer()
		if ( this.cm ) this.cm.pause();
	}
	//跳转弹幕
	seekDanmu (time) {
		// if ( this.cm ) this.cm.goto(time * 1000)
		this.cm && this.cm.seek(time)
	}
	//刷新弹幕
	refreshDanmu () {
		if ( !this.cm ) return
		if(this._danmuRefreshtimer) { clearTimeout(this._danmuRefreshtimer); this._danmuRefreshtimer = null };
		this._danmuRefreshtimer = window.setTimeout(() => {
		    this.cm.refresh(); //重置弹幕舞台大小
		},200)
	}
	
	//加载字幕
	async loadSubtitle () {
		this.subtitle = await YbSubtitle.init(this, this.subtitles[this.subtitleIndex].src, this.custom.subtitle || {})
		if ( this.video && !this.video.paused ) this.playSubtitle()
	}
	//卸载字幕
	unloadSubtitle () {
		this.subtitle && this.subtitle.unload()
	}
	//播放字幕
	playSubtitle () {
		this.subtitle && this.subtitle.play()
	}
	//暂停字幕
	stopSubtitle () {
		this.subtitle && this.subtitle.pause()
	}
	
	//展示蒙层避免误操作
	showMask () {
		var wrapperEl = this.container.getElementsByClassName('yb-player-wrapper')[0]
		if ( wrapperEl ) {
			var maskEl = document.createElement('DIV')
			maskEl.setAttribute('class','yb-player-mask')
			maskEl.onclick = () => {
				this.hideToolbar()
				this.hidePopup()
			}
			wrapperEl.appendChild(maskEl)//加入蒙层
		}
	}
	//隐藏蒙层
	hideMask () {
		var maskEls = this.container.querySelectorAll('.yb-player-mask')
		maskEls.forEach(t => t.remove())
	}
	
	/**
	* 展示工具栏
	* @param {String} selector 选择器
	* @param {Array} list 工具栏列表
	* @param {Boolean} isCheck 是否展示选择框
	* @param {Number} checkIndex 选择框索引
	*/
	showToolbar (selector, list, isCheck, checkIndex) {
		var wrapperEl = this.container.getElementsByClassName('yb-player-wrapper')[0]
		if ( wrapperEl ) {
			this.showMask()
			var toolbarEl = document.createElement('DIV')
			toolbarEl.setAttribute('class', 'yb-player-toolbar')
			list.forEach((item, key) => {
				toolbarEl.innerHTML += isCheck ? `
					<div class="yb-player-toolbar-item">
						<span>${item.text}</span>
						<span class="yb-player-check${checkIndex == key ? ' yb-player-check-active' : ''}"></span>
					</div>
				` : `<div class="yb-player-toolbar-item">${item.text}</div>`
			})
			var children = toolbarEl.children || []
			for ( let i = 0; i < children.length; i++ ) {
				children[i].onclick = () => { 
					this.hideToolbar();
					list[i].click()
				}
			}
			toolbarEl.setAttribute('style', 'visibility:hidden')//隐藏工具栏
			wrapperEl.appendChild(toolbarEl)//先插入不显示的工具栏，因为需要计算工具栏尺寸
			var element = this.container.querySelector(selector)//获取点击选择器
			var rect = element.getBoundingClientRect()//获取点击元素的尺寸布局信息
			var boxWidth = this.container.offsetWidth
			var boxHeight = this.container.offsetHeight
			var top = rect.top + rect.height//计算顶部定位
			var left = rect.left//计算左边定位
			var right = boxWidth - rect.right//计算右边定位
			var bottom = boxHeight - rect.bottom + rect.height//计算底部定位
			var isTop = true//是否定位顶部 true-定位顶部 false-定位底部
			var isLeft = true//是否定位左边 true-定位左边 false-定位右边
			if ( top > boxHeight / 2 ) isTop = false//判断点击元素是否在盒子上半部
			if ( left + toolbarEl.offsetWidth > boxWidth ) isLeft = false//判断定位左边时，工具栏是否超出container
			toolbarEl.setAttribute('style', `${isTop ? 'top:' + top + 'px' : 'bottom:' + bottom + 'px'};${isLeft ? 'left:' + left + 'px' : 'right:' + right + 'px'};transform-origin:${isTop ? 'top' : 'bottom'} ${isLeft ? 'left' : 'right'}`)
			toolbarEl.style.maxHeight = (isTop ? boxHeight - top : boxHeight - bottom) + 'px'//设置工具栏最大高度，避免超出容器后无法滚动内容
			wrapperEl.removeChild(toolbarEl)//移除工具栏（因为需要动画效果，所以先移除，再添加）
			wrapperEl.appendChild(toolbarEl)//再添加工具栏
		}
	}
	//隐藏工具栏
	hideToolbar () {
		this.hideMask()
		var toolbarEls = this.container.querySelectorAll('.yb-player-toolbar')
		toolbarEls.forEach(t => t.remove())
	}
	
	/**
	* 展示弹窗
	* @param {String} title 弹窗标题
	* @param {HtmlElement} dom 弹窗内容
	* @param {String} mode 弹窗方向 center-中间弹窗
	*/
	showPopup (title, dom, mode) {
		var wrapperEl = this.container.getElementsByClassName('yb-player-wrapper')[0]
		if ( wrapperEl ) {
			this.showMask()
			var popupEl = document.createElement('DIV')
			var popupDirection = ''
			if ( mode == 'center' ) {
				popupDirection = 'yb-player-popup-center'
			} else {
				var boxWidth = this.container.offsetWidth
				var boxHeight = this.container.offsetHeight
				var rate = boxWidth / boxHeight
				popupDirection = rate > 1 ? 'yb-player-popup-landscape' : 'yb-player-popup-portrait'
			}
			popupEl.setAttribute('class', 'yb-player-popup ' + popupDirection)
			popupEl.innerHTML = `
				<div class="yb-player-popup-title">${title}</div>
				<span class="yb-player-popup-close"></span>
				<div class="yb-player-popup-content"></div>
			`
			var contentEl = popupEl.getElementsByClassName('yb-player-popup-content')[0]
			contentEl.appendChild(dom)
			var closeEl = popupEl.getElementsByClassName('yb-player-popup-close')[0]
			closeEl.onclick = () => {
				this.hidePopup()
			}
			wrapperEl.appendChild(popupEl)
		}
	}
	//隐藏弹窗
	hidePopup () {
		this.hideMask()
		var popupEls = this.container.querySelectorAll('.yb-player-popup')
		popupEls.forEach(p => p.remove())
	}
	
	//插入元素
	appendDom (dom) {
		var wrapperEl = this.container.getElementsByClassName('yb-player-wrapper')[0]
		wrapperEl.appendChild(dom)
	}
	
	//移除元素
	removeDom (dom) {
		var wrapperEl = this.container.getElementsByClassName('yb-player-wrapper')[0]
		wrapperEl.removeChild(dom)
	}
	
	showMoreSetting () {
		var header = this.custom.header || {}
		var more = YbPlayer.deepClone(header.more || [])
		if ( !header.disableLock ) {
			more.unshift({
				text: '锁定屏幕',
				click: () => {
					if ( this.disabled ) this.enable()
					else this.disable()
				}
			})
		}
		if ( !header.disableThreeCapture && this.three != 'none' ) {
			more.unshift({
				text: '渲染截图',
				click: () => {
					this.capture('three')
				}
			})
		}
		if ( !header.disableCapture ) {
			more.unshift({
				text: '视频截图',
				click: () => {
					this.capture()
				}
			})
		}
		if ( this.cm && !header.disableDanmuFilter && this.getFullscreen() ) {
			more.unshift({
				text: '弹幕过滤',
				click: () => {
					if ( this.getPopup() ) this.hidePopup()
					this.showDanmuFilter()
				}
			})
		}
		if ( this.cm && !header.disableDanmuSetting && this.getFullscreen() ) {
			more.unshift({
				text: '弹幕设置',
				click: () => {
					if ( this.getPopup() ) this.hidePopup()
					this.showDanmuSetting()
				}
			})
		}
		this.showToolbar('.yb-player-more', more)
	}
	
	//展示画质列表
	showQuality () {
		var qualityName = this.custom.quality?.name || '画质'
		var list = this.quality.map((q, k) => {
			return {
				text: q.title,
				click: () => {
					this.initialTime = this.video.currentTime
					this.src = q.src
					this.type = q.type
					this.stopDanmu()
					this.unloadVideo()
					this.loadVideo('quality')
					this.hideControls()
					this.showToast('切换' + qualityName + '到' + q.title)
					this.emit('qualitychange', {index: k, detail: q})//派发更改事件，以便开发者外部记录
				}
			}
		})
		var index = this.quality.findIndex(q => q.src == this.src)
		this.showToolbar('.yb-player-quality', list, true, index)
	}
	//展示字幕列表
	showSubtitle () {
		var list = this.subtitles.map((s, k)=> {
			return {
				text: s.title,
				click: () => {
					this.subtitleIndex = k
					var subtitleEl = this.container.getElementsByClassName('yb-player-subtitle')[0]
					subtitleEl.classList.remove('yb-player-icon-close')
					subtitleEl.innerHTML = s.title
					this.unloadSubtitle()
					this.loadSubtitle()
					this.emit('subtitlechange', {index: k, detail: s})//派发字幕更改事件，以便开发者外部记录
				}
			}
		})
		list.push({
			text: '关闭字幕',
			click: () => {
				this.subtitleIndex = -1
				var subtitleEl = this.container.getElementsByClassName('yb-player-subtitle')[0]
				subtitleEl.classList.add('yb-player-icon-close')
				subtitleEl.innerHTML = '字幕'
				this.unloadSubtitle()
				this.emit('subtitlechange', {index: this.subtitleIndex})//派发字更改事件，以便开发者外部记录
			}
		})
		var index = this.subtitleIndex == -1 ? list.length - 1 : this.subtitleIndex
		this.showToolbar('.yb-player-subtitle', list, true, index)
	}
	//展示倍速播放选项
	showPlaybackRate () {
		var arr = [{
			text: '0.5倍速',
			value: 0.5
		},{
			text: '正常倍速',
			value: 1
		},{
			text: '1.5倍速',
			value: 1.5
		},{
			text: '1.75倍速',
			value: 1.75
		},{
			text: '2倍速',
			value: 2
		},{
			text: '3倍速',
			value: 3
		}]
		var list = arr.map((a, k)=> {
			return {
				text: a.text,
				click: () => {
					this.hideToolbar()
					if ( this.video ) this.video.playbackRate = a.value
				}
			}
		})
		var index = arr.findIndex(a => a.value == this.video.playbackRate)
		this.showToolbar('.yb-player-header-rate', list, true, index)
	}
	
	//展示3D模式选项
	showThree () {
		var arr = [{
			label: '关闭3D',
			value: 'none'
		},{
			label: '360全景',
			value: '360'
		}]
		var list = arr.map((a, k) => {
			return {
				text: a.label,
				click: () => {
					this.three = a.value
					var headerThreeEl = this.container.getElementsByClassName('yb-player-header-three')[0]
					if ( a.value == 'none' ) this.unloadPano()
					else this.loadPano()
					this.hideControls()//隐藏一次控制栏，否则控制栏显示会异常
					this.setInnerHTML('yb-player-header-three', a.label)
					this.emit('threechange', a)//派发更改事件，以便开发者外部记录
				}
			}
		})
		var index = arr.findIndex(a => a.value == this.three)
		this.showToolbar('.yb-player-header-three', list, true, index)
	}
	
	//展示全景视频控制器类型列表
	showPanoControls () {
		var arr = [{
			label: '陀螺仪',
			value: 'orientation'
		},{
			label: '滑动',
			value: 'orbit'
		},{
			label: '关闭',
			value: 'close'
		}]
		var list = arr.map((a, k) => {
			return {
				text: a.label,
				click: () => {
					var panoControlEl = this.container.getElementsByClassName('yb-player-pano-controls')[0]
					var item = a//记录当前点击类型
					if ( a.value == 'close' ) {
						if ( panoControlEl ) panoControlEl.classList.add('yb-player-icon-close')
						this.pano && this.pano.unloadControls()//卸载3D控制器
						this.showToast('关闭动画传感器')
						this.setInnerHTML('yb-player-pano-controls', '传感器')
					} else {
						if ( panoControlEl ) panoControlEl.classList.remove('yb-player-icon-close')
						this.showToast('切换动画传感器类型为' + a.label)
						this.pano && this.pano.setControlsType(a.value)
						//这里需要实时获取控制器类型，因为陀螺仪可能会开启失败
						const controlsType = this.pano.getControlsType()
						const index = arr.findIndex(item => item.value == controlsType)
						if ( index > -1 ) item = arr[index]
						this.setInnerHTML('yb-player-pano-controls', item.label)
					}
					if ( item.value == 'orbit' ) this.disableGesture()//禁用手势事件
					else this.enableGesture()//开启手势事件
					this.emit('panocontrolschange', item)//派发更改事件，以便开发者外部记录
				}
			}
		})
		var controlsType = this.pano.getControlsType()//获取传感器类型
		var index = arr.findIndex(a => a.value == controlsType)
		this.showToolbar('.yb-player-pano-controls', list, true, index)
	}
	
	//展示分P列表
	showWorks () {
		this.hideControls()
		var list = this.works.map((q, key) => {
			return {
				text: q.title,
				click: () => {
					var activeEl = this.container.getElementsByClassName('yb-player-work-item-active')[0]
					if ( activeEl ) activeEl.classList.remove('yb-player-work-item-active')
					var elementEl = this.container.getElementsByClassName('yb-player-work-item-' + key)[0]
					if ( elementEl ) elementEl.classList.add('yb-player-work-item-active')
					this.workIndex = key
					this.change(key)
				}
			}
		})
		var div = document.createElement('DIV')
		list.forEach((item, key) => {
			div.innerHTML += `
				<div class="yb-player-work-item yb-player-ellipsis yb-player-work-item-${key}${this.workIndex == key ? ' yb-player-work-item-active' : ''}">${item.text}</div>
			`
		})
		var children = div.children || []
		for ( let i = 0; i < children.length; i++ ) {
			children[i].onclick = list[i].click
		}
		var worksName = this.custom.work?.name || '分P'
		this.showPopup(worksName + '列表', div)
		var scrollEl = this.container.getElementsByClassName('yb-player-popup-content')[0]
		var elementEl = this.container.getElementsByClassName('yb-player-work-item-' + this.workIndex)[0];
		if ( elementEl ) scrollEl.scroll({top: elementEl.offsetTop - elementEl.offsetHeight - 10})
	}
	
	showDanmuSetting () {
		this.hideControls()
		var config = YbPlayer.deepClone(this.custom.danmu)
		var div = document.createElement('DIV')
		div.setAttribute('class', 'yb-player-danmu-setting')
		div.innerHTML = `
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">全部显示</span>
				<div class="yb-player-setting-right">
					<span data-visible="1" class="yb-player-setting-switch ${this.getDanmuVisible() ? 'yb-player-setting-switch-active' : ''}">是</span>
					<span data-visible="0" class="yb-player-setting-switch ${!this.getDanmuVisible() ? 'yb-player-setting-switch-active' : ''}">否</span>
				</div>
			</div>
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">滚动显示</span>
				<div class="yb-player-setting-right">
					<span data-scroll="0" class="yb-player-setting-switch ${!config.disableScroll ? 'yb-player-setting-switch-active' : ''}">是</span>
					<span data-scroll="1" class="yb-player-setting-switch ${config.disableScroll ? 'yb-player-setting-switch-active' : ''}">否</span>
				</div>
			</div>
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">顶端显示</span>
				<div class="yb-player-setting-right">
					<span data-top="0" class="yb-player-setting-switch ${!config.disableTop ? 'yb-player-setting-switch-active' : ''}">是</span>
					<span data-top="1" class="yb-player-setting-switch ${config.disableTop ? 'yb-player-setting-switch-active' : ''}">否</span>
				</div>
			</div>
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">底端显示</span>
				<div class="yb-player-setting-right">
					<span data-bottom="0" class="yb-player-setting-switch ${!config.disableBottom ? 'yb-player-setting-switch-active' : ''}">是</span>
					<span data-bottom="1" class="yb-player-setting-switch ${config.disableBottom ? 'yb-player-setting-switch-active' : ''}">否</span>
				</div>
			</div>
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">禁止重叠</span>
				<div class="yb-player-setting-right">
					<span data-overlap="1" class="yb-player-setting-switch ${config.overlap ? 'yb-player-setting-switch-active' : ''}">是</span>
					<span data-overlap="0" class="yb-player-setting-switch ${!config.overlap ? 'yb-player-setting-switch-active' : ''}">否</span>
				</div>
			</div>
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">弹幕过滤</span>
				<div class="yb-player-setting-right">
					<span data-filter="1" class="yb-player-setting-switch ${!config.disableFilter ? 'yb-player-setting-switch-active' : ''}">开</span>
					<span data-filter="0" class="yb-player-setting-switch ${config.disableFilter ? 'yb-player-setting-switch-active' : ''}">关</span>
				</div>
			</div>
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">弹幕速度</span>
				<div class="yb-player-setting-right">
					<div class="yb-player-setting-reduce yb-player-setting-danmu-speed-reduce"></div>
					<span class="yb-player-setting-danmu-speed">${config.speed}</span>
					<div class="yb-player-setting-add yb-player-setting-danmu-speed-add"></div>
				</div>
			</div>
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">透明度</span>
				<div class="yb-player-setting-right">
					<div class="yb-player-setting-reduce yb-player-setting-danmu-opacity-reduce"></div>
					<span class="yb-player-setting-danmu-opacity-percent">${(config.opacity / 1 * 100).toFixed(0)}%</span>
					<div class="yb-player-setting-add yb-player-setting-danmu-opacity-add"></div>
				</div>
			</div>
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">字体大小</span>
				<div class="yb-player-setting-right">
					<div class="yb-player-setting-reduce yb-player-setting-danmu-size-reduce"></div>
					<span class="yb-player-setting-danmu-size">${config.fontScale}倍</span>
					<div class="yb-player-setting-add yb-player-setting-danmu-size-add"></div>
				</div>
			</div>
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">时间差（秒）</span>
				<div class="yb-player-setting-right">
					<div class="yb-player-setting-reduce yb-player-setting-danmu-diffrence-reduce"></div>
					<span class="yb-player-setting-danmu-diffrence">${config.timeDiffrence}秒</span>
					<div class="yb-player-setting-add yb-player-setting-danmu-diffrence-add"></div>
				</div>
			</div>
		`
		var switchEls = div.getElementsByClassName('yb-player-setting-switch')
		var spReduceEl = div.getElementsByClassName('yb-player-setting-danmu-speed-reduce')[0]
		var spAddEl = div.getElementsByClassName('yb-player-setting-danmu-speed-add')[0]
		var spEl = div.getElementsByClassName('yb-player-setting-danmu-speed')[0]
		var opReduceEl = div.getElementsByClassName('yb-player-setting-danmu-opacity-reduce')[0]
		var opAddEl = div.getElementsByClassName('yb-player-setting-danmu-opacity-add')[0]
		var opPercentEl = div.getElementsByClassName('yb-player-setting-danmu-opacity-percent')[0]
		var sizeReduceEl = div.getElementsByClassName('yb-player-setting-danmu-size-reduce')[0]
		var sizeAddEl = div.getElementsByClassName('yb-player-setting-danmu-size-add')[0]
		var sizeEl = div.getElementsByClassName('yb-player-setting-danmu-size')[0]
		var diffrenceEl = div.getElementsByClassName('yb-player-setting-danmu-diffrence')[0]
		var diReduceEl = div.getElementsByClassName('yb-player-setting-danmu-diffrence-reduce')[0]
		var diAddEl = div.getElementsByClassName('yb-player-setting-danmu-diffrence-add')[0]
		for ( let i = 0; i < switchEls.length; i++ ) {
			switchEls[i].onclick = () => {
				switchEls[i].classList.add('yb-player-setting-switch-active')
				if ( switchEls[i].getAttribute('data-visible') ) {
					for ( let j = 0; j < switchEls.length; j++ ) if ( switchEls[j].getAttribute('data-visible') ) switchEls[j].classList.remove('yb-player-setting-switch-active')
					config.show = switchEls[i].getAttribute('data-visible') == 1
					if ( config.show ) this.showDanmu()
					else this.hideDanmu()
				}
				if ( switchEls[i].getAttribute('data-scroll') ) {
					for ( let j = 0; j < switchEls.length; j++ ) if ( switchEls[j].getAttribute('data-scroll') ) switchEls[j].classList.remove('yb-player-setting-switch-active')
					config.disableScroll = switchEls[i].getAttribute('data-scroll') == 1
					setConfig('disableScroll', config.disableScroll)
				}
				if ( switchEls[i].getAttribute('data-top') ) {
					for ( let j = 0; j < switchEls.length; j++ ) if ( switchEls[j].getAttribute('data-top') ) switchEls[j].classList.remove('yb-player-setting-switch-active')
					config.disableTop = switchEls[i].getAttribute('data-top') == 1
					setConfig('disableTop', config.disableTop)
				}
				if ( switchEls[i].getAttribute('data-bottom') ) {
					for ( let j = 0; j < switchEls.length; j++ ) if ( switchEls[j].getAttribute('data-bottom') ) switchEls[j].classList.remove('yb-player-setting-switch-active')
					config.disableBottom = switchEls[i].getAttribute('data-bottom') == 1
					setConfig('disableBottom', config.disableBottom)
				}
				if ( switchEls[i].getAttribute('data-overlap') ) {
					for ( let j = 0; j < switchEls.length; j++ ) if ( switchEls[j].getAttribute('data-overlap') ) switchEls[j].classList.remove('yb-player-setting-switch-active')
					config.overlap = switchEls[i].getAttribute('data-overlap') == 1
					setConfig('overlap', config.overlap)
				}
				if ( switchEls[i].getAttribute('data-filter') ) {
					for ( let j = 0; j < switchEls.length; j++ ) if ( switchEls[j].getAttribute('data-filter') ) switchEls[j].classList.remove('yb-player-setting-switch-active')
					config.disableFilter = switchEls[i].getAttribute('data-filter') == 1
					setConfig('disableFilter', config.disableFilter)
				}
				switchEls[i].classList.add('yb-player-setting-switch-active')
			}
		}
		spReduceEl.onclick = () => {
			config.speed = config.speed - 1 > 1 ? config.speed - 1 : 1
			spEl.innerHTML = config.speed
			setConfig('speed', config.speed)
		}
		spAddEl.onclick = () => {
			config.speed = config.speed + 1 < 10 ? config.speed + 1 : 10
			spEl.innerHTML = config.speed
			setConfig('speed', config.speed)
		}
		opReduceEl.onclick = () => {
			config.opacity = config.opacity - 0.05 > 0 ? config.opacity - 0.05 : 0
			opPercentEl.innerHTML = (config.opacity / 1 * 100).toFixed(0) + '%'
			setConfig('opacity', config.opacity)
		}
		opAddEl.onclick = () => {
			config.opacity = config.opacity + 0.05 < 1 ? config.opacity + 0.05 : 1
			opPercentEl.innerHTML = (config.opacity / 1 * 100).toFixed(0) + '%'
			setConfig('opacity', config.opacity)
		}
		sizeReduceEl.onclick = () => {
			config.fontScale = config.fontScale - 0.1 > 0 ? config.fontScale - 0.1 : 0.1
			config.fontScale = Number(config.fontScale.toFixed(1))
			sizeEl.innerHTML = config.fontScale + '倍'
			setConfig('fontScale', config.fontScale)
		}
		sizeAddEl.onclick = () => {
			config.fontScale = config.fontScale + 0.1 < 3 ? config.fontScale + 0.1 : 3
			config.fontScale = Number(config.fontScale.toFixed(1))
			sizeEl.innerHTML = config.fontScale + '倍'
			setConfig('fontScale', config.fontScale)
		}
		diReduceEl.onclick = () => {
			config.timeDiffrence = config.timeDiffrence - 1
			diffrenceEl.innerHTML = config.timeDiffrence + '秒'
			setConfig('timeDiffrence', config.timeDiffrence)
		}
		diAddEl.onclick = () => {
			config.timeDiffrence = config.timeDiffrence + 1
			diffrenceEl.innerHTML = config.timeDiffrence + '秒'
			setConfig('timeDiffrence', config.timeDiffrence)
		}
		var _configTimer = null
		var _this = this
		function setConfig (key, value) {
			if ( _configTimer ) {
				window.clearTimeout(_configTimer)
				_configTimer = null
			}
			_configTimer = window.setTimeout(() => {
				_this.custom.danmu = config
				_this.cm?.setConfig(key, value)
				if ( ['timeDiffrence', 'disableScroll', 'disableTop', 'disableBottom', 'fontScale'].includes(key) ) _this.cm?.reset()
				_this.emit('danmuconfigchange', config)//派发弹幕配置更改事件，以便开发者外部记录
			}, 500)
		}
		this.showPopup('弹幕设置', div)
	}
	//展示弹幕过滤设置弹窗
	showDanmuFilter () {
		this.hideControls()
		var config = this.custom.danmu || {}
		var fontSize = config.fontSize
		var div = document.createElement('DIV')
		var type = 'string'
		div.innerHTML = `
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">过滤内容</span>
				<div class="yb-player-setting-right" style="flex:1">
					<input class="yb-player-setting-input yb-player-danmu-filter-text" placeholder="请输入过滤内容"></input>
					<button class="yb-player-setting-mini-btn yb-player-danmu-filter-add" style="margin-left:10px">添加</button>
				</div>
			</div>
			<div class="yb-player-setting-line" style="margin-bottom:10px;">
				<span class="yb-player-setting-label">过滤类型</span>
				<div class="yb-player-setting-right">
					<span data-type="string" class="yb-player-setting-switch yb-player-danmu-filter-type ${type == 'string' ? 'yb-player-setting-switch-active' : ''}">文本</span>
					<span data-type="regex" class="yb-player-setting-switch yb-player-danmu-filter-type ${type == 'regex' ? 'yb-player-setting-switch-active' : ''}">正则</span>
				</div>
			</div>
		`
		var rules = this.cm?.filter?.getRules()
		rules.forEach(pushRuleEl)
		//绑定规则类型点击选择事件
		var typeEls = div.querySelectorAll('.yb-player-danmu-filter-type')
		typeEls.forEach(typeEl => {
			typeEl.onclick = () => {
				typeEls.forEach(el => el.classList.remove('yb-player-setting-switch-active'))
				typeEl.classList.add('yb-player-setting-switch-active')
				type = typeEl.getAttribute('data-type')
			}
		})
		//绑定规则点击添加事件
		var addEl = div.querySelector('.yb-player-danmu-filter-add')
		addEl.onclick = () => {
			var textEl = div.querySelector('.yb-player-danmu-filter-text')
			if ( !textEl.value ) {
				this.showToast('请输入过滤内容')
				return
			}
			if ( this.cm?.filter ) {
				//删除过滤规则
				var rule = {
					pattern: textEl.value,
					type
				}
				if ( !this.cm?.filter.add(rule) ) {
					this.showToast('添加过滤规则内容重复')
					return
				}
				//重置弹幕
				this.cm.reset()
				//绘制规则列表
				pushRuleEl(rule, this.cm?.filter.getRules().length-1)
				//清空文本框
				textEl.value = ''
				this.showToast('成功添加规则')
				//抛出过滤规则增加事件
				this.emit('danmufilteradd', {
					index: this.cm?.filter.getRules().length-1,
					detail: rule
				})
			}
		}
		//绘制规则列表
		var _this = this
		function pushRuleEl (rule, key) {
			var el = document.createElement('DIV')
			el.setAttribute('class', 'yb-player-filter-item')
			el.innerHTML = `
				<span class="yb-player-filter-item-type" style="background-color:${rule.type == 'string' ? 'var(--color-primary)' : 'var(--color-warning)'}">${rule.type == 'string' ? '文本' : '正则'}</span>
				<span class="yb-player-filter-item-content yb-player-ellipsis">${rule.pattern}</span>
				<button>删除</button>
			`
			var btn = el.getElementsByTagName('button')[0]
			btn.onclick = () => {
				if ( _this.cm?.filter ) {
					//删除过滤规则
					_this.cm?.filter.remove(key)
					//重置弹幕
					_this.cm.reset()
					//抛出过滤规则删除事件
					_this.emit('danmufilterreduce', {
						index: key,
						detail: rule
					})
					_this.showToast('成功删除规则')
				}
				//移除元素
				el.remove()
			}
			div.appendChild(el)
		}
		// var textEl = div.getElementsByClassName('yb-player-danmu-send-textarea')[0]
		// var typeEls = div.getElementsByClassName('yb-player-danmu-send-type')
		// var colorEl = div.getElementsByClassName('yb-player-danmu-send-color')[0]
		// var sizeEl = div.getElementsByClassName('yb-player-setting-danmu-size')[0]
		// var reduceEl = div.getElementsByClassName('yb-player-setting-danmu-size-reduce')[0]
		// var addEl = div.getElementsByClassName('yb-player-setting-danmu-size-add')[0]
		// var btnEl = div.getElementsByClassName('yb-player-danmu-send-btn')[0]
		// for ( let i = 0; i < typeEls.length; i++ ) {
		// 	typeEls[i].onclick = () => {
		// 		for ( let j = 0; j < typeEls.length; j++ ) typeEls[j].classList.remove('yb-player-setting-switch-active')
		// 		typeEls[i].classList.add('yb-player-setting-switch-active')
		// 		mode = typeEls[i].getAttribute('data-type')
		// 	}
		// }
		// textEl.oninput = () => {
		// 	textEl.style.height = textEl.scrollHeight > 100 ? 100 : textEl.scrollHeight < 35 ? 35 : textEl.scrollHeight
		// }
		// reduceEl.onclick = () => {
		// 	fontSize = fontSize - 1 > 14 ? fontSize - 1 : 14
		// 	sizeEl.innerHTML = fontSize
		// }
		// addEl.onclick = () => {
		// 	fontSize = fontSize + 1 < 30 ? fontSize + 1 : 30
		// 	sizeEl.innerHTML = fontSize
		// }
		// btnEl.onclick = () => {
		// 	if ( !textEl.value ) {
		// 		this.showToast('请输入弹幕内容')
		// 		return
		// 	}
		// 	this.sendDanmu({
		// 		mode,
		// 		text: textEl.value,
		// 		color: colorEl.value,
		// 		fontSize: fontSize
		// 	}, true)
		// 	this.hidePopup()
		// }
		this.showPopup('弹幕过滤', div)
	}
	//展示弹幕发送弹窗
	showDanmuSend () {
		if ( this.video ) this.video.pause()
		this.hideControls()
		var config = this.custom.danmu || {}
		var fontSize = config.fontSize
		var div = document.createElement('DIV')
		var mode = 1
		var boxWidth = this.container.offsetWidth
		div.setAttribute('style', 'width:' + boxWidth * (7 / 10) + 'px')
		div.innerHTML = `
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">弹幕内容</span>
				<textarea class="yb-player-danmu-send-textarea yb-player-setting-input" placeholder="请输入弹幕内容"></textarea>
			</div>
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">弹幕类型</span>
				<div class="yb-player-setting-right">
					<span data-type="1" class="yb-player-setting-switch yb-player-danmu-send-type ${mode == 1 ? 'yb-player-setting-switch-active' : ''}">滚动</span>
					<span data-type="5" class="yb-player-setting-switch yb-player-danmu-send-type ${mode == 5 ? 'yb-player-setting-switch-active' : ''}">顶端</span>
					<span data-type="4" class="yb-player-setting-switch yb-player-danmu-send-type ${mode == 4 ? 'yb-player-setting-switch-active' : ''}">底端</span>
				</div>
			</div>
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">弹幕大小</span>
				<div class="yb-player-setting-right">
					<div class="yb-player-setting-reduce yb-player-setting-danmu-size-reduce"></div>
					<span class="yb-player-setting-danmu-size">${fontSize}</span>
					<div class="yb-player-setting-add yb-player-setting-danmu-size-add"></div>
				</div>
			</div>
			<div class="yb-player-setting-line">
				<span class="yb-player-setting-label">弹幕颜色</span>
				<div class="yb-player-setting-right">
					<input class="yb-player-danmu-send-color" type="color" value="${config.color}">
				</div>
			</div>
			<div class="yb-player-danmu-send-btn">发送</div>
		`
		var textEl = div.getElementsByClassName('yb-player-danmu-send-textarea')[0]
		var typeEls = div.getElementsByClassName('yb-player-danmu-send-type')
		var colorEl = div.getElementsByClassName('yb-player-danmu-send-color')[0]
		var sizeEl = div.getElementsByClassName('yb-player-setting-danmu-size')[0]
		var reduceEl = div.getElementsByClassName('yb-player-setting-danmu-size-reduce')[0]
		var addEl = div.getElementsByClassName('yb-player-setting-danmu-size-add')[0]
		var btnEl = div.getElementsByClassName('yb-player-danmu-send-btn')[0]
		for ( let i = 0; i < typeEls.length; i++ ) {
			typeEls[i].onclick = () => {
				for ( let j = 0; j < typeEls.length; j++ ) typeEls[j].classList.remove('yb-player-setting-switch-active')
				typeEls[i].classList.add('yb-player-setting-switch-active')
				mode = typeEls[i].getAttribute('data-type')
			}
		}
		textEl.oninput = () => {
			textEl.style.height = textEl.scrollHeight > 100 ? 100 : textEl.scrollHeight < 35 ? 35 : textEl.scrollHeight
		}
		reduceEl.onclick = () => {
			fontSize = fontSize - 1 > 14 ? fontSize - 1 : 14
			sizeEl.innerHTML = fontSize
		}
		addEl.onclick = () => {
			fontSize = fontSize + 1 < 30 ? fontSize + 1 : 30
			sizeEl.innerHTML = fontSize
		}
		btnEl.onclick = () => {
			if ( !textEl.value ) {
				this.showToast('请输入弹幕内容')
				return
			}
			this.sendDanmu({
				mode,
				text: textEl.value,
				color: colorEl.value,
				fontSize: fontSize
			}, true)
			this.hidePopup()
		}
		this.showPopup('发送弹幕', div, 'center')
	}
	
	//加载自定义内容
	loadCustom () {
		//加载自定义进度条栏
		var progressEl = this.container.getElementsByClassName('yb-player-progress')[0]
		if ( progressEl ) {
			var progress = this.custom.progress || {}//获取进度条栏配置
			var lSlots = YbPlayer.deepClone(progress.leftSlots || [])//获取左边插槽
			var rSlots = YbPlayer.deepClone(progress.rightSlots || [])//获取右边插槽
			
			//是否展示播放下一个按钮
			if ( !progress.disableNext && this.works && this.works.length > 0 ) {
				lSlots.unshift({
					innerHTML: `<span class="yb-player-next yb-player-unfull">${this.workIndex < this.works.length - 1 ? YbPlayer.nextIcon : ''}</span>`,
					click: () => {
						this.next()
					}
				})
			}
			if ( !progress.disableToggle ) {
				lSlots.unshift({
					innerHTML: `<span class="yb-player-toggle yb-player-unfull">${this.video.paused ? YbPlayer.playIcon : YbPlayer.pauseIcon}</span>`,
					click: () => {
						this.toggle()
					}
				})
			}
			//是否展示播放上一个按钮
			if ( !progress.disablePrev && this.works && this.works.length > 0 ) {
				lSlots.unshift({
					innerHTML: `<span class="yb-player-prev yb-player-unfull">${this.workIndex > 0 ? YbPlayer.prevIcon : ''}</span>`,
					click: () => {
						this.prev()
					}
				})
			}
			lSlots.push({
				innerHTML: `
					<div class="yb-player-progress-center">
						<span class="yb-player-time">${this.isLive ? '直播中 · ' : ''}${typeof this.video.currentTime == 'number' ? YbPlayer.timeFormat(this.video.currentTime) : '开始'}</span>
						${!this.isLive ? `
							<div class="yb-player-range-box">
								<div class="yb-player-range-track"></div>
								<div class="yb-player-range-preload"></div>
								<div class="yb-player-range-focus"></div>
								${!progress.disableRange ? '<div class="yb-player-range-thumb"></div>' : ''}
							</div>
							<span class="yb-player-duration">${this.getDuration() ? YbPlayer.timeFormat(this.getDuration()) : '结束'}</span>
						` : ''}
					</div>
				`,
				click: () => {}
			})
			if ( !progress.disableFullscreen ) {
				rSlots.push({
					innerHTML: `<span class="yb-player-fullscreen">${this.getFullscreen() ? YbPlayer.exitfullIcon : YbPlayer.openfullIcon}</span>`,
					click: () => {
						if ( this.getFullscreen() ) this.exitFullscreen()
						else this.openFullscreen()
					}
				})
			}
			var arr = lSlots.concat(rSlots)
			arr.forEach((item, key) => {
				progressEl.innerHTML += item.innerHTML
			})
			var children = progressEl.children
			for ( let i = 0; i < children.length; i++ ) {
				children[i].onclick = arr[i].click
				//如果标记了非全屏元素，则在全屏时需要隐藏
				if ( children[i].classList.contains('yb-player-unfull') && this.getFullscreen() ) {
					children[i].classList.add('yb-player-hide')
				}
			}
			//是否关闭进度条拖动
			if ( !progress.disableRange ) this.loadRange()
		}
		
		//加载控制栏自定义配置
		var controlsBottomEl = this.container.getElementsByClassName('yb-player-controls-bottom')[0]
		if ( controlsBottomEl ) {
			var controls = this.custom.controls || {}//获取控制栏配置
			var lSlots = YbPlayer.deepClone(controls.leftSlots || [])//获取左边插槽
			var rSlots = YbPlayer.deepClone(controls.rightSlots || [])//获取右边吧插槽
			
			//是否展示播放下一个按钮
			if ( !controls.disableNext && this.works && this.works.length > 0 ) {
				lSlots.unshift({
					innerHTML: `<span class="yb-player-next">${this.workIndex < this.works.length - 1 ? YbPlayer.nextIcon : ''}</span>`,
					click: () => {
						this.next()
					}
				})
			}
			if ( !controls.disableToggle ) {
				lSlots.unshift({
					innerHTML: `<span class="yb-player-toggle">${this.video.paused ? YbPlayer.playIcon : YbPlayer.pauseIcon}</span>`,
					click: () => {
						this.toggle()
					}
				})
			}
			//是否展示播放上一个按钮
			if ( !controls.disablePrev && this.works && this.works.length > 0 ) {
				lSlots.unshift({
					innerHTML: `<span class="yb-player-prev">${this.workIndex > 0 ? YbPlayer.prevIcon : ''}</span>`,
					click: () => {
						this.prev()
					}
				})
			}
			if ( this.cm && !controls.disableDanmuSend ) {
				lSlots.push({
					innerHTML: `<div class="yb-player-danmu-send yb-player-ellipsis">发条弹幕吧</div>`,
					click: () => {
						if ( this.getPopup() ) this.hidePopup()
						else this.showDanmuSend()
					}
				})
			} else {
				lSlots.push({
					innerHTML: `<div style="flex:1"></div>`,
					click: (e) => {
						e.preventDefault()
					}
				})
			}
			//显示手势开启\关闭按钮
			if ( this.pano && !controls.disablePanoControlsType ) {
				var controlsType = this.pano.getControlsType()
				rSlots.push({
					innerHTML: `<span class="yb-player-pano-controls yb-player-icon ${controlsType == 'close' ? ' yb-player-icon-close' : ''}">${controlsType == 'orientation' ? '陀螺仪' : controlsType == 'orbit' ? '滑动' : '传感器'}</span>`,
					click: () => {
						this.showPanoControls()
					}
				})
			}
			//显示画质切换按钮
			if ( this.quality && this.quality.length > 0 && !controls.disableQuality ) {
				var index = this.quality.findIndex(q => q.src == this.src)
				var title = index > -1 ? this.quality[index].title : ''
				var qualityName = this.custom.quality?.name || '画质'
				rSlots.push({
					innerHTML: `<span class="yb-player-quality yb-player-icon">${title || qualityName}</span>`,
					click: () => {
						if ( this.getToolbar() ) this.hideToolbar()
						else this.showQuality()
					}
				})
			}
			//显示字幕切换按钮
			if ( !controls.disableSubtitle && this.subtitles && this.subtitles.length > 0 ) {
				rSlots.push({
					innerHTML: `<span class="yb-player-subtitle yb-player-icon${this.subtitleIndex == -1 ? ' yb-player-icon-close' : ''}">字幕</span>`,
					click: () => {
						if ( this.getToolbar() ) this.hideToolbar()
						else this.showSubtitle()
					}
				})
			}
			//显示弹幕开启\关闭按钮
			if ( this.cm && !controls.disableDanmuVisible ) {
				rSlots.push({
					innerHTML: `<span class="yb-player-danmu-visible yb-player-icon ${this.getDanmuVisible() ? '' : ' yb-player-icon-close'}">弹幕</span>`,
					click: () => {
						if ( this.getDanmuVisible() ) this.hideDanmu()
						else this.showDanmu()
					}
				})
			}
			//显示静音按钮
			if ( !controls.disableMuted ) {
				rSlots.push({
					innerHTML: `<span class="yb-player-muted yb-player-icon ${this.video.muted ? ' yb-player-icon-close' : ''}">${YbPlayer.voiceIcon}</span>`,
					click: () => {
						this.video.muted = !this.video.muted
					}
				})
			}
			var arr = lSlots.concat(rSlots)
			if ( arr.length == 0 ) controlsBottomEl.style.display = 'none'
			arr.forEach((item, key) => {
				controlsBottomEl.innerHTML += item.innerHTML
			})
			var children = controlsBottomEl.children
			for ( let i = 0; i < children.length; i++ ) {
				children[i].onclick = arr[i].click
			}
		}
		
		//加载头部自定义内容
		var heightEl = this.container.getElementsByClassName('yb-player-header')[0]
		if ( heightEl ) {
			var header = this.custom.header || {}//获取头部自定义配置
			var lSlots = YbPlayer.deepClone(header.leftSlots || [])//获取左边插槽
			var rSlots = YbPlayer.deepClone(header.rightSlots || [])//获取右边吧插槽
			//是否开启返回按钮
			if ( !header.disableBack ) {
				lSlots.push({
					innerHTML: `<span class="yb-player-back">${YbPlayer.backIcon}</span>`,
					click: () => {
						if ( this.getFullscreen() ) this.exitFullscreen()
						else this.emit('back')
					}
				})
			}
			//是否开启顶部标题
			if ( !header.disableTitle ) {
				lSlots.push({
					innerHTML: `<span class="yb-player-title yb-player-ellipsis">${this.title}</span>`,
					click: (e) => {
						e.preventDefault()
					}
				})
			}
			//是否开启分P选择
			if ( !header.disableWorks && this.works && this.works.length > 0 ) {
				var worksName = this.custom.work?.name || '分P'
				rSlots.push({
					innerHTML: `<span class="yb-player-header-works yb-player-icon yb-player-full yb-player-hide">${worksName}</span>`,
					click: () => {
						if ( this.getPopup() ) this.hidePopup()
						else this.showWorks()
					}
				})
			}
			//是否开启倍速选择
			if ( !header.disableRate ) {
				rSlots.push({
					innerHTML: `<span class="yb-player-header-rate yb-player-icon">倍速x${(this.video.playbackRate)}</span>`,
					click: () => {
						if ( this.getToolbar() ) this.hideToolbar()
						else this.showPlaybackRate()
					}
				})
			}
			//是否开启3D选择
			if ( header.enableThree ) {
				rSlots.push({
					innerHTML: `<span class="yb-player-header-three yb-player-icon">${this.three == 'none' ? '关闭3D' : this.three}</span>`,
					click: () => {
						if ( this.getToolbar() ) this.hideToolbar()
						else this.showThree()
					}
				})
			}
			//是否展示更多按钮
			if ( !header.disableMore ) {
				rSlots.push({
					innerHTML: `<span class="yb-player-more">${YbPlayer.moreIcon}</span>`,
					click: () => {
						if ( this.getToolbar() ) this.hideToolbar()
						else this.showMoreSetting()
					}
				})
			}
			var arr = lSlots.concat(rSlots)
			arr.forEach((slot, key) => {
				heightEl.innerHTML += slot.innerHTML
			})
			var children = heightEl.children
			for ( let i = 0; i < children.length; i++ ) {
				children[i].onclick = arr[i].click
			}
		}
		
		//加载其它自定义内容
		var slots = YbPlayer.deepClone(this.custom.slots || [])
		var wrapperEl = this.container.getElementsByClassName('yb-player-wrapper')[0]
		if ( slots.length > 0 && wrapperEl ) {
			var slotEl = document.createElement('DIV')
			slotEl.setAttribute('class', 'yb-player-slot')
			slots.forEach((slot, key) => {
				slotEl.innerHTML += slot.innerHTML
			})
			var children = slotEl.children
			for ( let i = 0; i < children.length; i++ ) {
				children[i].onclick = slots[i].click
				if ( slots[i].followControls ) {
					children[i].setAttribute('data-controls', 1)
					if ( !this.getControls() )children[i].classList.add('yb-player-hide')
				}
			}
			wrapperEl.appendChild(slotEl)
		}
		//重新设置一次全屏状态
		this._setFullscreenStatus()
	}
	//卸载自定义
	unloadCustom () {
		//卸载进度条栏自定义内容
		var progressEl = this.container.getElementsByClassName('yb-player-progress')[0]
		this.unloadRange()
		var children = progressEl.children
		for ( let i = 0; i < children.length; i++ ) children[i].onclick = null
		progressEl.innerHTML = ''
		
		//卸底部控制栏自定义内容
		var controlsBottomEl = this.container.getElementsByClassName('yb-player-controls-bottom')[0]
		var children = controlsBottomEl?.childen || []
		for ( let i = 0; i < children.length; i++ ) children[i].onclick = null
		controlsBottomEl.innerHTML = ''
		
		//卸载头部自定义内容
		var heightEl = this.container.getElementsByClassName('yb-player-header')[0]
		var children = heightEl?.childen || []
		for ( let i = 0; i < children.length; i++ ) children[i].onclick = null
		heightEl.innerHTML = ''
		
		//卸载其它自定义内容
		var slotEl = this.container.getElementsByClassName('yb-player-slot')[0]
		var children = slotEl?.children || []
		for ( let i = 0; i < children.length; i++ ) children[i].onclick = null
		slotEl?.remove()
		slotEl = null
	}
	
	//注册手势事件
	loadGestureEvent () {
		this.gesture = new YbGesture(this, this.custom.gesture || {})
		this.gesture.load()
		if ( this.pano ) {//如果开启了3D模式
			var controlsType = this.pano?.getControlsType()
			//判断控制器类型来控制是否禁用手势事件
			if ( controlsType == 'gyro' ) this.enableGesture()
			else this.disableGesture()
		}
	}
	//注销手势事件
	unloadGestureEvent () {
		this.gesture.unload()
		this.gesture = null
	}
	//禁用手势事件
	disableGesture () {
		if ( this.gesture ) this.gesture.disable()
	}
	//启用手势事件
	enableGesture () {
		if ( this.gesture ) this.gesture.enable()
	}
	
	//加载进度条
	loadRange () {
		var progress = this.custom.progress || {}
		var rangeEl = this.container.getElementsByClassName('yb-player-range-box')[0]
		var focusEl = this.container.getElementsByClassName('yb-player-range-focus')[0]
		var thumbEl = this.container.getElementsByClassName('yb-player-range-thumb')[0]
		var timeEl = this.container.getElementsByClassName('yb-player-time')[0]
		var _touchstartX = null
		var _touchstartY = null
		var _rate = null
		var _mousedown = null
		if ( rangeEl ) {
			var touchstart = (e) => {
				if ( !this.video || !this.getDuration() ) return//视频未加载前，进度条禁止拖动
				this.showControls()
				this._isSeeking = true
				var touch = e.touches[0]
				_touchstartX = touch.pageX
				_touchstartY = touch.pageY
				var touchstartX = _touchstartX//根据旋转方向获取
				touchstartX = touchstartX - rangeEl.offsetLeft
				var rangeWidth = rangeEl.offsetWidth
				touchstartX = touchstartX < 0 ? 0 : touchstartX > rangeWidth ? rangeWidth : touchstartX
				setProgress(touchstartX)
			}
			var touchmove = (e) => {
				if ( _touchstartX >= 0 || _touchstartY >= 0 ) {
					this.showControls()
					var touch = e.touches[0]
					var touchmoveX = touch.pageX
					touchmoveX = touchmoveX - rangeEl.offsetLeft
					var rangeWidth = rangeEl.offsetWidth
					touchmoveX = touchmoveX < 0 ? 0 : touchmoveX > rangeWidth ? rangeWidth : touchmoveX
					setProgress(touchmoveX)
				}
			}
			var touchend = (e) => {
				if ( _rate >= 0 ) this.seek(this.getDuration() * _rate)
				_touchstartX = null
				_touchstartY = null
				_rate = null
				this._isSeeking = false
			}
			
			var setProgress = (touchX) => {
				var rangeWidth = rangeEl.offsetWidth
				_rate = touchX / rangeWidth
				focusEl.style.width = (_rate * 100) + '%'
				thumbEl.style.transform = `translate(calc(-50% + ${_rate * rangeWidth}px), -50%)`
				timeEl.innerHTML = YbPlayer.timeFormat(this.getDuration() * _rate)
			}
			
			rangeEl.oncontextmenu = function (event) {
				event.preventDefault()
			}
			rangeEl.ontouchstart = touchstart
			rangeEl.ontouchmove = touchmove
			rangeEl.ontouchend = touchend
			rangeEl.ontouchcancel = touchend
			rangeEl.onmousedown = function (e) {
				if ( 'ontouchstart' in window || (window.DocumentTouch && document instanceof DocumentTouch) ) return//设备支持触屏则不触发mousedown
				_mousedown = true
				touchstart({touches: [{pageX: e.pageX, pageY: e.pageY}]})
			}
			rangeEl.onmousemove = function (e) {
				if ( !_mousedown ) return
				touchmove({touches: [{pageX: e.pageX, pageY: e.pageY}]})
			}
			rangeEl.onmouseup = function (e) {
				if ( !_mousedown ) return
				_mousedown = false
				touchend({touches: [{pageX: e.pageX, pageY: e.pageY}]})
			}
		}
	}
	
	//卸载进度条
	unloadRange () {
		var rangeEl = this.container.getElementsByClassName('yb-player-range-box')[0]
		if ( rangeEl ) {
			rangeEl.oncontextmenu = null
			rangeEl.ontouchstart = null
			rangeEl.ontouchmove = null
			rangeEl.ontouchend = null
			rangeEl.ontouchcancel = null
			rangeEl.onmousedown = null
			rangeEl.onmousemove = null
			rangeEl.onmouseup = null
		}
	}
	
	//注册事件监听
	on (event, callback) {
		this._event[event] = callback
	}
	//注销事件监听
	off (event) {
		this._event[event] = null
		var obj = {}
		Object.keys(this._event).forEach(key => {
			if ( this._event[key] ) obj[key] = this._event[key]
		})
		this._event = obj
	}
	/**
	 * 主动触发事件
	 * @param {String} event 事件名称
	 * @param {Any} data 传递参数
	*/
	emit (event, data) {
		var handle = this._event[event]
		handle && handle(data)
		var arg = {}
		arg[event] = ['undefined', 'null'].includes(typeof data) ? true : data
		YbPlayer.postMessage(arg)
	}
	//动态修改video配置
	setVideo (key, value) {
		if ( this.video ) this.video[key] = value
	}
	//动态主要配置
	setConfig (key, value) {
		Object.keys(this).forEach(k => {
			if ( k == key ) this[k] = value
		})
	}
	//动态手势事件配置
	setGesture (key, value) {
		this.custom.gesture[key] = value
		this.gesture.setConfig(key, value)
	}
	//动态字幕配置
	setSubtitle (key, value) {
		this.custom.subtitle[key] = value
		this.subtitle.setConfig(key, value)
	}
	//弹幕动态配置，动态改变需要重新装载弹幕
	setDanmu (key, value) {
		this.custom.danmu[key] = value
		this.cm.setConfig(key, value)
	}
	//自定义动态配置，动态改变该配置需要unloadCustom再loadCustom
	setCustom (key, value) {
		this.custom[key] = value
	}
	/**
	 * 设置元素内容
	 * @param selector 选择器
	 * @param content 修改的内容
	*/
	setInnerHTML (selector, content) {
		var dom = this.container.getElementsByClassName(selector)
		if ( dom && dom.length > 0 ) {
			if ( dom.length > 1 ) for ( let i = 0; i < dom.length; i++ ) dom[i].innerHTML = content
			else dom[0].innerHTML = content
		}
	}
	//获取是否加载错误
	getError () {
		return this.container.getElementsByClassName('yb-player-error')[0]
	}
	//获取是否在加载中
	getLoading () {
		return this.container.getElementsByClassName('yb-player-loading')[0]
	}
	//获取是否全屏
	getFullscreen () {
		return document.fullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || document.webkitFullscreenElement || this.container.classList.contains('yb-player-openfull')
	}
	//获取全屏类型
	getFullscreenType () {
		return (document.fullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || document.webkitFullscreenElement) ? 'api' : 'css'
	}
	//获取控制栏是否显示中
	getControls () {
		var controlsEl = this.container.getElementsByClassName('yb-player-controls')[0]
		var locksEl = this.container.getElementsByClassName('yb-player-locks')[0]
		return controlsEl.classList.contains('yb-player-controls-show') || !locksEl.classList.contains('yb-player-hide')
	}
	//获取弹幕是否显示
	getDanmuVisible () {
		return this.cm?.getVisible()
	}
	//是否有工具栏正在显示
	getToolbar () {
		return this.container.getElementsByClassName('yb-player-toolbar')[0]
	}
	//是否有弹窗正在显示
	getPopup () {
		return this.container.getElementsByClassName('yb-player-popup')[0]
	}
	//获取播放时长
	getDuration () {
		return this.video ? this.duration ? Math.min(this.duration, this.video.duration) : this.video.duration : 0
	}
	//获取video元素对象
	getVideoElement () {
		return this.video?.canvas ? this.video?.canvas : this.video
	}
	
	//开启锁屏
	disable () {
		this.disabled = true
		this.hideControls()
		this.showControls()
		var llockEL = this.container.getElementsByClassName('yb-player-lock-left')[0]
		var rlockEL = this.container.getElementsByClassName('yb-player-lock-right')[0]
		llockEL.innerHTML = YbPlayer.lockIcon
		rlockEL.innerHTML = YbPlayer.lockIcon
	}
	//解开锁屏
	enable () {
		this.disabled = false
		this.showControls()
		var llockEL = this.container.getElementsByClassName('yb-player-lock-left')[0]
		var rlockEL = this.container.getElementsByClassName('yb-player-lock-right')[0]
		llockEL.innerHTML = YbPlayer.unlockIcon
		rlockEL.innerHTML = YbPlayer.unlockIcon
	}
	
	/**
	* 截图
	* @param {String} type 截图类型 video-使用video元素截图 three-将3D元素截图
	*/
	capture (type = 'video') {
		var element = type == 'video' ? this.getVideoElement() : this.container.getElementsByClassName('yb-player-pano')[0].children[0]
		if ( !element ) {
			this.showToast('视频还未加载')
			return
		}
		this.hideControls()
		this.video.pause()
		var canvas = document.createElement('canvas');
		canvas.width = type == 'video' ? this.video.videoWidth : element.offsetWidth;
		canvas.height = type == 'video' ? this.video.videoHeight : element.offsetHeight;
		canvas.getContext('2d').drawImage(element, 0, 0, canvas.width, canvas.height);
		try{
			canvas.toBlob(blob => {
				var base64 = canvas.toDataURL('image/jpg')
				var captureData = {
					blob: blob,
					base64
				}
				var url = URL.createObjectURL(blob)
				this.emit('capturefinish', captureData)
				var wrapperEL = this.container.getElementsByClassName('yb-player-wrapper')[0]
				var div = document.createElement('DIV')
				div.setAttribute('class', 'yb-player-capture-popup')
				div.innerHTML = `
					<img class="yb-player-capture-image" src="${url}" object="cover">
					<div class="yb-player-capture-btns">
						<div class="yb-player-capture-btn yb-player-capture-close">关闭</div>
						<div class="yb-player-capture-btn yb-player-capture-save">保存</div>
					</div>
				`
				var closeEl = div.getElementsByClassName('yb-player-capture-close')[0]
				var saveEl = div.getElementsByClassName('yb-player-capture-save')[0]
				closeEl.onclick = () => {
					div.remove()
					div = null
					closeEl.onclick = null
					URL.revokeObjectURL(url);
				}
				saveEl.onclick = () => {
					div.remove()
					div = null
					saveEl.onclick = null
					URL.revokeObjectURL(url);
					this.saveCapture(captureData)
				}
				wrapperEL.appendChild(div)
				canvas = null
			}, 'image/jpg')
		}catch(e){
			this.showToast('截图失败，请检查视频链接是否跨域')
			//截图失败，多半是跨域导致的
			this.emit('captureerror', {
				type,
				errMsg: e.toString()
			})
		}
	}
	
	async saveCapture (data) {
		var fileName = new Date().getTime().toString() + Math.round(Math.random() * 10000) + '.jpg'
		if ( !navigator.userAgent.includes('uni-app') ) {//非uni-app环境，使用a标签下载
			var a = document.createElement('A')
			var url = URL.createObjectURL(data.blob)
			a.href = url
			a.setAttribute('download', fileName)
			// 兼容：某些浏览器不支持HTML5的download属性
			if (typeof a.download === "undefined") {
			  a.setAttribute("target", "_blank");
			}
			a.click()
			a.remove()
			URL.revokeObjectURL(url)
		} else {
			//如果plus属性不为空，说明在h5+环境下，直接调用plusAPI.实现图片保存到临时路径
			var filePath = '', code = 404
			if ( typeof window.plus == 'object' ) {
				try{
					filePath = await this.saveBase64ImageToAlbum(data.base64, fileName)
					code = 200
					this.showToast('保存到相册成功')
				}catch(e){
					code = 401
					this.showToast('保存到相册失败')
				}
			}
			this.emit('capturesaved', {
				code,
				fileName,
				filePath,
				data
			})
		}
	}
	/**
	 * 保存base64图片到相册（仅限5+环境）
	 * @param {String} base64 图片
	 * @param {String} fileName 图片名称
	*/
	saveBase64ImageToAlbum (base64, fileName) {
		return new Promise((resolve, reject) => {
			var basePath = '_doc'
			var dirPath = 'uniapp_temp'
			var tempFilePath = basePath + '/' + dirPath + '/' + fileName
			var bitmap = new plus.nativeObj.Bitmap(fileName)
			bitmap.loadBase64Data(base64, function() {
			    bitmap.save(tempFilePath, {}, function() {
			        bitmap.clear()
					plus.gallery.save(tempFilePath, function (e) {
						resolve(e.path)
					}, function (error) {
						reject(error)
					});
			    }, function(error) {
			        bitmap.clear()
					reject(error)
			    })
			}, function(error) {
			    bitmap.clear()
				reject(error)
			})
		})
	}
	
	//展示loading
	showLoading () {
		this.hideCenter()
		if ( this.custom.disableLoading ) return//是否关闭了loading
		var wrapperEl = this.container.getElementsByClassName('yb-player-wrapper')[0]
		var div = document.createElement('DIV')
		div.setAttribute('class', 'yb-player-center yb-player-loading')
		div.innerHTML = YbPlayer.loadIcon
		wrapperEl.appendChild(div)
	}
	//关闭loading
	hideLoading () {
		var div = this.container.getElementsByClassName('yb-player-loading')[0]
		if ( div ) div.remove()
		if ( this.video.paused ) this.showCenterPlay()
		else this.hideCenter()
	}
	//展示中间播放按钮
	showCenterPlay () {
		this.hideCenter()
		if ( this.custom.disableCenterPlay ) return//是否关闭了中间按钮
		var wrapperEl = this.container.getElementsByClassName('yb-player-wrapper')[0]
		var div = document.createElement('DIV')
		div.setAttribute('class', 'yb-player-center yb-player-center-play')
		div.innerHTML = YbPlayer.playcenterIcon
		div.onclick = () => {
			this.video.play()
			div.onclick = null
			div.remove()
			div = null
		}
		wrapperEl.appendChild(div)
	}
	//展示错误提示
	showError (errorMsg) {
		this.initialTime = this.video.currentTime//记录当前播放时间（可能会失败，因为video出现加载失败后，currentTime可能就获取不到了）
		this.hideCenter()
		if ( this.custom.disableError ) return//是否关闭错误提示
		var wrapperEl = this.container.getElementsByClassName('yb-player-wrapper')[0]
		var div = document.createElement('DIV')
		div.setAttribute('class', 'yb-player-center yb-player-error')
		div.innerHTML = `
			${YbPlayer.errorIcon}
			<span>${errorMsg || '加载失败'}</span>
		`
		div.onclick = () => {
			this.unloadVideo()
			this.loadVideo('error')
			div.onclick = null
			div.remove()
			div = null
		}
		wrapperEl.appendChild(div)
	}
	//关闭视频中间显示的任何内容
	hideCenter () {
		var divs = this.container.querySelectorAll('.yb-player-center')
		divs.forEach(div => div.remove())
	}
	//展示消息提示
	showToast (data) {
		this._clearToastTimer()
		var options = typeof data == 'string' ? {message: data, duration: 2000} : data
		var toastEl = this.container.getElementsByClassName('yb-player-toast')[0]
		if ( toastEl ) {
			toastEl.innerHTML = '<span class="yb-player-toast-message">' + options.message + '</span>'
			toastEl.classList.remove('yb-player-toast-hide')
			toastEl.classList.add('yb-player-toast-show')
			this._toastTimer = window.setTimeout(() => {
				this.hideToast()
			}, options.duration)
		}
	}
	//关闭消息提示
	hideToast () {
		this._clearToastTimer()
		var toastEl = this.container.getElementsByClassName('yb-player-toast')[0]
		if ( toastEl ) {
			toastEl.classList.remove('yb-player-toast-show')
			toastEl.classList.add('yb-player-toast-hide')
		}
		
	}
	//播放/暂停
	toggle () {
		this.video.paused ? this.video.play() : this.video.pause()
	}
	/**
	 * 跳转进度条
	 * @param {Number} time 进度位置（单位s）
	*/
	seek (time) {
		if ( this.video ) this.video.currentTime = time
	}
	//播放上一个视频
	prev () {
		var prevIndex = this.workIndex - 1
		this.change(prevIndex < 0 ? 0 : prevIndex)
	}
	//播放下一个视频
	next () {
		var nextIndex = Number(this.workIndex) + 1
		this.change(nextIndex > this.works.length - 1 ? this.works.length - 1 : nextIndex)
	}
	//切换视频播放
	change (index) {
		this.workIndex = index
		this.setInnerHTML('yb-player-prev', index > 0 ? YbPlayer.prevIcon : '')
		this.setInnerHTML('yb-player-next', index < this.works.length - 1 ? YbPlayer.nextIcon : '')
		this.emit('workchange', {index: index, detail: this.works[index]})
	}
	/**
	 * 设置视频方向
	 * @param {Boolean} fullscreen 是否全屏
	*/
	setDirection (fullscreen) {
		this._isDirection = true
		return new Promise(async resolve => {
			var direction = fullscreen ? this.openDirection : this.exitDirection, directionCode, directionMsg
			//如果打开全屏方向为auto,则自动根据视频尺寸计算屏幕方向
			if ( this.openDirection == 'auto' && fullscreen ) {
				var width = this.video?.videoWidth
				var height = this.video?.videoHeight
				direction = width < height ? 'portrait' : 'landscape'
			}
			//如果plus属性不为空，说明在h5+环境下，直接调用plusAPI.实现屏幕旋转和隐藏导航栏状态栏等
			if ( typeof window.plus == 'object' ) {
				if ( direction ) plus.screen.lockOrientation(direction)//锁定屏幕方向
				else plus.screen.unlockOrientation()//解除屏幕方向锁定
				directionCode = 200
				directionMsg = 'plus.screen.lockOrientation:ok'
				//不支持全屏API，需要自行模拟全屏
				if ( !this.isSupportedFull() ) {
					this.setSystemFullscreen(fullscreen)//退出全屏前调用setFullscreen(false)，才会生效
					if ( fullscreen ) {
						this._bindbackbutton = this.exitFullscreen.bind(this)
						plus.key.addEventListener("backbutton",this._bindbackbutton);//增加返回键监听，用于点击返回退出全屏
					} else {
						this._removeBackbuttonListener()//移除监听事件
					}
				}
			}
			//如果浏览器支持screen API（screen的前置条件很严格，调用极大概率不成功，代码只是做保留）
			else if ( 'screen' in window && 'orientation' in screen && 'lock' in screen.orientation ) {
				try{
					if ( direction ) await screen.orientation.lock(direction)//锁定屏幕方向
					else screen.orientation.unlock()//解除屏幕方向锁定
					directionCode = 200
					directionMsg = 'window.screen.orientation.lock:ok'
				}catch(e){
					directionCode = 403//多半是权限问题导致的锁定屏幕失败，当前设备或目前的条件不允许调用
					directionMsg = e.toString()
				}
			} else {
				directionCode = 404//未找到相应的锁定屏幕函数
				directionMsg = 'plus.screen.lockOrientation undefined;window.screen.orientation.lock undefined'
			}
			this.emit('directionchange', {
				to: direction,//预期的屏幕方向
				code: directionCode,//锁定屏幕结果码
				msg: directionMsg//锁定屏幕的结果消息
			})
			window.setTimeout(() => {
				resolve()
			}, 200)
		}).catch(err => {
			resolve()
		})
	}
	/**
	 * 设置系统fullscreen
	 * @param {Boolean} fullscreen 是否全屏
	*/
	setSystemFullscreen (fullscreen) {
		if ( typeof window.plus != 'object' ) return
		if ( fullscreen ) {
			plus.navigator.setFullscreen(true)//调用系统全屏
			plus.navigator.hideSystemNavigation()//隐藏系统导航栏
		} else {
			plus.navigator.setFullscreen(false)//退出系统全屏
			window.setTimeout(function () {//不延迟，无法重新显示导航栏
				plus.navigator.showSystemNavigation()//隐藏系统导航栏
			}, 200)
		}
	}
	//退出全屏
	exitFullscreen () {
		this.setDirection(false).then(() => {
			const cfs = document.exitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen || document.webkitExitFullscreen;
			if ( typeof cfs != 'undefined' && cfs ) {
				cfs.call(document)
			} else if (typeof window.ActiveXObject !== "undefined") {
				//IE浏览器，模拟按下F11键退出全屏
				var wscript = new ActiveXObject("WScript.Shell");
				if (wscript != null) {
					wscript.SendKeys("{F11}");
				}
			} else {
				this.container.classList.remove('yb-player-openfull')
				this._fullscreenchanged()
			}
		})
	}
	//开启全屏
	openFullscreen (direction) {
		this.openDirection = direction || this.openDirection
		this.setDirection(true).then(() => {
			const rfs = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || document.documentElement.mozRequestFullscreen || document.documentElement.requestFullScreen || document.documentElement.webkitRequestFullScreen || document.documentElement.mozRequestFullScreen
			if ( typeof rfs != 'undefined' && rfs ) {
				rfs.call(this.container)
			} else if (typeof window.ActiveXObject !== "undefined") {
				//IE浏览器，模拟按下F11全屏
				var wscript = new ActiveXObject("WScript.Shell");
				if (wscript != null) {
					wscript.SendKeys("{F11}");
				}
			} else {
				this._fullscreenerror()
			}
		})
	}
	//是否支持全屏API
	isSupportedFull () {
		if ( document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || document.documentElement.mozRequestFullscreen || document.documentElement.requestFullScreen || document.documentElement.webkitRequestFullScreen || document.documentElement.mozRequestFullScreen ) {
			return true
		} else if (typeof window.ActiveXObject !== "undefined") {
			return true
		} else {
			return false
		}
	}
	//展示控制栏
	showControls () {
		this._clearControlsTimer()
		if ( this.disabled ) {//锁屏之后显示锁屏图标
			this.container.getElementsByClassName('yb-player-locks')[0].classList.remove('yb-player-hide')
		} else {//未锁屏则显示控制栏
			this.container.getElementsByClassName('yb-player-controls')[0].classList.add('yb-player-controls-show')
			var progressEl = this.container.getElementsByClassName('yb-player-progress')[0]
			var progressCenterEl = this.container.getElementsByClassName('yb-player-progress-center')[0]
			
			//如果开启了全屏或者非全屏显示头部控制器
			if ( this.getFullscreen() || this.header ) {
				this.container.getElementsByClassName('yb-player-header')[0].classList.add('yb-player-header-show')
			}
			
			if ( this.getFullscreen() ) {
				if ( progressEl ) progressEl.style.marginBottom = '15px'
				if ( progressCenterEl && progressCenterEl.previousElementSibling && progressCenterEl.previousElementSibling.classList.contains('yb-player-hide') ) progressCenterEl.style.marginLeft = 0
			} else {
				if ( progressEl ) progressEl.style.marginBottom = ''
				if ( progressCenterEl ) progressCenterEl.style.marginLeft = '5px'
			}
			var slotEl = this.container.getElementsByClassName('yb-player-slot')[0]
			//找到跟随控制栏的插槽内容并显示
			var children = slotEl?.children || []
			for ( let i = 0 ; i < children.length; i++ ) {
				if ( children[i].getAttribute('data-controls') == 1 ) {
					var isFull = children[i].classList.contains('yb-player-full')//判断是否有全屏元素标记
					var isUnFull = children[i].classList.contains('yb-player-unfull')//判断是否有非全屏元素标记
					if ( (isFull && this.getFullscreen()) ||
					(isUnFull && !this.getFullscreen()) ||
					(!isFull && !isUnFull) ) children[i].classList.remove('yb-player-hide')
				}
			}
			//隐藏底部进度条
			this.container.getElementsByClassName('yb-player-bottom-progress')[0].classList.add('yb-player-hide')
		}
		this.emit('controlschange', {show: true})
		this._controlsTimer = window.setTimeout(() => {
			this.hideControls()
		}, 5000)
	}
	//关闭控制栏
	hideControls (item, timer) {
		this._clearControlsTimer()
		this.container.getElementsByClassName('yb-player-controls')[0].classList.remove('yb-player-controls-show')
		this.container.getElementsByClassName('yb-player-header')[0].classList.remove('yb-player-header-show')
		this.container.getElementsByClassName('yb-player-locks')[0].classList.add('yb-player-hide')
		var slotEl = this.container.getElementsByClassName('yb-player-slot')[0]
		//找到跟随控制栏的插槽内容并隐藏
		var children = slotEl?.children || []
		for ( let i = 0 ; i < children.length; i++ ) if ( children[i].getAttribute('data-controls') == 1 ) children[i].classList.add('yb-player-hide')
		//显示底部进度条
		if ( !this.custom.disableBottomProgress && !this.isLive ) this.container.getElementsByClassName('yb-player-bottom-progress')[0].classList.remove('yb-player-hide')
		this.emit('controlschange', {show: false})
	}
	//全屏开启错误事件
	_fullscreenerror () {
		this.container.classList.add('yb-player-openfull')
		this._fullscreenchanged()
	}
	//全屏改变事件
	async _fullscreenchanged (e = {}) {
		this._setFullscreenStatus()
		this._isDirection = false
		if ( this.getFullscreen() ) {
			this.emit('fullscreenchange', {
				fullscreen: true,
				videoWidth: this.video?.videoWidth,
				videoHeight: this.video?.videoHeight,
				type: this.getFullscreenType()
			})
		} else {
			this.emit('fullscreenchange', {
				fullscreen: false,
				type: e.isTrusted ? 'api' : 'css'
			})
		}
		//如果没有调用过setDirection，说明是通过其它方式调用的打开全屏或退出全屏，需要去处理屏幕方向
		if ( !this._isDirection ) this.setDirection(this.getFullscreen())
		this.refreshDanmu()
		this.refreshPano()
		this._isDirection = false
	}
	//设置全屏改变状态
	_setFullscreenStatus () {
		this.hidePopup()
		this.hideToolbar()
		var wrapperEl = this.container.getElementsByClassName('yb-player-wrapper')[0]
		var controlsEl = this.container.getElementsByClassName('yb-player-controls')[0]
		var headerEl = this.container.getElementsByClassName('yb-player-header')[0]
		var locksEl = this.container.getElementsByClassName('yb-player-locks')[0]
		var unFullEls = this.container.getElementsByClassName('yb-player-unfull')//获取标记了非全屏的元素
		var fullEls = this.container.getElementsByClassName('yb-player-full')//获取标记了全屏的元素
		if ( this.getFullscreen() ) {
			//全屏时隐藏非全屏元素
			for( let i = 0; i < unFullEls.length;i++ ) unFullEls[i].classList.add('yb-player-hide')
			//全屏时显示全屏元素
			for( let i = 0; i < fullEls.length;i++ ) fullEls[i].classList.remove('yb-player-hide')
			controlsEl.classList.add('yb-player-controls-safearea')
			headerEl.classList.add('yb-player-header-safearea')
			locksEl && locksEl.classList.add('yb-player-locks-safearea')
			this.setInnerHTML('yb-player-fullscreen', YbPlayer.exitfullIcon)
			if ( this.controls ) this.showControls()
		} else {
			//非全屏时显示非全屏元素
			for( let i = 0; i < unFullEls.length;i++ )  unFullEls[i].classList.remove('yb-player-hide')
			//全屏时隐藏全屏元素
			for( let i = 0; i < fullEls.length;i++ ) fullEls[i].classList.add('yb-player-hide')
			//移除安全区域
			controlsEl.classList.remove('yb-player-controls-safearea')
			headerEl.classList.remove('yb-player-header-safearea')
			locksEl && locksEl.classList.remove('yb-player-locks-safearea')
			this.setInnerHTML('yb-player-fullscreen', YbPlayer.openfullIcon)
			this.hideControls()
		}
	}
	
	/***** 清除定时器 *****/
	_clearToastTimer () {
		if ( this._toastTimer ) {
			window.clearTimeout(this._toastTimer)
			this._toastTimer = null
		}
	}
	
	_clearControlsTimer () {
		if ( this._controlsTimer ) {
			window.clearTimeout(this._controlsTimer)
			this._controlsTimer = null
		}
	}
	
	_clearDanmuTimer () {
		if ( this._danmuTimer ) {
			window.clearInterval(this._danmuTimer)
			this._danmuTimer = null
		}
	}
	
	_clearSeizingTimer () {
		if ( this._seizingTimer ) {
			window.clearTimeout(this._seizingTimer)
			this._seizingTimer = null
		}
	}
	
	_removeBackbuttonListener () {
		if ( this._bindbackbutton ) {
			plus.key.removeEventListener("backbutton",this._bindbackbutton);
			this._bindbackbutton = null
		}
	}
}
//兼容new Function，为了挂载到window对象上
if ( typeof window != 'undefined' ) {
	window.YbPlayer = YbPlayer
}
