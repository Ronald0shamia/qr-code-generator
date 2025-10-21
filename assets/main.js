document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('qrg-text');
    const generateBtn = document.getElementById('qrg-generate');
    const resultDiv = document.getElementById('qrg-result');
    const downloadBtn = document.getElementById('qrg-download');

    generateBtn.addEventListener('click', () => {
        const text = input.value.trim();
        if (!text) {
            alert('Bitte gib einen Text oder eine URL ein!');
            return;
        }

        resultDiv.innerHTML = '';
        const qr = new QRCode(resultDiv, {
            text: text,
            width: 200,
            height: 200
        });

        setTimeout(() => {
            const img = resultDiv.querySelector('img');
            if (img) {
                downloadBtn.style.display = 'inline-block';
                downloadBtn.onclick = () => {
                    const link = document.createElement('a');
                    link.download = 'qrcode.png';
                    link.href = img.src;
                    link.click();
                };
            }
        }, 500);
    });
});
