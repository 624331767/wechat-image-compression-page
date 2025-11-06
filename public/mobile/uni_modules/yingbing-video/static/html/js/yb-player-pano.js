class YbPano {
	constructor (player, config={}) {
		this.player = player
		this.config = {...YbPano.DEFAULT_CONFIG, ...config}
		this.scene = null
		this.camera = null
		this.renderer = null
		this.geometry = null//几何体
		this.material = null//材质
		this.sphere = null
		this.videoTexture = null//视频纹理
		this.controls = null//摄像机控制器
		this._animated = null//动画实例
	}
	static DEFAULT_CONFIG = {
		controlsType: 'orbit',//控制器类型 orbit-手指或鼠标拖动 orientation-陀螺仪控制
		disableDragReverse: false,//关闭反方向拖拽旋转（反向拖拽更符合人的直觉）
		enableDamping: true//添加阻尼效果（滑动更顺畅）
	}
	init() {
		var container = this.player.container
		var boxWidth = container.offsetWidth
		var boxHeight = container.offsetHeight
	    this.scene = new THREE.Scene();
	    this.camera = new THREE.PerspectiveCamera(75, boxWidth / boxHeight, 0.1, 1000);
	    this.renderer = new THREE.WebGLRenderer({
			preserveDrawingBuffer: true//不设置该属性，则不能将渲染结果保存为图片
		});
	    this.renderer.setSize(boxWidth, boxHeight);
		var wrapperEl = container.getElementsByClassName('yb-player-wrapper')[0]
		var div = document.createElement('DIV')
		div.setAttribute('class', 'yb-player-pano')
		div.setAttribute('style', 'position:absolute;inset: 0;visibility: hidden;')//第一次加载不显示场景，因为考虑到视频需要显示封面，等待播放之后再显示
		div.appendChild(this.renderer.domElement)
	    wrapperEl.insertBefore(div, wrapperEl.getElementsByClassName('yb-player-danmu')[0]);
	    this.camera.position.z = 5;//相机位置
		this.loadControls()
	}
	//加载控制器
	loadControls () {
		//如果设备支持陀螺仪
		if ( this.config.controlsType == 'orientation' && typeof DeviceOrientationEvent !== 'undefined' ) {
		    this.controls = new THREE.DeviceOrientationControls(this.camera);
			this.requestOrientationPermission()
			//陀螺仪控制可以开启手势事件
			this.player.enableGesture()
		} else {
			this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
			this.controls.enableZoom = false;
			this.controls.enablePan = false;
			this.controls.enableDamping = this.config.enableDamping;
			if ( !this.config.disableDragReverse ) this.controls.rotateSpeed = -0.25;
			if ( this.player.three == '180' ) {
				this.controls.minAzimuthAngle = 0
				this.controls.maxAzimuthAngle = 180
				this.controls.minPolarAngle  = 0
				this.controls.maxPolarAngle = 180
			}
			//禁用手势事件避免冲突
			this.player.disableGesture()
			//如果尝试开启陀螺仪控制，但失败了，则弹出提示
			if ( this.config.controlsType == 'orientation' ) {
				this.player.showToast('该设备或当前环境可能不支持陀螺仪，已自动切换为滑动')
				this.config.controlsType = 'orbit'
			}
		}
	}
	//卸载控制器
	unloadControls () {
		if ( this.controls ) {
			this.controls.disconnect && this.controls.disconnect()
			this.controls.dispose()
			this.controls = null
		}
	}
	//获取控制器类型
	getControlsType () {
		return this.controls ? this.controls.deviceOrientation ? 'orientation' : 'orbit' : 'close'
	}
	setControlsType (type) {
		this.config.controlsType = type
		this.unloadControls()
		this.loadControls()
	}
	//请求陀螺仪权限
	requestOrientationPermission () {
		if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
		    DeviceOrientationEvent.requestPermission()
		        .then(permissionState => {
		            if (permissionState === 'granted') {
		                // 用户授予权限
		                this.controls.connect(); // 现在才连接和启用控件
		            } else {
						this.player.showToast('必须给予陀螺仪权限才能使用陀螺仪')
		            }
		        }).catch(err => {
					this.player.showToast('请求陀螺仪权限失败')
				});
		} else {
		    // 理论上这个分支应该已经被 init 函数处理了，但作为备用
		    this.controls.connect();
		}
	}
	//开始渲染
	animate() {
		this._cancelAnimationFrame()
		var video = this.player.video
		if (video.readyState === video.HAVE_ENOUGH_DATA) this.videoTexture.needsUpdate = true;
		if ( this.controls && this.controls.enabled ) this.controls.update();
		//判断是否有["__v_raw"]属性，如果有，传入该属性值，否则直接传入this.scene，这里是为了兼容vue3，因为vue3会将这些变量变为响应式数据，导致内部一些只读变量报错
		//该方法来自于vue3的toRaw方法
		const scene = this.scene["__v_raw"] ? this.scene["__v_raw"] : this.scene
	    this.renderer.render(scene, this.camera);
		this._animated = window.requestAnimationFrame(() => this.animate());
	}
	//更新尺寸
	updateSize () {
		var container = this.player.container
		var boxWidth = container.offsetWidth
		var boxHeight = container.offsetHeight
		this.camera.aspect = boxWidth / boxHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(boxWidth, boxHeight);
	}
	//创建视频纹理
	createVideoSphere() {
		var video = this.player.video
	    this.videoTexture = new THREE.VideoTexture(video);
	    this.geometry = this.player.three == '360' ? new THREE.SphereGeometry(500, 60, 40) : new THREE.SphereGeometry(500, 60, 40, 0, Math.PI, 0, Math.PI)
	    this.geometry.scale(-1, 1, 1);
	    this.material = new THREE.MeshBasicMaterial({
	        map: this.videoTexture
	    });
	    this.sphere = new THREE.Mesh(this.geometry, this.material);
	    this.scene.add(this.sphere);
	}
	//回收内存
	dispose () {
		this._cancelAnimationFrame()
		this.unloadControls()
		if ( this.videoTexture ) {
			this.videoTexture.dispose()
			this.videoTexture = null
		}
		if ( this.geometry ) {
			this.geometry.dispose()
			this.geometry = null
		}
		if ( this.material ) {
			this.material.dispose()
			this.material = null
		}
		if ( this.sphere ) {
			this.sphere.remove()
			this.sphere = null
		}
		if ( this.renderer ) {
			this.renderer.dispose()
			this.renderer = null
		}
		if ( this.camera ) {
			this.camera.remove()
			this.camera = null
		}
		if ( this.scene ) {
			this.scene.remove()
			this.scene = null
		}
		var container = this.player.container
		var threeEl = container.getElementsByClassName('yb-player-pano')[0]
		if ( threeEl ) threeEl.remove()
		threeEl = null
	}
	//取消渲染动画
	_cancelAnimationFrame () {
		if ( this._animated ) {
			window.cancelAnimationFrame(this._animated)
			this._animated = null
		}
	}
}
//兼容new Function，为了挂载到window对象上
if ( typeof window != 'undefined' ) {
	window.YbPano = YbPano
}