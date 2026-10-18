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
            trunk: raw.trunk || '#754126',
            ground: raw.ground || '#356a45',
            depth: clamp(Number(raw.depth) || 22, 16, 30),
            density: clamp(Number(raw.density) || 72, 35, 100),
            perspective: clamp(Number(raw.perspective) || 6, 0, 14),
            shadow: raw.shadow !== false,
            mode: raw.mode === 'artistic' ? 'artistic' : (raw.mode === 'safe' ? 'safe' : 'garden'),
            quietZone: 4
        };
    }

    function moduleRole(row, column, count, options) {
        var x = (column + 0.5) / count, y = (row + 0.5) / count, distance, canopyWidth, density = options.mode === 'safe' ? Math.min(options.density, 78) : options.density;
        if (options.mode === 'garden') { return isFinderOrSeparator(row, column, count) ? 'grass' : 'leaf'; }
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

    function luminance(hex) { var c = hexToRgb(hex); return Math.max((0.299 * c[0]) + (0.587 * c[1]) + (0.114 * c[2]), (0.2126 * c[0]) + (0.7152 * c[1]) + (0.0722 * c[2])); }
    /* Keep every dark module dark enough for a decoder's light/dark threshold, whatever colour the user picked. */
    function ensureDark(hex, maximum) { var value = luminance(hex); return value <= maximum ? hex : darker(hex, 1 - (maximum / value)); }
    function tone(hex, amount) { return amount >= 0 ? lighter(hex, amount) : darker(hex, -amount); }
    function gardenColour(role, options, row, column) {
        var noise = (stableNoise(row, column) - 50) / 50;
        if (role === 'grass') { return ensureDark(tone(mix(options.ground, '#9aa12c', 0.30 + (Math.abs(noise) * 0.30)), noise * 0.10), 74); }
        return ensureDark(tone(options.blossom, noise * 0.16), 82);
    }

    function roleColour(role, options, row, column) {
        if (role === 'leaf' || role === 'grass') { return gardenColour(role, options, row, column); }
        if (role === 'trunk' || role === 'branch') { return mix(options.structure, options.trunk, 0.78); }
        if (role === 'blossom') { return darker(options.blossom, 0.23); }
        if (role === 'foliage') { return mix(options.ground, options.blossom, 0.32); }
        if (role === 'ground') { return darker(options.ground, 0.18); }
        return options.structure;
    }

    function moduleFaces(x, y, size, role, row, column, count, options, paint) {
        var protectedCell = role === 'anchor', effectiveDepth = options.mode === 'artistic' ? options.depth : Math.min(options.depth, 8), depth = size * (effectiveDepth / 100), factor = protectedCell ? 0.48 : (0.55 + (options.perspective / 28)), top = Math.min(size * (protectedCell ? 0.15 : 0.30), depth * factor), side = Math.min(size * (protectedCell ? 0.12 : 0.23), depth * factor), base = options.mode === 'safe' ? options.structure : roleColour(role, options, row, column), accent = roleColour(role, options, row, column);
        /* Thick edge faces confuse decoders at large export sizes (tested): keep the bevel to a hairline unless in artistic mode. */
        if (options.mode !== 'artistic') { top = size > 32 ? 0 : Math.min(top, 1); side = size > 32 ? 0 : Math.min(side, 1); }
        paint('base', x, y, size, top, side, base, role);
        paint('top', x, y, size, top, side, lighter(base, protectedCell ? 0.08 : (options.mode === 'artistic' ? 0.18 : 0.12)), role);
        paint('side', x, y, size, top, side, darker(base, 0.22), role);
        if (options.shadow && !protectedCell && options.mode === 'artistic') { paint('shadow', x, y, size, Math.max(1, top * 0.34), side, '#000000', role); }
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

    /* ------------------------------------------------------------------
     * Shared drawing primitives (canvas and SVG use the same geometry)
     * ------------------------------------------------------------------ */
    function ngon(cx, cy, radius, sides, rotation) {
        var points = [], i, angle;
        for (i = 0; i < sides; i += 1) { angle = rotation + ((Math.PI * 2 * i) / sides); points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]); }
        return points;
    }
    function poly(points, fill, opacity) { return { t: 'poly', pts: points, fill: fill, op: opacity === undefined ? 1 : opacity }; }
    function quad(x1, y1, x2, y2, width, fill) {
        var dx = x2 - x1, dy = y2 - y1, length = Math.sqrt((dx * dx) + (dy * dy)) || 1, nx = (-dy / length) * (width / 2), ny = (dx / length) * (width / 2);
        return poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]], fill, 1);
    }
    function round2(value) { return Math.round(value * 100) / 100; }
    function paintPrimitivesCanvas(context, primitives) {
        primitives.forEach(function (item) {
            context.globalAlpha = item.op; context.fillStyle = item.fill;
            if (item.t === 'poly') { context.beginPath(); item.pts.forEach(function (point, index) { if (index) { context.lineTo(point[0], point[1]); } else { context.moveTo(point[0], point[1]); } }); context.closePath(); context.fill(); }
            else if (item.t === 'ellipse') { context.beginPath(); context.ellipse(item.cx, item.cy, item.rx, item.ry, 0, 0, Math.PI * 2); context.fill(); }
            else { context.fillRect(item.x, item.y, item.w, item.h); }
        });
        context.globalAlpha = 1;
    }

    /* ------------------------------------------------------------------
     * Flat view: the scannable QR code (this is what gets validated + downloaded)
     * ------------------------------------------------------------------ */
    function tileLayout(size, count) {
        var span = count + 8, module = Math.max(1, Math.floor(size / span)), tile = module * span, offset = Math.floor((size - tile) / 2);
        return { module: module, tile: tile, x: offset, y: offset };
    }

    function render(text, outputSize, rawOptions) {
        var options = normaliseOptions(rawOptions), matrix = createMatrix(text), count = matrix.length, layout = tileLayout(outputSize, count), canvas = document.createElement('canvas'), context;
        canvas.width = outputSize; canvas.height = outputSize; context = canvas.getContext('2d', { alpha: false }); context.fillStyle = options.background; context.fillRect(0, 0, outputSize, outputSize);
        matrix.forEach(function (line, row) { line.forEach(function (dark, column) { if (dark) { renderCanvasModule(context, layout.x + ((column + options.quietZone) * layout.module), layout.y + ((row + options.quietZone) * layout.module), layout.module, moduleRole(row, column, count, options), row, column, count, options); } }); });
        return { canvas: canvas, matrix: matrix };
    }

    function renderSvg(text, outputSize, rawOptions) {
        var options = normaliseOptions(rawOptions), matrix = createMatrix(text), count = matrix.length, layout = tileLayout(outputSize, count), svg = svgElement('svg', { xmlns: NS, width: outputSize, height: outputSize, viewBox: '0 0 ' + outputSize + ' ' + outputSize, role: 'img', 'aria-label': '3D blossom tree QR code' });
        svg.appendChild(svgElement('rect', { width: outputSize, height: outputSize, fill: options.background }));
        matrix.forEach(function (line, row) { line.forEach(function (dark, column) { if (dark) { renderSvgModule(svg, layout.x + ((column + options.quietZone) * layout.module), layout.y + ((row + options.quietZone) * layout.module), layout.module, moduleRole(row, column, count, options), row, column, count, options); } }); });
        return new XMLSerializer().serializeToString(svg);
    }

    /* ------------------------------------------------------------------
     * Scene view: isometric miniature diorama (illustration, driven by the QR matrix)
     *  - the platform floor IS the QR code (rotated so the empty corner is at the back)
     *  - the three finder patterns grow grass
     *  - a voxel-style tree stands in the centre: tapered trunk, branches, dense leaf crown
     * The scene is decorative: the tree hides part of the floor, so only the flat view is scan-validated.
     * ------------------------------------------------------------------ */
    function seededRandom(seed) {
        return function () {
            var t;
            seed = (seed + 0x6D2B79F5) | 0;
            t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function hashText(text) { var hash = 5381, i; for (i = 0; i < text.length; i += 1) { hash = (Math.imul(hash, 33) + text.charCodeAt(i)) | 0; } return hash; }

    /* Scene leaves keep the palette hue but get a lively, light tone (plain lightening would wash colours out to beige/grey). */
    function leafTone(hex, lightness) {
        var c = hexToRgb(hex).map(function (v) { return v / 255; }), max = Math.max(c[0], c[1], c[2]), min = Math.min(c[0], c[1], c[2]), d = max - min, h = 0, sat, l = (max + min) / 2, q, p;
        if (d) { h = max === c[0] ? ((c[1] - c[2]) / d) % 6 : (max === c[1] ? ((c[2] - c[0]) / d) + 2 : ((c[0] - c[1]) / d) + 4); h /= 6; if (h < 0) { h += 1; } }
        sat = clamp(d ? d / (1 - Math.abs((2 * l) - 1)) : 0, 0.55, 0.85);
        q = lightness < 0.5 ? lightness * (1 + sat) : lightness + sat - (lightness * sat); p = (2 * lightness) - q;
        function channel(t) { t = (t + 1) % 1; if (t < 1 / 6) { return p + ((q - p) * 6 * t); } if (t < 0.5) { return q; } if (t < 2 / 3) { return p + ((q - p) * (2 / 3 - t) * 6); } return p; }
        return '#' + [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)].map(function (v) { return Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0'); }).join('');
    }

    function buildDiorama(text, size, matrix, options) {
        var N = matrix.length, M = N + 2, u = size / (2.15 * M), cx = size / 2, oy = (size * 0.64) - ((M * u) / 2), prims = [], random = seededRandom(hashText(text)), i, j, a, b, r, c, finder;
        var leaf = leafTone(options.blossom, 0.67), grass = mix('#8ccf47', options.ground, 0.22), cream = '#efe9de', stone = '#c8c1b4', treeUnits = 1.15 * M, trunkUnits = 0.40 * treeUnits, crownRadius = 0.42 * M, crownZ = 0.66 * treeUnits, crownHalf = 0.32 * treeUnits, thickness = 0.9;
        function P(wa, wb, z) { return [cx + ((wa - wb) * u), oy + (((wa + wb) * u) / 2) - (z * u)]; }
        function cell(wa, wb, z, fill, opacity) { return poly([P(wa, wb, z), P(wa + 1, wb, z), P(wa + 1, wb + 1, z), P(wa, wb + 1, z)], fill, opacity); }
        function inFinder(row, column) { return (row < 7 && column < 7) || (row < 7 && column >= N - 7) || (row >= N - 7 && column < 7); }

        /* soft shadow below the platform + stone sides */
        if (options.shadow) { for (i = 0; i < 4; i += 1) { prims.push({ t: 'ellipse', cx: cx, cy: P(M / 2, M / 2, -thickness)[1] + (u * 0.6), rx: M * u * (1.00 - (i * 0.05)), ry: M * u * (0.54 - (i * 0.03)), fill: '#5b4a35', op: 0.045 }); } }
        prims.push(poly([P(0, M, 0), P(M, M, 0), P(M, M, -thickness), P(0, M, -thickness)], '#b4ada1', 1));
        prims.push(poly([P(M, 0, 0), P(M, M, 0), P(M, M, -thickness), P(M, 0, -thickness)], '#968f83', 1));

        /* floor: the QR matrix, rotated 180 degrees so the code-free corner points to the back */
        for (b = 0; b < M; b += 1) {
            for (a = 0; a < M; a += 1) {
                i = a - 1; j = b - 1; c = N - 1 - i; r = N - 1 - j;
                if (i < 0 || j < 0 || i >= N || j >= N) { r = -1; c = -1; }
                finder = r >= 0 && inFinder(r, c);
                if (r >= 0 && matrix[r][c]) {
                    prims.push(cell(a, b, 0, finder ? tone(mix(options.ground, '#6a8f3a', 0.35), ((stableNoise(r, c) - 50) / 50) * 0.08) : tone(stone, ((stableNoise(r, c) - 50) / 50) * 0.05), 1));
                } else {
                    prims.push(poly([P(a, b + 1, 0.30), P(a + 1, b + 1, 0.30), P(a + 1, b + 1, 0), P(a, b + 1, 0)], darker(cream, 0.10), 1));
                    prims.push(poly([P(a + 1, b, 0.30), P(a + 1, b + 1, 0.30), P(a + 1, b + 1, 0), P(a + 1, b, 0)], darker(cream, 0.20), 1));
                    prims.push(cell(a, b, 0.30, tone(cream, (((r < 0 ? a * 7 + b : stableNoise(r, c)) % 21) - 10) / 10 * 0.025), 1));
                }
            }
        }

        /* crown shadow on the ground + fallen petals */
        if (options.shadow) { for (i = 0; i < 3; i += 1) { prims.push({ t: 'ellipse', cx: cx, cy: P(M / 2, M / 2, 0.3)[1], rx: crownRadius * u * (1.30 - (i * 0.18)), ry: crownRadius * u * (0.65 - (i * 0.09)), fill: '#3a3226', op: 0.07 }); } }
        for (i = 0; i < 90; i += 1) {
            a = (M / 2) + ((random() - 0.5) * crownRadius * 2.3); b = (M / 2) + ((random() - 0.5) * crownRadius * 2.3);
            if (Math.abs(a - (M / 2)) + Math.abs(b - (M / 2)) < 1.2 || a < 1 || b < 1 || a > M - 1 || b > M - 1) { continue; }
            prims.push(poly(ngon(P(a, b, 0.32)[0], P(a, b, 0.32)[1], u * (0.28 + (random() * 0.25)), 5, random() * 6), i % 4 === 0 ? '#ffffff' : lighter(leaf, 0.12 + (random() * 0.25)), 0.92));
        }

        /* grass tufts on the three finder patterns */
        for (b = 0; b < M; b += 1) {
            for (a = 0; a < M; a += 1) {
                i = a - 1; j = b - 1; c = N - 1 - i; r = N - 1 - j;
                if (i < 0 || j < 0 || i >= N || j >= N || !matrix[r][c] || !inFinder(r, c)) { continue; }
                for (finder = 0; finder < 6; finder += 1) {
                    var baseX = a + 0.15 + (random() * 0.7), baseY = b + 0.15 + (random() * 0.7), height = 0.55 + (random() * 0.95), lean = (random() - 0.5) * 0.9, root = P(baseX, baseY, 0), width = u * 0.15;
                    prims.push(poly([[root[0] - width, root[1]], [root[0] + width, root[1]], [root[0] + (lean * u), root[1] - (height * u)]], tone(grass, ((random() - 0.4) * 0.42)), 1));
                }
            }
        }

        /* trunk: tapered, lit from the top left, with bark strokes and a flared base */
        (function () {
            var base = P(M / 2, M / 2, 0), topY = base[1] - (trunkUnits * u), wb = 1.6 * u, wt = 0.95 * u, k;
            prims.push(poly([[base[0] - (wb * 1.5), base[1] + (wb * 0.45)], [base[0] - wb, base[1] - (u * 0.3)], [base[0] + wb, base[1] - (u * 0.3)], [base[0] + (wb * 1.5), base[1] + (wb * 0.45)], [base[0], base[1] + (wb * 0.8)]], darker(options.trunk, 0.30), 1));
            prims.push(poly([[base[0] - wb, base[1]], [base[0], base[1] + (wb * 0.45)], [base[0], topY + (wt * 0.45)], [base[0] - wt, topY]], lighter(options.trunk, 0.10), 1));
            prims.push(poly([[base[0], base[1] + (wb * 0.45)], [base[0] + wb, base[1]], [base[0] + wt, topY], [base[0], topY + (wt * 0.45)]], darker(options.trunk, 0.28), 1));
            for (k = 0; k < 14; k += 1) {
                var side = random() < 0.5 ? -1 : 1, px = base[0] + (side * random() * wb * 0.8), py = base[1] - (random() * trunkUnits * u * 0.9);
                prims.push(quad(px, py, px + ((random() - 0.5) * u * 0.1), py - (u * (0.4 + (random() * 0.9))), u * 0.12, darker(options.trunk, 0.45)));
            }
        }());

        /* branches (drawn before the leaves, so the crown covers most of them) */
        function branch(angle, length, rise, widthUnits, colour) {
            var from = P(M / 2, M / 2, trunkUnits * (0.80 + (random() * 0.2))), to = P((M / 2) + (Math.cos(angle) * length), (M / 2) + (Math.sin(angle) * length), (trunkUnits * 0.95) + rise);
            prims.push(quad(from[0], from[1], to[0], to[1], u * widthUnits, colour));
        }
        for (i = 0; i < 12; i += 1) { branch((i * Math.PI * 2 / 12) + (random() * 0.4), crownRadius * (0.38 + (random() * 0.40)), crownHalf * (0.35 + (random() * 0.9)), 0.42 - (i % 3) * 0.08, i % 2 ? darker(options.trunk, 0.18) : options.trunk); }

        /* crown: many small leaf cards, sorted back to front; lighter on top and on the lit (left) side */
        (function () {
            var count = Math.round(1300 + (options.density * 22)), leaves = [], k, s, theta, phi, dx, dy, dz, light, shade;
            for (k = 0; k < count; k += 1) {
                s = 0.30 + (0.70 * Math.cbrt(random())); theta = random() * Math.PI * 2; phi = Math.acos((random() * 2) - 1);
                dx = crownRadius * s * Math.sin(phi) * Math.cos(theta); dy = crownRadius * s * Math.sin(phi) * Math.sin(theta); dz = crownHalf * s * Math.cos(phi);
                if (dz < -crownHalf * 0.22 && random() < 0.62) { continue; } /* open underside: trunk and branches stay visible, as in the reference */
                light = clamp(0.42 + (0.34 * (dz / crownHalf)) + (0.30 * (-(dx - dy) / (crownRadius * 1.4))) + (0.30 * (s - 0.65)) + ((random() - 0.5) * 0.14), 0, 1);
                shade = light < 0.5 ? mix(darker(leaf, 0.22), leaf, light * 2) : mix(leaf, lighter(leaf, 0.50), (light - 0.5) * 2);
                leaves.push({ key: (dx + dy) + (dz * 0.5), x: P((M / 2) + dx, (M / 2) + dy, crownZ + dz), size: u * (0.85 + (random() * 1.1)), rot: random() * 6.28, fill: shade });
            }
            leaves.sort(function (first, second) { return first.key - second.key; });
            var split = Math.floor(leaves.length * 0.45);
            leaves.forEach(function (item, index) {
                if (index === split) {
                    /* branches that run between the back and front leaf layers: visible through gaps, like the reference */
                    for (k = 0; k < 8; k += 1) { branch((Math.PI * 0.15) + ((k / 7) * Math.PI * 0.7), crownRadius * (0.40 + (random() * 0.30)), crownHalf * (0.30 + (random() * 0.55)), 0.30 - ((k % 3) * 0.05), k % 2 ? darker(options.trunk, 0.20) : options.trunk); }
                }
                prims.push(poly(ngon(item.x[0], item.x[1], item.size * 0.62, 5, item.rot), item.fill, 1));
            });
        }());

        /* gently falling leaves */
        for (i = 0; i < 26; i += 1) {
            a = 2 + (random() * (M - 4)); b = 2 + (random() * (M - 4));
            j = P(a, b, 1.5 + (random() * treeUnits * 0.85));
            prims.push(poly(ngon(j[0], j[1], u * (0.28 + (random() * 0.2)), 5, random() * 6), lighter(leaf, random() * 0.3), 0.9));
        }
        return prims;
    }

    function renderScene(text, outputSize, rawOptions) {
        var options = normaliseOptions(rawOptions), matrix = createMatrix(text), canvas = document.createElement('canvas'), context;
        canvas.width = outputSize; canvas.height = outputSize; context = canvas.getContext('2d', { alpha: false });
        context.fillStyle = options.background; context.fillRect(0, 0, outputSize, outputSize);
        paintPrimitivesCanvas(context, buildDiorama(text, outputSize, matrix, options));
        return canvas;
    }

    window.QRGTreeRenderer = { render: render, renderSvg: renderSvg, renderScene: renderScene };
}(window));
