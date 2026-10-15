/* global QRCode, QRGTreeRenderer, BarcodeDetector, jsQR */
(function () {
    'use strict';

    var validationMessage = 'Der 3D-QR-Code konnte nicht zuverlässig erkannt werden. Bitte versuchen Sie eine andere Einstellung.';
    var treePalettes = {
        blossom: { blossom: '#a63d57', trunk: '#754126', ground: '#356a45' },
        golden: { blossom: '#a66a22', trunk: '#754126', ground: '#52633a' },
        blue: { blossom: '#267e9b', trunk: '#754126', ground: '#356a45' },
        purple: { blossom: '#70469b', trunk: '#754126', ground: '#356a45' }
    };

    function save(url, filename) {
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
    }

    function saveBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        save(url, filename);
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function nativeDecode(canvas) {
        if (!('BarcodeDetector' in window)) { return Promise.resolve(null); }
        return new BarcodeDetector({ formats: ['qr_code'] }).detect(canvas).then(function (codes) {
            return codes.length ? codes[0].rawValue : null;
        }).catch(function () { return null; });
    }

    function jsQrDecode(canvas) {
        if (typeof window.jsQR !== 'function') { return null; }
        var context = canvas.getContext('2d'), image = context.getImageData(0, 0, canvas.width, canvas.height), decoded = window.jsQR(image.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });
        return decoded ? decoded.data : null;
    }

    function validateArtwork(canvas, expected) {
        return nativeDecode(canvas).then(function (value) {
            if (value === expected) { return true; }
            // jsQR is bundled locally as a deterministic fallback for Firefox and older browsers.
            return new Promise(function (resolve) {
                window.requestAnimationFrame(function () { resolve(jsQrDecode(canvas) === expected); });
            });
        });
    }

    function validateSvgArtwork(markup, size, expected) {
        return new Promise(function (resolve) {
            var url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
            var image = new Image();
            image.onload = function () {
                var canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                canvas.getContext('2d').drawImage(image, 0, 0, size, size);
                URL.revokeObjectURL(url);
                validateArtwork(canvas, expected).then(resolve).catch(function () { resolve(false); });
            };
            image.onerror = function () { URL.revokeObjectURL(url); resolve(false); };
            image.src = url;
        });
    }

    function readTreeOptions(container) {
        return {
            structure: container.querySelector('.qrg-color').value,
            background: container.querySelector('.qrg-bg').value,
            blossom: container.querySelector('.qrg-tree-blossom').value,
            trunk: container.querySelector('.qrg-tree-trunk').value,
            ground: container.querySelector('.qrg-tree-ground').value,
            depth: container.querySelector('.qrg-tree-depth').value,
            density: container.querySelector('.qrg-tree-density').value,
            perspective: container.querySelector('.qrg-tree-perspective').value,
            shadow: container.querySelector('.qrg-tree-shadow').checked,
            mode: container.querySelector('.qrg-tree-mode').value
        };
    }

    function updateOutput(input, output, suffix) {
        output.value = input.value + suffix;
        output.textContent = input.value + suffix;
    }

    function initialiseGenerator(container) {
        if (container.dataset.qrgReady === '1') { return; }
        var input = container.querySelector('.qrg-text');
        var generate = container.querySelector('.qrg-generate');
        var result = container.querySelector('.qrg-result');
        var downloads = container.querySelector('.qrg-downloads');
        var png = container.querySelector('.qrg-download');
        var svg = container.querySelector('.qrg-download-svg');
        var notice = container.querySelector('.qrg-validation');
        var size = container.querySelector('.qrg-size');
        var modes = container.querySelectorAll('.qrg-design-mode');
        var treeOptions = container.querySelector('.qrg-tree-options');
        var depth = container.querySelector('.qrg-tree-depth');
        var depthOutput = container.querySelector('.qrg-tree-depth-output');
        var density = container.querySelector('.qrg-tree-density');
        var densityOutput = container.querySelector('.qrg-tree-density-output');
        var perspective = container.querySelector('.qrg-tree-perspective');
        var perspectiveOutput = container.querySelector('.qrg-tree-perspective-output');
        var treeStyle = container.querySelector('.qrg-tree-style');
        var renderToken = 0;

        if (!input || !generate || !result || !downloads || !window.QRCode || !window.QRGTreeRenderer) { return; }
        container.dataset.qrgReady = '1';

        function treeSelected() { return container.querySelector('.qrg-design-mode:checked').value === 'tree'; }
        function updateControls() {
            treeOptions.hidden = !treeSelected();
            updateOutput(depth, depthOutput, '%');
            updateOutput(density, densityOutput, '%');
            updateOutput(perspective, perspectiveOutput, '');
        }

        modes.forEach(function (mode) { mode.addEventListener('change', updateControls); });
        [depth, density, perspective].forEach(function (control) { control.addEventListener('input', updateControls); });
        treeStyle.addEventListener('change', function () {
            var palette = treePalettes[treeStyle.value];
            if (!palette) { return; }
            container.querySelector('.qrg-tree-blossom').value = palette.blossom;
            container.querySelector('.qrg-tree-trunk').value = palette.trunk;
            container.querySelector('.qrg-tree-ground').value = palette.ground;
        });
        updateControls();

        generate.addEventListener('click', function () {
            var text = input.value.trim();
            var request = ++renderToken;
            if (!text) { input.focus(); return; }
            result.replaceChildren();
            downloads.hidden = true;
            notice.hidden = true;

            if (!treeSelected()) {
                new QRCode(result, {
                    text: text,
                    width: parseInt(size.value, 10),
                    height: parseInt(size.value, 10),
                    colorDark: container.querySelector('.qrg-color').value,
                    colorLight: container.querySelector('.qrg-bg').value
                });
                window.setTimeout(function () {
                    var image = result.querySelector('img');
                    var canvas = result.querySelector('canvas');
                    var source = image ? image.src : (canvas ? canvas.toDataURL('image/png') : '');
                    if (!source) { return; }
                    downloads.hidden = false;
                    svg.hidden = true;
                    png.onclick = function () { save(source, 'qrcode.png'); };
                }, 100);
                return;
            }

            generate.disabled = true;
            notice.hidden = false;
            notice.classList.remove('qrg-validation-error');
            notice.textContent = '3D-QR-Code wird geprüft …';
            window.requestAnimationFrame(function () {
                if (request !== renderToken) { return; }
                var options = readTreeOptions(container);
                var previewSize = Math.max(640, parseInt(size.value, 10) * 3);
                var preview = QRGTreeRenderer.render(text, previewSize, options).canvas;
                var exportCanvas = QRGTreeRenderer.render(text, parseInt(container.querySelector('.qrg-export-size').value, 10), options).canvas;
                preview.className = 'qrg-tree-canvas';
                preview.setAttribute('aria-label', '3D blossom tree QR code preview');
                result.appendChild(preview);
                validateArtwork(exportCanvas, text).then(function (valid) {
                    if (request !== renderToken) { return; }
                    generate.disabled = false;
                    if (!valid) {
                        notice.classList.add('qrg-validation-error');
                        notice.textContent = validationMessage;
                        return;
                    }
                    notice.hidden = true;
                    downloads.hidden = false;
                    svg.hidden = true;
                    png.onclick = function () {
                        exportCanvas.toBlob(function (blob) { if (blob) { saveBlob(blob, 'mrs-3d-tree-qr.png'); } }, 'image/png');
                    };
                    var svgArtwork = QRGTreeRenderer.renderSvg(text, exportCanvas.width, options);
                    validateSvgArtwork(svgArtwork, exportCanvas.width, text).then(function (svgValid) {
                        if (request !== renderToken || !svgValid) { return; }
                        svg.hidden = false;
                        svg.onclick = function () { saveBlob(new Blob([svgArtwork], { type: 'image/svg+xml;charset=utf-8' }), 'mrs-3d-tree-qr.svg'); };
                    });
                }).catch(function () {
                    if (request !== renderToken) { return; }
                    generate.disabled = false;
                    notice.classList.add('qrg-validation-error');
                    notice.textContent = validationMessage;
                });
            });
        });
    }

    function initGenerators(root) { (root || document).querySelectorAll('.qrg-container').forEach(initialiseGenerator); }

    window.qrgInitGenerators = initGenerators;
    document.addEventListener('DOMContentLoaded', function () { initGenerators(document); });
}());
