/* global QRCode */
(function (window) {
    'use strict';
    var NS = 'http://www.w3.org/2000/svg';
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    function colour(hex, amount) {
        var found = /^#([0-9a-f]{6})$/i.exec(hex || '#111111');
        var channels = found ? found[1].match(/.{2}/g).map(function (p) { return parseInt(p, 16); }) : [17, 17, 17];
        return '#' + channels.map(function (c) { return clamp(Math.round(c + (amount * 255)), 0, 255).toString(16).padStart(2, '0'); }).join('');
    }
    function shade(row, count, style) { var p = row / Math.max(1, count - 1); return style === 'sculpted' ? 0.12 + (Math.sin(p * Math.PI * 3) * 0.05) : 0.06 + ((1 - p) * 0.11); }
    function svgNode(name, attrs) { var n = document.createElementNS(NS, name); Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); }); return n; }
    function points(p) { return p.map(function (v) { return v[0] + ',' + v[1]; }).join(' '); }
    function faces(x, y, module, row, count, options, add) {
        var perspective = options.perspective === 'soft' ? 0.72 : 1;
        var depth = module * (options.depth / 100), top = Math.min(module * 0.34, depth * 0.75 * perspective), side = Math.min(module * 0.26, depth * 0.55 * perspective);
        add('base', x, y, module, top, side, options.foreground);
        add('top', x, y, module, top, side, colour(options.foreground, shade(row, count, options.style)));
        add('side', x, y, module, top, side, colour(options.foreground, -0.18));
        if (options.shadow) { add('shadow', x, y, module, Math.max(1, top * 0.42), side, '#000000'); }
    }
    function matrixFor(text) {
        var qr = new QRCode(document.createElement('div'), { text: text, correctLevel: QRCode.CorrectLevel.H, width: 1, height: 1 });
        var model = qr._oQRCode, count = model.getModuleCount(), matrix = [];
        for (var row = 0; row < count; row += 1) { matrix[row] = []; for (var col = 0; col < count; col += 1) { matrix[row][col] = model.isDark(row, col); } }
        return matrix;
    }
    function optionsFor(options) { options = options || {}; return { foreground: options.foreground || '#111111', background: options.background || '#ffffff', depth: clamp(Number(options.depth) || 25, 20, 30), style: options.style === 'sculpted' ? 'sculpted' : 'evergreen', perspective: options.perspective === 'soft' ? 'soft' : 'subtle', shadow: options.shadow !== false, quiet: 4 }; }
    function render(text, size, rawOptions) {
        var options = optionsFor(rawOptions), matrix = matrixFor(text), count = matrix.length, module = size / (count + options.quiet * 2), canvas = document.createElement('canvas'), ctx;
        canvas.width = size; canvas.height = size; ctx = canvas.getContext('2d', { alpha: false }); ctx.fillStyle = options.background; ctx.fillRect(0, 0, size, size);
        matrix.forEach(function (line, row) { line.forEach(function (dark, col) { if (!dark) { return; } var x = (col + options.quiet) * module, y = (row + options.quiet) * module; faces(x, y, module, row, count, options, function (type, px, py, w, h, side, fill) {
            ctx.fillStyle = fill;
            if (type === 'base') { ctx.fillRect(px, py, w, w); }
            else if (type === 'top') { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + w, py); ctx.lineTo(px + w - side, py + h); ctx.lineTo(px + side, py + h); ctx.closePath(); ctx.fill(); }
            else if (type === 'side') { ctx.beginPath(); ctx.moveTo(px + w - side, py + h); ctx.lineTo(px + w, py); ctx.lineTo(px + w, py + w); ctx.lineTo(px + w - side, py + w - h); ctx.closePath(); ctx.fill(); }
            else { ctx.globalAlpha = 0.18; ctx.fillRect(px + side, py + w - h, w - side * 2, h); ctx.globalAlpha = 1; }
        }); }); });
        return { canvas: canvas };
    }
    function renderSvg(text, size, rawOptions) {
        var options = optionsFor(rawOptions), matrix = matrixFor(text), count = matrix.length, module = size / (count + options.quiet * 2), svg = svgNode('svg', { xmlns: NS, width: size, height: size, viewBox: '0 0 ' + size + ' ' + size });
        svg.appendChild(svgNode('rect', { width: size, height: size, fill: options.background }));
        matrix.forEach(function (line, row) { line.forEach(function (dark, col) { if (!dark) { return; } var x = (col + options.quiet) * module, y = (row + options.quiet) * module; faces(x, y, module, row, count, options, function (type, px, py, w, h, side, fill) {
            if (type === 'base') { svg.appendChild(svgNode('rect', { x: px, y: py, width: w, height: w, fill: fill })); }
            else if (type === 'top') { svg.appendChild(svgNode('polygon', { points: points([[px, py], [px + w, py], [px + w - side, py + h], [px + side, py + h]]), fill: fill })); }
            else if (type === 'side') { svg.appendChild(svgNode('polygon', { points: points([[px + w - side, py + h], [px + w, py], [px + w, py + w], [px + w - side, py + w - h]]), fill: fill })); }
            else { svg.appendChild(svgNode('rect', { x: px + side, y: py + w - h, width: w - side * 2, height: h, fill: fill, opacity: '0.18' })); }
        }); }); });
        return new XMLSerializer().serializeToString(svg);
    }
    window.QRGTreeRenderer = { render: render, renderSvg: renderSvg };
}(window));
