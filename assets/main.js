/* global QRCode, QRGTreeRenderer, BarcodeDetector */
(function () {
    'use strict';
    var validationMessage = 'Der 3D-QR-Code konnte nicht zuverlässig erkannt werden. Bitte versuchen Sie eine andere Einstellung.';
    function save(url, name) { var a = document.createElement('a'); a.href = url; a.download = name; a.click(); }
    function saveBlob(blob, name) { var url = URL.createObjectURL(blob); save(url, name); window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000); }
    function validate(canvas, expected) {
        if (!('BarcodeDetector' in window)) { return Promise.resolve(false); }
        return new Promise(function (resolve) { canvas.toBlob(function (blob) {
            if (!blob) { resolve(false); return; }
            new BarcodeDetector({ formats: ['qr_code'] }).detect(blob).then(function (codes) { resolve(codes.some(function (code) { return code.rawValue === expected; })); }).catch(function () { resolve(false); });
        }, 'image/png'); });
    }
    function initGenerator(container) {
        if (container.dataset.qrgReady === '1') { return; }
        var input = container.querySelector('.qrg-text'), generate = container.querySelector('.qrg-generate'), result = container.querySelector('.qrg-result'), downloads = container.querySelector('.qrg-downloads'), png = container.querySelector('.qrg-download'), svg = container.querySelector('.qrg-download-svg'), notice = container.querySelector('.qrg-validation'), size = container.querySelector('.qrg-size'), foreground = container.querySelector('.qrg-color'), background = container.querySelector('.qrg-bg'), modes = container.querySelectorAll('.qrg-design-mode'), treeOptions = container.querySelector('.qrg-tree-options'), depth = container.querySelector('.qrg-tree-depth'), depthOutput = container.querySelector('.qrg-tree-depth-output'), style = container.querySelector('.qrg-tree-style'), perspective = container.querySelector('.qrg-tree-perspective'), shadow = container.querySelector('.qrg-tree-shadow'), exportSize = container.querySelector('.qrg-export-size');
        if (!input || !generate || !result || !downloads || !window.QRCode || !window.QRGTreeRenderer) { return; }
        container.dataset.qrgReady = '1';
        function treeSelected() { return container.querySelector('.qrg-design-mode:checked').value === 'tree'; }
        function updateControls() { treeOptions.hidden = !treeSelected(); depthOutput.value = depth.value + '%'; depthOutput.textContent = depth.value + '%'; }
        modes.forEach(function (mode) { mode.addEventListener('change', updateControls); }); depth.addEventListener('input', updateControls); updateControls();
        generate.addEventListener('click', function () {
            var text = input.value.trim();
            if (!text) { input.focus(); return; }
            result.replaceChildren(); downloads.hidden = true; notice.hidden = true;
            if (!treeSelected()) {
                new QRCode(result, { text: text, width: parseInt(size.value, 10), height: parseInt(size.value, 10), colorDark: foreground.value, colorLight: background.value });
                window.setTimeout(function () { var image = result.querySelector('img'), canvas = result.querySelector('canvas'), source = image ? image.src : (canvas ? canvas.toDataURL('image/png') : ''); if (!source) { return; } downloads.hidden = false; svg.hidden = true; png.onclick = function () { save(source, 'qrcode.png'); }; }, 100);
                return;
            }
            generate.disabled = true; notice.hidden = false; notice.textContent = '3D-QR-Code wird geprüft …';
            var options = { foreground: foreground.value, background: background.value, depth: depth.value, style: style.value, perspective: perspective.value, shadow: shadow.checked };
            var preview = QRGTreeRenderer.render(text, Math.max(512, parseInt(size.value, 10) * 3), options).canvas;
            preview.className = 'qrg-tree-canvas'; preview.setAttribute('aria-label', '3D Tree QR Code preview'); result.appendChild(preview);
            var exportCanvas = QRGTreeRenderer.render(text, parseInt(exportSize.value, 10), options).canvas;
            validate(exportCanvas, text).then(function (ok) { generate.disabled = false; if (!ok) { notice.textContent = validationMessage; return; } notice.hidden = true; downloads.hidden = false; svg.hidden = false; png.onclick = function () { exportCanvas.toBlob(function (blob) { if (blob) { saveBlob(blob, '3d-tree-qrcode.png'); } }, 'image/png'); }; svg.onclick = function () { saveBlob(new Blob([QRGTreeRenderer.renderSvg(text, parseInt(exportSize.value, 10), options)], { type: 'image/svg+xml;charset=utf-8' }), '3d-tree-qrcode.svg'); }; }).catch(function () { generate.disabled = false; notice.textContent = validationMessage; });
        });
    }
    function initGenerators(root) { (root || document).querySelectorAll('.qrg-container').forEach(initGenerator); }
    window.qrgInitGenerators = initGenerators;
    document.addEventListener('DOMContentLoaded', function () { initGenerators(document); });
}());
