/*手势事件处理*/
class YbGesture {
	constructor (player, config) {
		this.player = player
		this.config = config
		this.disabled = false//禁用手势事件
		
		this._touchstartX = null
		this._touchstartY = null
		this._touchmoveX = null
		this._touchmoveY = null
		this._clickTime = null
		this._touchTime = null
		this._threshold = 20
		this._singleTouchTime = 150//单击间隔时间
		this._longTouchTime = 500//长按间隔时间
		this._mousedown = null
		this._isMove = null//是否滑动
		this._isVolume = null//是否音量调节
		this._isLight = null//是否亮度调节
		this._isProgress = null//是否进度调节
		this._seekTime = null//跳转时间
		this._seekVolume = null//改变音量
		this._seekLight = null//改变亮度
		
		this._touchTimer = null//触摸定时器
		this._longTimer = null//长按定时器
		this._centerTimer = null//中间元素隐藏定时器
	}
	resetTouch () {
		this._touchstartX = null
		this._touchstartY = null
		this._touchmoveX = null
		this._touchmoveY = null
		this._touchTime = null
		this._clickTime = null
		this._isMove = null
		this._isVolume = null
		this._isLight = null
		this._isProgress = null
		this._seekTime = null
		this._seekVolume = null
		this._seekLight = null
	}
	touchstart (e) {
		if ( this.stopPropagation(e) ) return
		this._clearTouchTimer()
		this._clearLongTimer()
		var touch = e.touches[0]
		this._touchstartX = touch.pageX
		this._touchstartY = touch.pageY
		this._clickTime++
		if ( this._clickTime == 1 ) {//第一次点击 
			this._touchTimer = window.setTimeout(() => {
				this._touchTime = this._singleTouchTime
			}, this._singleTouchTime)
			this._longTimer = window.setTimeout(() => {
				if ( this._touchmoveX <= this._threshold && this._touchmoveY <= this._threshold && !this.config.disableLongPress ) {//当滑动距离不超过阙值时，且为禁止长按，才会执行长按
					this._touchTime = this._longTouchTime
					this.longPress()//长按事件
				}
			}, this._longTouchTime)
		}
	}
	touchmove (e) {
		if ( this.stopPropagation(e) ) return
		if ( this._clickTime > 0 ) {
			var touch = e.touches[0]
			this._touchmoveX = Math.abs(touch.pageX - this._touchstartX)
			this._touchmoveY = Math.abs(touch.pageY - this._touchstartY)
			//判断用户是否进行滑动，只要判断一次滑动，当前触摸事件就一直是滑动
			if ( !this._isMove ) this._isMove = this._touchmoveY > this._threshold || this._touchmoveX > this._threshold
			//第二次点击 未开启全屏 未开启非全拼手势操作 锁屏中 滑动距离不大于阙值 触摸时间超过长按时间
			if ( this._clickTime == 2 || !this._isMove || this._touchTime == this._longTouchTime || (!this.player.getFullscreen() && this.config.disableUnFullscreenEvent) || this.player.disabled || this.disabled ) return
			//根据视频方向，反转触摸位置和滑动距离
			var container = this.player.container
			var containerWidth = container.offsetWidth
			var containerHeight = container.offsetHeight
			var touchX = this._touchstartX
			var touchY = this._touchstartY
			var offsetX = this._touchmoveX
			var offsetY = this._touchmoveY
			//点击在左边并且y轴滑动距离比x轴滑动距离大的时候执行调节亮度操作
			if ( touchX < containerWidth / 2 && offsetY > offsetX && !this._isVolume && !this._isProgress && !this.config.disableLight ) {
				this._isLight = true
				var initial = this.config.initialLight
				var max = 1
				var deltaY = touch.pageY - this._touchstartY
				// 计算滑动距离与容器宽度的比例
				var percentDelta = offsetY / containerHeight;
				// 根据比例和滑动可控制最大时长计算时间变化量
				var delta = percentDelta * max;
				// 计算新的时间位置
				this._seekLight = deltaY < 0 ? initial + delta : initial - delta;
				this._seekLight = this._seekLight > max ? max : this._seekLight < 0 ? 0 : this._seekLight
				this.setLight(this._seekLight)
			}
			//点击在右边并且y轴滑动距离比x轴滑动距离大的时候执行调节音量操作
			if ( touchX > containerWidth / 2 && offsetY > offsetX && !this._isLight && !this._isProgress && !this.config.disableVolume ) {
				this._isVolume = true
				var initial = this.config.initialVolume
				var max = 1
				var deltaY = touch.pageY - this._touchstartY
				// 计算滑动距离与容器宽度的比例
				var percentDelta = offsetY / containerHeight;
				// 根据比例和滑动可控制最大时长计算时间变化量
				var delta = percentDelta * max;
				// 计算新的时间位置
				this._seekVolume = deltaY < 0 ? initial + delta : initial - delta;
				this._seekVolume = this._seekVolume > max ? max : this._seekVolume < 0 ? 0 :this. _seekVolume
				this.setVolume(this._seekVolume)
			}
			//y轴滑动距离比x轴滑动距离小的时候执行进度调节 不能为直播源 视频必须加载到数据
			var video = this.player.video
			var duration = this.player.getDuration()
			if ( offsetY < offsetX && !this._isLight && !this._isVolume && !this.player.isLive && duration && !this.config.disableProgress ) {
				this._isProgress = true
				var deltaX = touch.pageX - this._touchstartX
				// 计算滑动距离与容器宽度的比例
				var percentDelta = offsetX / containerWidth;
				// 根据比例和滑动可控制最大时长计算时间变化量
				var timeDelta = percentDelta * Math.min(180, duration);
				// 计算新的时间位置
				this._seekTime = deltaX > 0 ? video.currentTime + timeDelta : video.currentTime - timeDelta;
				this._seekTime = this._seekTime > duration ? duration : this._seekTime < 0 ? 0 : this._seekTime
				this.setProgress(this._seekTime)
				
			}
		}
	}
	touchend (e) {
		if ( this.stopPropagation(e) ) return
		this._clearTouchTimer()
		this._clearLongTimer()
		//当触摸事件等于
		if ( this._touchTime == this._longTouchTime ) this.stopLongPress()//停止长按
		//点击次数大于零并且触摸时间小于单击时间并且滑动距离不超过阙值
		else if ( this._clickTime > 0 && this._touchTime < this._singleTouchTime && this._touchmoveX <= this._threshold && this._touchmoveY <= this._threshold ) {
			if ( this._clickTime == 1 && !this.config.disableSingleClick ) {//第一次点击
				this._touchTimer = window.setTimeout(() => {
					this.singleClick()
				}, this._singleTouchTime)
			} else if ( this._clickTime == 2 && !this.config.disableDoubleClick ) this.doubleClick()//第二次点击
			else this.resetTouch()
		} else {
			var video = this.player.video
			if ( this._isProgress && this._seekTime >= 0 && video ) video.currentTime = this._seekTime
			if ( this._isLight && this._seekLight >= 0 ) {
				this.config.initialLight = this._seekLight//更新初始化亮度，注意这并不代表系统亮度被改变
				var data = {seekLight: this._seekLight}
				this.player.emit('seeklight', this._seekLight)
			}
			if ( this._isVolume && this._seekVolume >= 0 ) {//更新初始化音量，注意这并不代表系统音量被改变
				this.config.initialVolume = this._seekVolume
				var data = {seekVolume: this._seekVolume}
				this.player.emit('seekvolume', this._seekVolume)
			}
			this.resetTouch()
		}
	}
	singleClick() {//单击事件
		this.resetTouch()
		if ( this.player.controls ) {
			if ( this.player.getControls() ) this.player.hideControls()
			else this.player.showControls()
		}
		this.player.emit('singleclick')
	}
	
	doubleClick() {//双击事件
		this.resetTouch()
		this.player.toggle()
		this.player.emit('doubleclick')
	}
	
	longPress() {//长按事件
		this.setPlaybackRate(2.0)
		this.player.emit('longpress')
	}
	
	stopLongPress() {//停止长按事件
		this.resetTouch()
		this.setPlaybackRate(1.0)
		this.player.emit('stoplongpress')
	}
	//注册手势事件
	load () {
		var container = this.player.container
		var wrapperEl = container.getElementsByClassName('yb-player-wrapper')[0]
		//绑定触摸监听
		wrapperEl.ontouchstart = (e) => { this.touchstart(e) }
		wrapperEl.ontouchmove = (e) => { this.touchmove(e) }
		wrapperEl.ontouchend = (e) => { this.touchend(e) }
		wrapperEl.ontouchcancel = (e) => { this.touchend(e) }
		//电脑端模拟触摸
		wrapperEl.onmousedown = (e) => {
			if ( 'ontouchstart' in window || (window.DocumentTouch && document instanceof DocumentTouch) ) return//设备支持触屏则不触发mousedown
			this._mousedown = true
			this.touchstart({target:e.target, touches: [{pageX: e.pageX, pageY: e.pageY}]})
		}
		wrapperEl.onmousemove = (e) => {
			if ( !this._mousedown ) return
			this.touchmove({target:e.target, touches: [{pageX: e.pageX, pageY: e.pageY}]})
		}
		wrapperEl.onmouseup = (e) => {
			if ( !this._mousedown ) return
			this._mousedown = false
			this.touchend(e)
		}
	}
	
	//注销手势事件
	unload () {
		this._clearTouchTimer()
		this._clearLongTimer()
		this._clearCenterTimer()
		var container = this.player.container
		var wrapperEl = container.getElementsByClassName('yb-player-wrapper')[0]
		if( wrapperEl ) {
			wrapperEl.ontouchstart = null
			wrapperEl.ontouchmove = null
			wrapperEl.ontouchend = null
			wrapperEl.onmousedown = null
			wrapperEl.onmousemove = null
			wrapperEl.onmouseup = null
			wrapperEl = null
		}
	}
	
	setConfig (key, value) {
		this.config[key] = value
	}
	
	disable () {
		this.disabled = true
	}
	
	enable () {
		this.disabled = false
	}
	
	//设置倍速
	setPlaybackRate (playbackRate) {
		var video = this.player.video
		if ( !video ) return
		if ( playbackRate == video.playbackRate ) return
		video.playbackRate = playbackRate
		// if ( ![1, 1.0].includes(playbackRate) ) {
		// 	var rateEl = document.createElement('DIV')
		// 	rateEl.innerHTML = `
		// 		<div class="yb-player-rate">
		// 			<div class="yb-player-rate-icon">
		// 				<i></i><i></i><i></i>
		// 			</div>
		// 			<span class="yb-player-rate-span">${playbackRate + '倍速播放中'}</span>
		// 		</div>
		// 	`
		// 	var wrapperEl = this.player.container.getElementsByClassName('yb-player-wrapper')[0]
		// 	if ( wrapperEl ) wrapperEl.appendChild(rateEl)
		// } else {
		// 	var rateEl = this.player.container.getElementsByClassName('yb-player-rate')[0]
		// 	if ( rateEl )rateEl.remove()
		// }
	}
	
	//设置音量
	setVolume (volume) {
		this._clearCenterTimer()
		var container = this.player.container
		var wrapperEl = container.getElementsByClassName('yb-player-wrapper')[0]
		var div = container.getElementsByClassName('yb-player-center-value')[0]
		if ( !div ) {
			div = document.createElement('DIV')
			div.setAttribute('class', 'yb-player-center yb-player-center-value')
			wrapperEl.appendChild(div)
		}
		div.innerHTML = `
			<span>音量</span>
			<span>${((volume / 1) * 100).toFixed(0)}%</span>
		`
		this._centerTimer = window.setTimeout(() => {
			this.hideCenterValue()
		}, 1000)
	}
	//设置亮度
	setLight (light) {
		this._clearCenterTimer()
		var container = this.player.container
		var wrapperEl = container.getElementsByClassName('yb-player-wrapper')[0]
		var div = container.getElementsByClassName('yb-player-center-value')[0]
		if ( !div ) {
			div = document.createElement('DIV')
			div.setAttribute('class', 'yb-player-center yb-player-center-value')
			wrapperEl.appendChild(div)
		}
		div.innerHTML = `
			<span>亮度</span>
			<span>${((light / 1) * 100).toFixed(0)}%</span>
		`
		this._centerTimer = window.setTimeout(() => {
			this.hideCenterValue()
		}, 1000)
	}
	//设置进度
	setProgress (time) {
		this._clearCenterTimer()
		var container = this.player.container
		var video = this.player.video
		var wrapperEl = container.getElementsByClassName('yb-player-wrapper')[0]
		var div = container.getElementsByClassName('yb-player-center-value')[0]
		if ( !div ) {
			div = document.createElement('DIV')
			div.setAttribute('class', 'yb-player-center yb-player-center-value')
			wrapperEl.appendChild(div)
		}
		div.innerHTML = `
			${YbPlayer.timeFormat(time)} / ${YbPlayer.timeFormat(this.player.getDuration())}
		`
		this._centerTimer = window.setTimeout(() => {
			this.hideCenterValue()
		}, 1000)
	}
	//删除手势事件产生的中间控件
	hideCenterValue () {
		var div = this.player.container.getElementsByClassName('yb-player-center-value')[0]
		if ( div ) {
			div.onclick = null
			div.remove()
			div = null
		}
	}
	/**
	* 阻止冒泡
	* @param e 点击实例
	*/
	stopPropagation (e) {
		var container = this.player.container
		var gestureEls = container.getElementsByClassName('yb-player-gesture')//允许手势事件冒泡元素标记
		let isGesture = false//是否点击了非手势控制标记的元素
		for ( let i = 0; i < gestureEls.length; i++ ) {
			isGesture = gestureEls[i].contains(e.target)//对比元素
			if ( isGesture ) break;//如果找到了，打断循环
		}
		if ( isGesture ) return false//允许手势事件
		var danmuEl = container.getElementsByClassName('yb-player-danmu')[0]
		var subtitleEl = container.getElementsByClassName('yb-player-subtitle')[0]
		var panoEl = container.getElementsByClassName('yb-player-pano')[0]
		var video = this.player.video
		// console.log('target', e.target);
		// console.log('video', video.contains(e.target));
		// console.log('danmuEl', danmuEl.contains(e.target));
		// console.log('subtitleEl', subtitleEl.contains(e.target));
		if (
			( video && video.contains(e.target) ) ||
			( danmuEl && danmuEl.contains(e.target) ) ||
			( subtitleEl && subtitleEl.contains(e.target) ) ||
			( panoEl && panoEl.contains(e.target) )
		) return false
		return true
	}
	
	/***** 清除定时器 *****/
	_clearTouchTimer () {
		if ( this._touchTimer ) {
			window.clearTimeout(this._touchTimer)
			this._touchTimer = null
		}
	}
	
	_clearLongTimer () {
		if ( this._longTimer ) {
			window.clearTimeout(this._longTimer)
			this._longTimer = null
		}
	}
	
	_clearCenterTimer () {
		if ( this._centerTimer ) {
			window.clearTimeout(this._centerTimer)
			this._centerTimer = null
		}
	}
}
//兼容new Function，为了挂载到window对象上
if ( typeof window != 'undefined' ) {
	window.YbGesture = YbGesture
}