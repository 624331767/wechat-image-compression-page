
const nodemailer = require("nodemailer");

// 发送单封邮件
async function sendSingleEmail(smtpConfig, from, to, subject, text, html, retries = 2) {
    const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: { user: smtpConfig.user, pass: smtpConfig.pass }
    });

    const mailOptions = { from, to, subject, text, html };

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const info = await transporter.sendMail(mailOptions);
            return { to, status: "success", info };
        } catch (err) {
            if (attempt === retries) return { to, status: "fail", error: err.message };
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}


const sendEmail = async (req, res) => {
    const { smtpConfig, from, to, subject, text, html, batchRecipients, status = 1 } = req.body;

    // 基础验证
    if (!smtpConfig || !smtpConfig.host || !smtpConfig.port || !smtpConfig.user || !smtpConfig.pass) {

        return res.fail("缺少SMTP配置", 400);
    }
    if (!from || !subject || (!text && !html)) {

        return res.fail("缺少邮件必要信息", 400);
    }

    try {
        // 单发模式
        if (status === 1) {
            const result = await sendSingleEmail(smtpConfig, from, to, subject, text, html);

            const data = {
                total: 1,
                success: result.status === "success" ? 1 : 0,
                details: [{ to: result.to, status: result.status }]
            }

            return res.success(data, "单发完成");
        }

        // 群发模式（循环处理数组）
        if (status === 2) {
            // 验证数组有效性
            if (!Array.isArray(batchRecipients) || batchRecipients.length === 0) {

                return res.fail("群发收件人必须是不为空的数组", 400);
            }

            const results = [];
            // 核心：循环数组发送邮件
            for (const email of batchRecipients) {
                // 替换占位符
                const personalizedSubject = subject.replace(/{{to}}/g, email);
                const personalizedText = text ? text.replace(/{{to}}/g, email) : undefined;
                const personalizedHtml = html ? html.replace(/{{to}}/g, email) : undefined;

                const result = await sendSingleEmail(
                    smtpConfig, from, email, personalizedSubject, personalizedText, personalizedHtml
                );
                console.log(email, 'email');

                results.push(result);
                await new Promise(r => setTimeout(r, 2000)); // 间隔发送
            }

            const successCount = results.filter(r => r.status === "success").length;
            const list = results.map(r => ({ to: r.to, status: r.status }));
            const data = {
                total: batchRecipients.length,
                success: successCount,
                failed: batchRecipients.length - successCount,
                details: list
            }
            return res.success(data, "群发完成");
        }
        return res.fail("无效的发送模式", 400);
    } catch (error) {
        return res.fail('发送失败', 400, error.message);
    }
}


module.exports = { sendEmail };

