/* global QRCode, QRGTreeRenderer, BarcodeDetector, jsQR */
(function () {
    'use strict';

    var validationMessage = 'Der 3D-QR-Code konnte nicht zuverlässig erkannt werden. Bitte versuchen Sie eine andere Einstellung.';
    var encodeMessage = 'Dieser Inhalt kann im 3D-Modus nicht kodiert werden (zu lang oder nicht unterstützte Zeichen). Bitte kürzen Sie den Text oder nutzen Sie das Standard-Design.';
    var CONSERVATIVE_OPTIONS = { mode: 'safe', depth: 16, density: 35, perspective: 0 };
    var treePalettes = {
        blossom: { blossom: '#a63d57', trunk: '#754126', ground: '#356a45' },
        golden: { blossom: '#a66a22', trunk: '#754126', ground: '#52633a' },
        blue: { blossom: '#267e9b', trunk: '#754126', ground: '#356a45' },
        purple: { blossom: '#70469b', trunk: '#754126', ground: '#356a45' },
        red: { blossom: '#c23b3b', trunk: '#754126', ground: '#4a7a38' },
        green: { blossom: '#3f8f3a', trunk: '#6b4326', ground: '#5a8f3a' }
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
        var viewToggle = container.querySelector('.qrg-view-toggle');
        var viewScene = container.querySelector('.qrg-view-scene');
        var viewQr = container.querySelector('.qrg-view-qr');
        var viewHint = container.querySelector('.qrg-view-hint');
        var sceneButton = container.querySelector('.qrg-download-scene');
        var renderToken = 0;
        var autoUpdate = false;
        var updateTimer = 0;

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
        (function buildSwatches() {
            var dots = document.createElement('div'), label = treeStyle.closest('label');
            dots.className = 'qrg-swatches'; dots.setAttribute('role', 'group'); dots.setAttribute('aria-label', 'Baumfarbe');
            Object.keys(treePalettes).forEach(function (key) {
                var dot = document.createElement('button');
                dot.type = 'button'; dot.className = 'qrg-swatch'; dot.dataset.style = key; dot.style.backgroundColor = treePalettes[key].blossom;
                dot.setAttribute('aria-label', treeStyle.querySelector('option[value="' + key + '"]').textContent);
                dot.addEventListener('click', function () { treeStyle.value = key; treeStyle.dispatchEvent(new Event('change', { bubbles: true })); });
                dots.appendChild(dot);
            });
            label.parentNode.insertBefore(dots, label.nextSibling);
            function mark() { dots.querySelectorAll('.qrg-swatch').forEach(function (dot) { dot.setAttribute('aria-pressed', dot.dataset.style === treeStyle.value ? 'true' : 'false'); }); }
            treeStyle.addEventListener('change', mark); mark();
        }());

        /* Two views of the same artwork, like the reference: the scene (illustration) and the flat, scan-validated QR code. */
        var sceneCanvas = null, qrCanvas = null;
        function showView(name) {
            var scene = name === 'scene' && sceneCanvas;
            if (sceneCanvas) { sceneCanvas.hidden = !scene; }
            if (qrCanvas) { qrCanvas.hidden = !!scene; }
            viewScene.setAttribute('aria-pressed', scene ? 'true' : 'false');
            viewQr.setAttribute('aria-pressed', scene ? 'false' : 'true');
            viewHint.hidden = !scene;
        }
        viewScene.addEventListener('click', function () { showView('scene'); });
        viewQr.addEventListener('click', function () { showView('qr'); });

        updateControls();

        function run() {
            var text = input.value.trim();
            var request = ++renderToken;
            if (!text) { input.focus(); return; }
            result.replaceChildren();
            downloads.hidden = true;
            notice.hidden = true;
            viewToggle.hidden = true; viewHint.hidden = true; sceneCanvas = null; qrCanvas = null;

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

            autoUpdate = true;
            renderTree(text, request);
        }

        function showNotice(message, isError) {
            notice.hidden = false;
            notice.classList.toggle('qrg-validation-error', !!isError);
            notice.textContent = message;
        }

        function renderTree(text, request) {
            var base = readTreeOptions(container);
            var exportSize = parseInt(container.querySelector('.qrg-export-size').value, 10);
            var conservative = Object.assign({}, base, CONSERVATIVE_OPTIONS);
            var attempts = [{ options: base, fallback: false }];
            if (JSON.stringify(base) !== JSON.stringify(conservative)) { attempts.push({ options: conservative, fallback: true }); }

            generate.disabled = true;
            showNotice('3D-QR-Code wird geprüft …', false);

            function fail(message) {
                if (request !== renderToken) { return; }
                generate.disabled = false;
                result.replaceChildren();
                downloads.hidden = true;
                viewToggle.hidden = true; viewHint.hidden = true; sceneCanvas = null; qrCanvas = null;
                showNotice(message || validationMessage, true);
            }

            function succeed(canvas, attempt) {
                if (request !== renderToken) { return; }
                var svgArtwork;
                generate.disabled = false;
                canvas.className = 'qrg-tree-canvas';
                canvas.setAttribute('aria-label', '3D blossom tree QR code preview');
                qrCanvas = canvas;
                result.replaceChildren(canvas);
                sceneCanvas = null;
                try {
                    sceneCanvas = QRGTreeRenderer.renderScene(text, Math.min(canvas.width, 1600), attempt.options);
                    sceneCanvas.className = 'qrg-tree-canvas qrg-scene-canvas';
                    sceneCanvas.setAttribute('aria-label', '3D Szene: Baum auf einer Plattform, deren Boden der QR-Code ist (Illustration, nicht zum Scannen)');
                    sceneCanvas.title = 'Tippen, um den QR-Code zu sehen';
                    sceneCanvas.addEventListener('click', function () { showView('qr'); });
                    result.appendChild(sceneCanvas);
                } catch (sceneError) { sceneCanvas = null; /* the scene is optional: the validated QR code is still delivered */ }
                viewToggle.hidden = !sceneCanvas;
                sceneButton.hidden = !sceneCanvas;
                if (sceneCanvas) { sceneButton.onclick = function () { sceneCanvas.toBlob(function (blob) { if (blob) { saveBlob(blob, 'mrs-3d-tree-szene.png'); } }, 'image/png'); }; }
                showView(sceneCanvas ? 'scene' : 'qr');
                if (attempt.fallback) {
                    showNotice('Hinweis: Mit konservativeren Effekt-Einstellungen erzeugt, damit der Code zuverlässig scanbar ist.', false);
                } else {
                    notice.hidden = true;
                }
                downloads.hidden = false;
                svg.hidden = true;
                png.onclick = function () {
                    canvas.toBlob(function (blob) { if (blob) { saveBlob(blob, 'mrs-3d-tree-qr.png'); } }, 'image/png');
                };
                try { svgArtwork = QRGTreeRenderer.renderSvg(text, canvas.width, attempt.options); } catch (error) { return; }
                validateSvgArtwork(svgArtwork, canvas.width, text).then(function (svgValid) {
                    if (request !== renderToken || !svgValid) { return; }
                    svg.hidden = false;
                    svg.onclick = function () { saveBlob(new Blob([svgArtwork], { type: 'image/svg+xml;charset=utf-8' }), 'mrs-3d-tree-qr.svg'); };
                }).catch(function () { /* SVG is optional: if it cannot be verified, only the PNG download is offered */ });
            }

            function attempt(index) {
                var current = attempts[index], canvas;
                if (request !== renderToken) { return; }
                if (!current) { fail(); return; }
                try {
                    canvas = QRGTreeRenderer.render(text, exportSize, current.options).canvas;
                } catch (error) {
                    fail(encodeMessage); // the encoder rejected the content (too long / unsupported characters); retrying cannot help
                    return;
                }
                // The validated image is the exact image shown as preview and offered for download.
                validateArtwork(canvas, text).then(function (valid) {
                    if (valid) { succeed(canvas, current); } else { attempt(index + 1); }
                }).catch(function () { attempt(index + 1); });
            }

            window.requestAnimationFrame(function () { attempt(0); });
        }

        generate.addEventListener('click', run);

        // Live preview: once a 3D result exists, setting changes re-render (debounced). Stale renders are discarded via renderToken.
        function scheduleUpdate() {
            if (!autoUpdate || !treeSelected() || !input.value.trim()) { return; }
            window.clearTimeout(updateTimer);
            updateTimer = window.setTimeout(run, 500);
        }
        container.addEventListener('input', scheduleUpdate);
        container.addEventListener('change', function (event) {
            if (event.target.classList && event.target.classList.contains('qrg-design-mode')) { return; }
            scheduleUpdate();
        });
    }

    function initGenerators(root) { (root || document).querySelectorAll('.qrg-container').forEach(initialiseGenerator); }

    window.qrgInitGenerators = initGenerators;
    document.addEventListener('DOMContentLoaded', function () { initGenerators(document); });
}());
