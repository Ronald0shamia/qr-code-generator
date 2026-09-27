/* global QRCode */
(function (window) {
    'use strict';

    var NS = 'http://www.w3.org/2000/svg';
    var ALIGNMENT_CENTERS = [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 30, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 46, 66, 122], [6, 30, 50, 76, 126], [6, 26, 52, 78, 130], [6, 30, 56, 82, 134], [6, 34, 60, 86, 138], [6, 30, 58, 90, 142], [6, 34, 62, 94, 146], [6, 30, 54, 78, 102, 150], [6, 24, 50, 76, 102, 154], [6, 28, 54, 80, 106, 158], [6, 32, 58, 84, 110, 162], [6, 26, 54, 86, 110, 166], [6, 30, 58, 86, 114, 170]];

    function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
    function hexToRgb(hex) {
        var match = /^#([0-9a-f]{6})$/i.exec(hex || '');
        return match ? match[1].match(/.{2}/g).map(function (part) { return parseInt(part, 16); }) : [20, 31, 42];
    }
    function mix(first, second, amount) {
        var a = hexToRgb(first), b = hexToRgb(second), part = clamp(amount, 0, 1);
        return '#' + a.map(function (channel, index) { return Math.round(channel + ((b[index] - channel) * part)).toString(16).padStart(2, '0'); }).join('');
    }
    function lighter(hex, amount) { return mix(hex, '#ffffff', amount); }
    function darker(hex, amount) { return mix(hex, '#000000', amount); }
    function pointString(points) { return points.map(function (point) { return point[0] + ',' + point[1]; }).join(' '); }
    function svgElement(name, attributes) {
        var node = document.createElementNS(NS, name);
        Object.keys(attributes).forEach(function (name) { node.setAttribute(name, attributes[name]); });
        return node;
    }
    function stableNoise(row, column) { return ((row * 67) + (column * 149) + (row * column * 13)) % 101; }
    function inBox(row, column, top, left, size) { return row >= top && row < top + size && column >= left && column < left + size; }

    function createMatrix(text) {
        var qr = new QRCode(document.createElement('div'), { text: text, correctLevel: QRCode.CorrectLevel.H, width: 1, height: 1 });
        var model = qr._oQRCode, count = model.getModuleCount(), matrix = [], row, column;
        for (row = 0; row < count; row += 1) {
            matrix[row] = [];
            for (column = 0; column < count; column += 1) { matrix[row][column] = model.isDark(row, column); }
        }
        return matrix;
    }

    function isFinderOrSeparator(row, column, count) {
        return inBox(row, column, -1, -1, 9) || inBox(row, column, -1, count - 8, 9) || inBox(row, column, count - 8, -1, 9);
    }

    function isAlignment(row, column, count) {
        var version = (count - 17) / 4, centers = ALIGNMENT_CENTERS[version - 1] || [], i, j;
        for (i = 0; i < centers.length; i += 1) {
            for (j = 0; j < centers.length; j += 1) {
                if (Math.abs(row - centers[i]) <= 2 && Math.abs(column - centers[j]) <= 2) { return true; }
            }
        }
        return false;
    }

    function protectedModule(row, column, count) {
        return isFinderOrSeparator(row, column, count) || row === 6 || column === 6 || isAlignment(row, column, count);
    }

    function normaliseOptions(raw) {
        raw = raw || {};
        return {
            background: raw.background || '#fffaf2',
            structure: raw.structure || '#14212b',
            blossom: raw.blossom || '#a63d57',
            ground: raw.ground || '#356a45',
            depth: clamp(Number(raw.depth) || 22, 16, 30),
            density: clamp(Number(raw.density) || 72, 35, 100),
            perspective: clamp(Number(raw.perspective) || 6, 0, 14),
            shadow: raw.shadow !== false,
            mode: raw.mode === 'artistic' ? 'artistic' : 'safe',
            quietZone: 4
        };
    }

    function moduleRole(row, column, count, options) {
        var x = (column + 0.5) / count, y = (row + 0.5) / count, distance, canopyWidth, density = options.mode === 'safe' ? Math.min(options.density, 78) : options.density;
        if (protectedModule(row, column, count)) { return 'anchor'; }
        if (y > 0.79) { return stableNoise(row, column) < 84 ? 'ground' : 'structure'; }
        if (y > 0.50 && y <= 0.83 && Math.abs(x - 0.5) < (y > 0.69 ? 0.075 : 0.13)) { return 'trunk'; }
        if (y > 0.42 && y < 0.73) {
            canopyWidth = 0.07 + ((0.73 - y) * 0.60);
            if (Math.abs(x - 0.5) < canopyWidth) { return stableNoise(row, column) < density ? 'branch' : 'structure'; }
        }
        distance = (((x - 0.5) * (x - 0.5)) / 0.1225) + (((y - 0.34) * (y - 0.34)) / 0.091);
        if (distance < 1 && stableNoise(row, column) < density) { return 'blossom'; }
        if (distance < 1.20 && stableNoise(row, column) < 62) { return 'foliage'; }
        return 'structure';
    }

    function roleColour(role, options) {
        if (role === 'trunk' || role === 'branch') { return mix(options.structure, '#754126', 0.78); }
        if (role === 'blossom') { return darker(options.blossom, 0.23); }
        if (role === 'foliage') { return mix(options.ground, options.blossom, 0.32); }
        if (role === 'ground') { return darker(options.ground, 0.18); }
        return options.structure;
    }

    function moduleFaces(x, y, size, role, row, column, count, options, paint) {
        var protectedCell = role === 'anchor', effectiveDepth = options.mode === 'safe' ? Math.min(options.depth, 8) : options.depth, depth = size * (effectiveDepth / 100), factor = protectedCell ? 0.48 : (0.55 + (options.perspective / 28)), top = Math.min(size * (protectedCell ? 0.15 : 0.30), depth * factor), side = Math.min(size * (protectedCell ? 0.12 : 0.23), depth * factor), base = options.mode === 'safe' ? options.structure : roleColour(role, options), accent = roleColour(role, options);
        paint('base', x, y, size, top, side, base, role);
        paint('top', x, y, size, top, side, lighter(base, protectedCell ? 0.08 : (options.mode === 'safe' ? 0.09 : 0.18)), role);
        paint('side', x, y, size, top, side, darker(base, 0.22), role);
        if (options.shadow && !protectedCell) { paint('shadow', x, y, size, Math.max(1, top * 0.34), side, '#000000', role); }
        if (role === 'trunk' || role === 'branch' || role === 'blossom' || role === 'foliage' || role === 'ground') { paint('detail', x, y, size, top, side, options.mode === 'safe' ? mix(base, accent, 0.12) : (role === 'blossom' ? lighter(options.blossom, 0.22) : lighter(base, 0.16)), role); }
    }

    function renderCanvasModule(context, x, y, size, role, row, column, count, options) {
        moduleFaces(x, y, size, role, row, column, count, options, function (face, px, py, width, top, side, fill, itemRole) {
            context.fillStyle = fill;
            if (face === 'base') { context.fillRect(px, py, width, width); return; }
            if (face === 'top') { context.beginPath(); context.moveTo(px, py); context.lineTo(px + width, py); context.lineTo(px + width - side, py + top); context.lineTo(px + side, py + top); context.closePath(); context.fill(); return; }
            if (face === 'side') { context.beginPath(); context.moveTo(px + width - side, py + top); context.lineTo(px + width, py); context.lineTo(px + width, py + width); context.lineTo(px + width - side, py + width - top); context.closePath(); context.fill(); return; }
            if (face === 'shadow') { context.globalAlpha = 0.18; context.fillRect(px + side, py + width - top, width - (side * 2), top); context.globalAlpha = 1; return; }
            context.save(); context.beginPath(); context.rect(px + (width * 0.16), py + (width * 0.17), width * 0.68, width * 0.66); context.clip();
            if (itemRole === 'blossom' && options.mode === 'artistic') { [[0.40, 0.45], [0.58, 0.43], [0.50, 0.59]].forEach(function (center) { context.beginPath(); context.arc(px + (width * center[0]), py + (width * center[1]), width * 0.16, 0, Math.PI * 2); context.fill(); }); }
            else if (itemRole === 'ground') { context.beginPath(); context.moveTo(px + width * 0.28, py + width * 0.76); context.lineTo(px + width * 0.43, py + width * 0.34); context.lineTo(px + width * 0.48, py + width * 0.76); context.lineTo(px + width * 0.62, py + width * 0.25); context.lineTo(px + width * 0.61, py + width * 0.76); context.closePath(); context.fill(); }
            else { context.fillRect(px + width * 0.30, py + width * 0.30, width * 0.40, width * 0.20); }
            context.restore();
        });
    }

    function renderSvgModule(svg, x, y, size, role, row, column, count, options) {
        moduleFaces(x, y, size, role, row, column, count, options, function (face, px, py, width, top, side, fill, itemRole) {
            if (face === 'base') { svg.appendChild(svgElement('rect', { x: px, y: py, width: width, height: width, fill: fill })); return; }
            if (face === 'top') { svg.appendChild(svgElement('polygon', { points: pointString([[px, py], [px + width, py], [px + width - side, py + top], [px + side, py + top]]), fill: fill })); return; }
            if (face === 'side') { svg.appendChild(svgElement('polygon', { points: pointString([[px + width - side, py + top], [px + width, py], [px + width, py + width], [px + width - side, py + width - top]]), fill: fill })); return; }
            if (face === 'shadow') { svg.appendChild(svgElement('rect', { x: px + side, y: py + width - top, width: width - (side * 2), height: top, fill: fill, opacity: '0.18' })); return; }
            if (itemRole === 'blossom' && options.mode === 'artistic') { [[0.40, 0.45], [0.58, 0.43], [0.50, 0.59]].forEach(function (center) { svg.appendChild(svgElement('circle', { cx: px + width * center[0], cy: py + width * center[1], r: width * 0.16, fill: fill })); }); }
            else if (itemRole === 'ground') { svg.appendChild(svgElement('polygon', { points: pointString([[px + width * 0.28, py + width * 0.76], [px + width * 0.43, py + width * 0.34], [px + width * 0.48, py + width * 0.76], [px + width * 0.62, py + width * 0.25], [px + width * 0.61, py + width * 0.76]]), fill: fill })); }
            else { svg.appendChild(svgElement('rect', { x: px + width * 0.30, y: py + width * 0.30, width: width * 0.40, height: width * 0.20, fill: fill })); }
        });
    }

    function render(text, outputSize, rawOptions) {
        var options = normaliseOptions(rawOptions), matrix = createMatrix(text), count = matrix.length, module = outputSize / (count + options.quietZone * 2), canvas = document.createElement('canvas'), context;
        canvas.width = outputSize; canvas.height = outputSize; context = canvas.getContext('2d', { alpha: false }); context.fillStyle = options.background; context.fillRect(0, 0, outputSize, outputSize);
        matrix.forEach(function (line, row) { line.forEach(function (dark, column) { if (dark) { var left = Math.floor((column + options.quietZone) * module), top = Math.floor((row + options.quietZone) * module), right = Math.ceil((column + options.quietZone + 1) * module), bottom = Math.ceil((row + options.quietZone + 1) * module); renderCanvasModule(context, left, top, Math.max(right - left, bottom - top), moduleRole(row, column, count, options), row, column, count, options); } }); });
        return { canvas: canvas, matrix: matrix };
    }

    function renderSvg(text, outputSize, rawOptions) {
        var options = normaliseOptions(rawOptions), matrix = createMatrix(text), count = matrix.length, module = outputSize / (count + options.quietZone * 2), svg = svgElement('svg', { xmlns: NS, width: outputSize, height: outputSize, viewBox: '0 0 ' + outputSize + ' ' + outputSize, role: 'img', 'aria-label': '3D blossom tree QR code' });
        svg.appendChild(svgElement('rect', { width: outputSize, height: outputSize, fill: options.background }));
        matrix.forEach(function (line, row) { line.forEach(function (dark, column) { if (dark) { renderSvgModule(svg, (column + options.quietZone) * module, (row + options.quietZone) * module, module, moduleRole(row, column, count, options), row, column, count, options); } }); });
        return new XMLSerializer().serializeToString(svg);
    }

    window.QRGTreeRenderer = { render: render, renderSvg: renderSvg };
}(window));
