/*字幕处理*/
class YbSubtitle {
	constructor (player, list, config) {
		this.player = player
		this.list = list || []
		this.config = config || {}
		this.activeIndex = -1//渲染字幕位置索引
		this.paused = true//停止渲染
		this._animation = null//渲染动画
	}
	//默认配置
	static DEFAULT_CONFIG = {
		color: '#ffffff',//文字颜色
		fontSize: 18,//字体大小
		bottom: '10%',//底部边距
		shadowColor: 'rgba(0,0,0,.5)'//阴影颜色
	}
	static init(player, src, config) {
		return new Promise(resolve => {
			YbSubtitle.showLoading(player)
			var xhr = new XMLHttpRequest()
			xhr.onreadystatechange = () => {
				if ( xhr.readyState == 4 ) {
					if ( xhr.status == 200 ) {
						YbSubtitle.showResult(player, '加载字幕文件成功')
						var list = src.includes('.srt') ? YbSubtitle.parseSrt(xhr.responseText) : src.includes('.ass') ? YbSubtitle.parseAss(xhr.responseText).events.data.map(item => {
							var text = item.Text.replace(/\{.*?\}/g, ''); // 移除{}标签
							text = text.replace(/\\N/g, '<br>'); // 处理换行
							return {...item,
								text,
								startTime: item.Start,
								endTime: item.End
							}
						}) : YbSubtitle.parseVtt(xhr.responseText).cues
						resolve(new YbSubtitle(player, list, config))
					} else {
						YbSubtitle.showResult(player, '加载字幕文件失败')
						resolve(null)
					}
					xhr.abort()
				}
			}
			xhr.onabort = function () { xhr = null }
			xhr.open('GET', src);
			xhr.responseType = 'text';
			xhr.send();
		})
	}
	static showLoading (player) {
		var container = player.container
		var wrapperEl = container ? container.getElementsByClassName('yb-player-wrapper')[0] : null
		if ( wrapperEl ) {
			var div = document.createElement('DIV')
			div.setAttribute('class','yb-player-subtitle-loading')
			div.innerHTML = '正在加载字幕文件'
			wrapperEl.appendChild(div)
		}
	}
	static hideLoading (player) {
		var container = player?.container
		var loadingEl = container ? container.getElementsByClassName('yb-player-subtitle-loading')[0] : null
		if ( loadingEl ) loadingEl.remove()
	}
	static showResult (player, message) {
		var container = player.container
		var loadingEl = container ? container.getElementsByClassName('yb-player-subtitle-loading')[0] : null
		if ( loadingEl ) loadingEl.innerHTML = message
		window.setTimeout(() => {
			YbSubtitle.hideLoading(player)
		}, 1000)
	}
	//格式化SRT字幕
	static parseSrt(content) {
	    // 按空行分割字幕块
	    const blocks = content.trim().split(/\n\s*\n/);
	    const result = [];
	    
	    for (let i = 0; i < blocks.length; i++) {
	        const lines = blocks[i].split('\n').filter(line => line.trim() !== '');
	        
	        if (lines.length < 3) {
	            continue; // 跳过无效块
	        }
	        
	        // 解析序号
	        const index = parseInt(lines[0]);
	        if (isNaN(index)) {
	            throw new Error(`无效的序号: ${lines[0]}`);
	        }
	        
	        // 解析时间码
	        const timecodeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
	        if (!timecodeMatch) {
	            throw new Error(`无效的时间码格式: ${lines[1]}`);
	        }
	        
	        const startTime = `${parseInt(timecodeMatch[1])}:${parseInt(timecodeMatch[2])}:${parseInt(timecodeMatch[3])}.${parseInt(timecodeMatch[4])}`
	        const endTime = `${parseInt(timecodeMatch[5])}:${parseInt(timecodeMatch[6])}:${parseInt(timecodeMatch[7])}.${parseInt(timecodeMatch[8])}`
	        
	        // 合并文本行
	        const text = lines.slice(2).join('\n');
	        
	        result.push({
	            index: index,
	            startTime: startTime,
	            endTime: endTime,
	            text: text
	        });
	    }
	    return result;
	}
	static parseAss(content) {
	    const lines = content.split('\n');
	    let currentSection = '';
	    const result = {
	        info: {},
	        styles: {
	            format: [],
	            data: []
	        },
	        events: {
	            format: [],
	            data: []
	        }
	    };
	    for (let i = 0; i < lines.length; i++) {
	        const line = lines[i].trim();
	        
	        // 跳过空行和注释
	        if (!line || line.startsWith(';')) continue;
	        
	        // 检测段落开始
	        if (line.startsWith('[') && line.endsWith(']')) {
	            currentSection = line.slice(1, -1).toLowerCase();
	            continue;
	        }
	        // 根据当前段落处理内容
	        switch(currentSection) {
	            case 'script info':
	                parseScriptInfo(line, result.info);
	                break;
	            case 'v4+ styles':
	                parseStyles(line, result.styles);
	                break;
	            case 'events':
	                parseEvents(line, result.events);
	                break;
	        }
	    }
	    return result;
	}
	static parseVtt(content) {
	    const lines = content.split('\n');
	    const cues = [];
	    let currentCue = null;
	    let note = null;
	    let style = null;
	    let region = null;
	    
	    // 检查文件头
	    if (lines.length === 0 || !lines[0].includes('WEBVTT')) {
	        throw new Error('无效的VTT文件: 缺少WEBVTT文件头');
	    }
	    // 解析VTT内容
	    for (let i = 1; i < lines.length; i++) {
	        const line = lines[i].trim();
	        
	        // 跳过空行
	        if (line === '') continue;
	        
	        // 检查是否是时间轴
	        if (line.includes('-->')) {
	            // 如果已有当前cue，先保存它
	            if (currentCue) {
	                cues.push(currentCue);
	            }
	            
	            // 创建新的cue
	            currentCue = {
	                identifier: null,
	                start: null,
	                end: null,
	                text: '',
	                styles: null
	            };
	            
	            // 解析时间轴
	            const arrowIndex = line.indexOf('-->');
	            currentCue.startTime = line.substring(0, arrowIndex).trim();
	            currentCue.endTime = line.substring(arrowIndex + 3, arrowIndex + 15).trim();
	            const settingsLine = line.substring(arrowIndex + 15).trim();
	            // 解析设置（如果有）
	            if (settingsLine) currentCue.styles = parseCueSettings(settingsLine);
	        } 
	        // 检查是否是标识符（数字或文本）
	        else if (!currentCue && /^\d+$/.test(line)) {
	            // 这是标识符行
	            if (currentCue) {
	                currentCue.identifier = line;
	            }
	        }
	        // 检查是否是注释
	        else if (line.startsWith('NOTE')) {
	            note = line.substring(4).trim();
	        }
	        // 检查是否是样式块
	        else if (line.startsWith('STYLE')) {
	            style = line.substring(5).trim();
	        }
	        // 检查是否是区域块
	        else if (line.startsWith('REGION')) {
	            region = line.substring(6).trim();
	        }
	        // 否则是文本行
	        else if (currentCue) {
	            if (currentCue.text) {
	                currentCue.text += '\n' + line;
	            } else {
	                currentCue.text = line;
	            }
	        }
	    }
	    
	    // 添加最后一个cue
	    if (currentCue) {
	        cues.push(currentCue);
	    }
	    
	    return {
	        metadata: {
	            note,
	            style,
	            region
	        },
	        cues
	    };
	}
	unload () {
		this.pause()
		var container = this.player.container
		var div = container.getElementsByClassName('yb-player-subtitle-text')[0]
		if ( div ) div.remove()
	}
	setConfig (key, value) {
		this.config[key] = value
	}
	play () {
		this.paused = false
		this._render()
	}
	pause () {
		this.paused = true
		if ( this._animation ) {
			window.cancelAnimationFrame(this._animation)
			this._animation = null
		}
	}
	//渲染字幕
	_render () {
		var container = this.player.container
		var video = this.player.video
		if ( !video || !container ) return
		var div = container.getElementsByClassName('yb-player-subtitle-text')[0]
		var wrapperEl = container.getElementsByClassName('yb-player-wrapper')[0]
		var nowIndex = this.list.findIndex(item => YbPlayer.timeToSeconds(item.startTime) <= video.currentTime && YbPlayer.timeToSeconds(item.endTime) >= video.currentTime)
		var config = {...YbSubtitle.DEFAULT_CONFIG, ...this.config}
		if ( nowIndex > -1 && this.activeIndex != nowIndex ) {
			this.activeIndex = nowIndex
			var nowTitle = this.list[nowIndex]
			if ( !div ) {
				div = document.createElement('DIV')
				div.setAttribute('class','yb-player-subtitle-text')
				wrapperEl.appendChild(div)
			}
			div.style.color = config.color
			div.style.fontSize = config.fontSize + 'px'
			div.style.bottom = config.bottom
			div.style.textShadow = `0 0 5px ` + config.shadowColor
			div.innerHTML = `<span>${nowTitle.text}</span>` 
		} else {
			if ( div && nowIndex == -1 ) div.remove()
		}
		if ( !this.paused ) this._animation = window.requestAnimationFrame(() => this._render())
	}
}

 // 解析脚本信息
function parseScriptInfo(line, infoObj) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;
    
    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    
    infoObj[key] = value;
}

// 解析样式
function parseStyles(line, stylesObj) {
    if (line.toLowerCase().startsWith('format:')) {
        // 解析格式行
        const formatLine = line.substring(7).trim();
        stylesObj.format = formatLine.split(',').map(item => item.trim());
    } else if (line.toLowerCase().startsWith('style:')) {
        // 解析样式数据
        const styleLine = line.substring(6).trim();
        const values = parseCsvLine(styleLine);
        
        if (values.length === stylesObj.format.length) {
            const style = {};
            stylesObj.format.forEach((key, index) => {
                style[key] = values[index];
            });
            stylesObj.data.push(style);
        }
    }
}

// 解析事件
function parseEvents(line, eventsObj) {
    if (line.toLowerCase().startsWith('format:')) {
        // 解析格式行
        const formatLine = line.substring(7).trim();
        eventsObj.format = formatLine.split(',').map(item => item.trim());
    } else if (line.toLowerCase().startsWith('dialogue:') || line.toLowerCase().startsWith('comment:')) {
        // 解析对话或注释数据
        const typeEnd = line.indexOf(':');
        const type = line.substring(0, typeEnd).trim();
        const dataLine = line.substring(typeEnd + 1).trim();
        
        const values = parseCsvLine(dataLine);
        
        if (values.length === eventsObj.format.length) {
            const event = { Type: type };
            eventsObj.format.forEach((key, index) => {
                event[key] = values[index];
            });
            eventsObj.data.push(event);
        }
    }
}

// 解析CSV格式的行（处理逗号在引号内的情况）
function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// 解析Cue设置
function parseCueSettings(settingsLine) {
    const settings = {};
    const parts = settingsLine.split(' ');
    
    for (const part of parts) {
        const [key, value] = part.split(':');
        if (key && value) {
            settings[key] = value;
        }
    }
    
    return settings;
}
//兼容new Function，为了挂载到window对象上
if ( typeof window != 'undefined' ) {
	window.YbSubtitle = YbSubtitle
}