


// 保活监控接口
const sendkeepalive = async (req, res) => {
    try {
        // 这里可以添加保活逻辑，例如发送请求到 Render 应用
       return res.success({}, "保活请求成功");
    } catch (error) {
        console.error('保活请求失败:', error);
        return res.fail("保活请求失败", 500);
    }
}


module.exports = { sendkeepalive };