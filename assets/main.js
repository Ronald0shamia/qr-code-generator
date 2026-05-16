(function () {
    function initGenerator(container) {
        if (container.dataset.qrgReady === '1') {
            return;
        }

        const input = container.querySelector('.qrg-text');
        const generateBtn = container.querySelector('.qrg-generate');
        const resultDiv = container.querySelector('.qrg-result');
        const downloadBtn = container.querySelector('.qrg-download');
        const sizeSelect = container.querySelector('.qrg-size');
        const colorInput = container.querySelector('.qrg-color');
        const bgInput = container.querySelector('.qrg-bg');

        if (!input || !generateBtn || !resultDiv || !downloadBtn || !sizeSelect || !colorInput || !bgInput || typeof QRCode === 'undefined') {
            return;
        }

        container.dataset.qrgReady = '1';

        generateBtn.addEventListener('click', function () {
            const text = input.value.trim();

            if (!text) {
                input.focus();
                return;
            }

            resultDiv.innerHTML = '';
            downloadBtn.hidden = true;

            new QRCode(resultDiv, {
                text: text,
                width: parseInt(sizeSelect.value, 10),
                height: parseInt(sizeSelect.value, 10),
                colorDark: colorInput.value,
                colorLight: bgInput.value
            });

            window.setTimeout(function () {
                const image = resultDiv.querySelector('img');
                const canvas = resultDiv.querySelector('canvas');
                const source = image ? image.src : (canvas ? canvas.toDataURL('image/png') : '');

                if (!source) {
                    return;
                }

                downloadBtn.hidden = false;
                downloadBtn.onclick = function () {
                    const link = document.createElement('a');
                    link.download = 'qrcode.png';
                    link.href = source;
                    link.click();
                };
            }, 100);
        });
    }

    function initGenerators(root) {
        const scope = root || document;
        scope.querySelectorAll('.qrg-container').forEach(initGenerator);
    }

    window.qrgInitGenerators = initGenerators;

    document.addEventListener('DOMContentLoaded', function () {
        initGenerators(document);
    });
})();
