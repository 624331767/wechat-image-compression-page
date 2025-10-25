/**
 * @description Cloudflare 域名管理页面交互脚本
 * @author Gemini
 * @date 2024-07-20
 */

// === 全局变量定义 ===
let currentZoneId = ''; // 当前操作的域名Zone ID
let currentRecordId = ''; // 当前操作的记录Record ID
let zones = []; // 缓存域名列表
let records = []; // 缓存当前域名的记录列表

// === 核心功能函数 ===

/**
 * @description 切换标签页
 * @param {string} tabId - 目标标签页的ID (e.g., 'zones', 'records')
 */
function switchTab(tabId) {
    const tab = new bootstrap.Tab(document.getElementById(`${tabId}-tab`));
    tab.show();
}

/**
 * @description 选择一个域名后，加载其DNS记录并切换到记录标签页
 * @param {string} zoneId - 被选中的域名ID
 */
function selectZone(zoneId) {
    currentZoneId = zoneId;
    switchTab('records');
    document.getElementById('zone-select').value = zoneId;
    loadDnsRecords();
}

/**
 * @description 编辑一条DNS记录，填充表单并显示模态框
 * @param {string} recordId - 被编辑的记录ID
 */
function editRecord(recordId) {
    currentRecordId = recordId;
    const record = records.find(r => r.id === recordId);
    if (!record) return;

    // 填充编辑表单
    document.getElementById('edit-record-type').value = record.type;
    document.getElementById('edit-record-name').value = record.name;
    document.getElementById('edit-record-content').value = record.content;
    document.getElementById('edit-record-ttl').value = record.ttl;
    document.getElementById('edit-record-proxied').checked = record.proxied;
    // 填充备注
    document.getElementById('edit-record-notes').value = record.comment || '';

    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('edit-modal'));
    modal.show();
}

/**
 * @description 关闭模态框
 */
function closeModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('edit-modal'));
    if (modal) {
        modal.hide();
    }
}

/**
 * @description 显示全局加载蒙层
 */
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

/**
 * @description 隐藏全局加载蒙层
 */
function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}


// === API 请求相关函数 ===

/**
 * @description 从后端获取并加载所有域名列表
 */
async function loadZones() {
    showLoading();
    try {
        const response = await fetch('/api-dns/zones');
        const data = await response.json();
        
        if (data.code === 200) {
            zones = data.data;
            const zonesTable = document.getElementById('zones-table');
            const zoneSelect = document.getElementById('zone-select');
            const addZoneSelect = document.getElementById('add-zone-select');
            
            // 渲染域名列表
            if (zones.length === 0) {
                zonesTable.innerHTML = `<tr><td colspan="3" class="empty-state"><i class="bi bi-inbox"></i><p>暂无域名数据</p></td></tr>`;
            } else {
                zonesTable.innerHTML = zones.map(zone => `
                    <tr>
                        <td data-label="域名">${zone.name}</td>
                        <td data-label="状态"><span class="status-badge active">活跃</span></td>
                        <td>
                            <button class="btn btn-primary btn-sm" onclick="selectZone('${zone.id}')">
                                <i class="bi bi-eye me-1"></i>查看记录
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

            // 填充下拉选择框
            const options = zones.map(zone => `<option value="${zone.id}">${zone.name}</option>`).join('');
            zoneSelect.innerHTML = '<option value="">请选择域名</option>' + options;
            addZoneSelect.innerHTML = '<option value="">请选择域名</option>' + options;
        } else {
            throw new Error(data.message || '加载域名列表失败');
        }
    } catch (error) {
        console.error('加载域名列表失败:', error);
        alert('加载域名列表失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * @description 根据选中的域名ID，获取并加载其DNS记录列表
 */
async function loadDnsRecords() {
    const zoneId = document.getElementById('zone-select').value;
    const recordsTable = document.getElementById('records-table');
    if (!zoneId) {
        recordsTable.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="bi bi-inbox"></i><p>请选择域名查看DNS记录</p></td></tr>`;
        return;
    }

    currentZoneId = zoneId;
    showLoading();

    try {
        const response = await fetch(`/api-dns/dns-records?zoneId=${zoneId}`);
        const data = await response.json();
        
        if (data.code === 200) {
            records = data.data;
            
            // 渲染DNS记录表格
            if (records.length === 0) {
                recordsTable.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="bi bi-inbox"></i><p>暂无DNS记录</p></td></tr>`;
            } else {
                recordsTable.innerHTML = records.map(record => `
                    <tr>
                        <td data-label="类型">${record.type}</td>
                        <td data-label="名称">${record.name}</td>
                        <td data-label="内容">${record.content}</td>
                        <td data-label="TTL">${record.ttl}</td>
                        <td data-label="备注">${record.comment || ''}</td>
                        <td data-label="代理状态">
                            <span class="status-badge ${record.proxied ? 'active' : 'inactive'}">
                                ${record.proxied ? '已代理' : '未代理'}
                            </span>
                        </td>
                        <td>
                            <div class="btn-group">
                                <button class="btn btn-primary btn-sm" onclick="editRecord('${record.id}')">
                                    <i class="bi bi-pencil me-1"></i>编辑
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="deleteRecord('${record.id}')">
                                    <i class="bi bi-trash me-1"></i>删除
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        } else {
            throw new Error(data.message || '加载DNS记录失败');
        }
    } catch (error) {
        console.error('加载DNS记录失败:', error);
        alert('加载DNS记录失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * @description 提交表单，添加一条新的DNS记录
 */
async function addDnsRecord() {
    showLoading();

    // 从表单获取数据
    const zoneId = document.getElementById('add-zone-select').value;
    const type = document.getElementById('record-type').value;
    const name = document.getElementById('record-name').value;
    const content = document.getElementById('record-content').value;
    const ttl = document.getElementById('record-ttl').value;
    const proxied = document.getElementById('record-proxied').checked;
    const comment = document.getElementById('record-notes').value; // 获取备注

    if (!zoneId || !type || !name || !content || !ttl) {
        alert('请填写所有必填字段');
        hideLoading();
        return;
    }

    try {
        const response = await fetch('/api-dns/dns-records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                zoneId, type, name, content,
                ttl: parseInt(ttl),
                proxied,
                comment, // 发送备注
            })
        });

        const data = await response.json();
        if (data.code === 200) {
            alert('添加记录成功');
            // 清空表单
            document.getElementById('record-name').value = '';
            document.getElementById('record-content').value = '';
            document.getElementById('record-ttl').value = '3600';
            document.getElementById('record-proxied').checked = true;
            document.getElementById('record-notes').value = '';
            // 切换到记录标签页并刷新
            selectZone(zoneId);
        } else {
            throw new Error(data.message || '添加记录失败');
        }
    } catch (error) {
        console.error('添加记录失败:', error);
        alert('添加记录失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * @description 提交更新，修改一条DNS记录
 */
async function updateDnsRecord() {
    showLoading();

    // 从编辑表单获取数据
    const type = document.getElementById('edit-record-type').value;
    const name = document.getElementById('edit-record-name').value;
    const content = document.getElementById('edit-record-content').value;
    const ttl = document.getElementById('edit-record-ttl').value;
    const proxied = document.getElementById('edit-record-proxied').checked;
    const comment = document.getElementById('edit-record-notes').value; // 获取备注

    if (!type || !name || !content || !ttl) {
        alert('请填写所有必填字段');
        hideLoading();
        return;
    }

    try {
        const response = await fetch('/api-dns/dns-records', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                zoneId: currentZoneId,
                recordId: currentRecordId,
                type, name, content,
                ttl: parseInt(ttl),
                proxied,
                comment, // 发送备注
            })
        });

        const data = await response.json();
        if (data.code === 200) {
            alert('更新记录成功');
            closeModal();
            loadDnsRecords(); // 刷新当前列表
        } else {
            throw new Error(data.message || '更新记录失败');
        }
    } catch (error) {
        console.error('更新记录失败:', error);
        alert('更新记录失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * @description 删除一条DNS记录
 * @param {string} recordId - 要删除的记录ID
 */
async function deleteRecord(recordId) {
    if (!currentZoneId) {
        alert('未选择任何域名，无法删除');
        return;
    }
    if (!confirm('确定要删除这条记录吗？此操作不可恢复。')) return;

    showLoading();

    try {
        const response = await fetch(`/api-dns/dns-records?zoneId=${currentZoneId}&recordId=${recordId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.code === 200) {
            alert('删除记录成功');
            loadDnsRecords(); // 刷新列表
        } else {
            throw new Error(data.message || '删除记录失败');
        }
    } catch (error) {
        console.error('删除记录失败:', error);
        alert(error.message || '删除记录失败');
    } finally {
        hideLoading();
    }
}

/**
 * @description 获取并显示用户公网IP信息
 */
async function loadIpInfo() {
    const ipInfoElement = document.getElementById('ip-info');
    try {
        // 使用一个稳定的API获取IP信息
        const response = await fetch('https://api.ip.sb/geoip');
        const data = await response.json();
        if (data.ip) {
            ipInfoElement.textContent = `IP: ${data.ip} (${data.country})`;
        } else {
            throw new Error('无法解析IP信息');
        }
    } catch (error) {
        console.error('获取IP信息失败:', error);
        ipInfoElement.textContent = 'IP: 获取失败';
    }
}


// === 事件监听与初始化 ===

// 当DOM加载完毕后执行
document.addEventListener('DOMContentLoaded', function() {
    loadZones(); // 初始化时加载域名列表
    loadIpInfo(); // 初始化时加载IP信息
});
