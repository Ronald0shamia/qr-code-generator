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
            mode: raw.mode === 'artistic' ? 'artistic' : 'safe',
            scene: raw.scene !== false,
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
        if (role === 'trunk' || role === 'branch') { return mix(options.structure, options.trunk, 0.78); }
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

    /* ------------------------------------------------------------------
     * Scene layer (diorama): trunk, branches, crown, platform, flowers.
     * Everything is built as plain primitives so canvas and SVG share the
     * exact same geometry. The scene is only ever drawn OUTSIDE the QR tile
     * (code + quiet zone); the tile is painted last and covers anything that
     * would overlap it, so the quiet zone stays free of graphics.
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

    function tileLayout(size, count, withScene) {
        var span = count + 8, module, tile;
        if (!withScene) { module = size / span; return { module: module, tile: size, x: 0, y: 0 }; }
        module = Math.max(1, Math.floor((size * 0.54) / span));
        tile = module * span;
        return { module: module, tile: tile, x: Math.round((size - tile) / 2), y: Math.round(size * 0.36) };
    }

    function buildScene(size, layout, options) {
        var back = [], front = [], tileTop = layout.y, tileBottom = layout.y + layout.tile, tileLeft = layout.x, tileRight = layout.x + layout.tile;
        var inset = size * (0.06 + (options.perspective * 0.004)), backY = tileTop - (size * 0.045), frontY = Math.min(size * 0.93, tileBottom + (size * 0.03)), thickness = size * 0.035;
        var soil = darker(mix(options.ground, options.trunk, 0.45), 0.12), lawnEdge = darker(options.ground, 0.16), lawnLight = lighter(options.ground, 0.16), soft = options.shadow;
        var centerX = size / 2, crownY = size * 0.17, scale = 0.85 * (0.9 + ((options.depth - 16) / 14) * 0.2);
        var topWidth = size * 0.045, baseWidth = size * 0.078, trunkTop = size * 0.27, trunkBase = tileTop + (size * 0.01);
        var clusters = [[-0.22, 0.03, 0.085], [0.22, 0.03, 0.085], [-0.15, -0.04, 0.10], [0.15, -0.04, 0.10], [-0.08, 0.04, 0.09], [0.08, 0.04, 0.09], [0, -0.07, 0.11], [0, 0.0, 0.12]];
        var branches = [[-0.20, 0.03], [0.20, 0.03], [-0.12, -0.03], [0.12, -0.03], [0, -0.06]];
        var flowers = [[0.16, 0.46, 0], [0.19, 0.62, 1], [0.14, 0.80, 2], [0.84, 0.46, 1], [0.81, 0.62, 2], [0.86, 0.80, 0]];
        var flowerColours = ['#ffffff', '#ffd1dc', '#ffe066'];
        var gx, tuft, i, j, cluster, cx, cy, r, dots, dotCount, angle, distance, shadowRim;

        function clearOfTile(left, top, right, bottom) { var margin = size * 0.004; return right < tileLeft - margin || left > tileRight + margin || bottom < tileTop - margin || top > tileBottom + margin; }

        /* soft platform shadow */
        if (soft) { for (i = 0; i < 4; i += 1) { back.push({ t: 'ellipse', cx: centerX, cy: frontY + thickness + (size * 0.012), rx: size * (0.47 - (i * 0.03)), ry: size * (0.030 - (i * 0.005)), fill: '#000000', op: 0.05 }); } }
        /* platform: side thickness, lawn rim, lawn */
        back.push(poly([[size * 0.05, frontY], [size * 0.95, frontY], [size * 0.95, frontY + thickness], [size * 0.05, frontY + thickness]], soil, 1));
        back.push(poly([[size * 0.05, frontY + (thickness * 0.55)], [size * 0.95, frontY + (thickness * 0.55)], [size * 0.95, frontY + thickness], [size * 0.05, frontY + thickness]], darker(soil, 0.18), 1));
        back.push(poly([[size * 0.05 + inset, backY], [size * 0.95 - inset, backY], [size * 0.95, frontY], [size * 0.05, frontY]], lawnEdge, 1));
        shadowRim = size * 0.014;
        back.push(poly([[size * 0.05 + inset + shadowRim, backY + shadowRim], [size * 0.95 - inset - shadowRim, backY + shadowRim], [size * 0.95 - shadowRim, frontY - shadowRim], [size * 0.05 + shadowRim, frontY - shadowRim]], options.ground, 1));
        /* subtle ground structure */
        for (i = 0; i < 46; i += 1) {
            gx = size * (0.10 + ((stableNoise(i, 3) / 101) * 0.80)); tuft = backY + ((frontY - backY) * (0.08 + ((stableNoise(i, 7) / 101) * 0.84)));
            back.push({ t: 'ellipse', cx: gx, cy: tuft, rx: size * 0.012, ry: size * 0.0045, fill: (i % 2 ? lawnLight : lawnEdge), op: 0.35 });
        }
        /* trunk (tapered, lit from the top left) and branches */
        back.push(poly([[centerX - (topWidth / 2), trunkTop], [centerX + (topWidth / 2), trunkTop], [centerX + (baseWidth / 2), trunkBase], [centerX - (baseWidth / 2), trunkBase]], options.trunk, 1));
        back.push(poly([[centerX - (topWidth / 2), trunkTop], [centerX - (topWidth / 6), trunkTop], [centerX - (baseWidth / 6), trunkBase], [centerX - (baseWidth / 2), trunkBase]], lighter(options.trunk, 0.18), 1));
        back.push(poly([[centerX + (topWidth / 6), trunkTop], [centerX + (topWidth / 2), trunkTop], [centerX + (baseWidth / 2), trunkBase], [centerX + (baseWidth / 6), trunkBase]], darker(options.trunk, 0.22), 1));
        branches.forEach(function (branch, index) { back.push(quad(centerX, trunkTop + (size * 0.012), centerX + (branch[0] * size * scale), crownY + (branch[1] * size * scale), size * (index < 2 ? 0.016 : 0.012), index % 2 ? darker(options.trunk, 0.12) : options.trunk)); });
        /* crown: low-poly clusters, darker underside, highlight from the top left */
        dotCount = Math.round((options.density / 100) * 16);
        clusters.forEach(function (c, index) {
            cx = centerX + (c[0] * size * scale); cy = crownY + (c[1] * size * scale); r = c[2] * size * scale;
            back.push(poly(ngon(cx + (r * 0.10 * (options.depth / 22)), cy + (r * 0.13 * (options.depth / 22)), r, 9, index), darker(options.blossom, 0.34), 1));
            back.push(poly(ngon(cx, cy, r * 0.96, 9, index), lighter(options.blossom, 0.10), 1));
            back.push(poly(ngon(cx - (r * 0.22), cy - (r * 0.26), r * 0.58, 8, index + 0.4), lighter(options.blossom, 0.34), 0.6));
            for (j = 0; j < dotCount; j += 1) {
                angle = (stableNoise(index * 31 + j, 5) / 101) * Math.PI * 2; distance = Math.sqrt(stableNoise(index * 17 + j, 11) / 101) * r * 0.82;
                back.push({ t: 'circle', cx: cx + (Math.cos(angle) * distance), cy: cy + (Math.sin(angle) * distance), r: size * 0.0065, fill: (j % 3 === 0 ? '#ffffff' : lighter(options.blossom, 0.5)), op: 0.85 });
            }
        });
        /* foreground details: grass tufts and flowers, only where clear of the QR tile */
        for (i = 0; i < 24; i += 1) {
            gx = size * (0.09 + (i * 0.0335)); tuft = size * (0.010 + ((stableNoise(i, 9) / 101) * 0.010));
            if (clearOfTile(gx, frontY - (size * 0.03), gx + (size * 0.01), frontY)) { front.push(poly([[gx, frontY - (size * 0.006)], [gx + (size * 0.009), frontY - (size * 0.006)], [gx + (size * 0.0045), frontY - (size * 0.006) - tuft]], lawnLight, 1)); }
        }
        flowers.forEach(function (flower) {
            var fx = flower[0] * size, fy = flower[1] * size, fr = size * 0.0075;
            if (!clearOfTile(fx - (fr * 3), fy - (fr * 3), fx + (fr * 3), fy + (fr * 3))) { return; }
            for (i = 0; i < 5; i += 1) { front.push({ t: 'circle', cx: fx + (Math.cos(i * 1.2566) * fr * 1.5), cy: fy + (Math.sin(i * 1.2566) * fr * 1.5), r: fr, fill: flowerColours[flower[2]], op: 1 }); }
            front.push({ t: 'circle', cx: fx, cy: fy, r: fr * 0.8, fill: '#e0a526', op: 1 });
        });
        if (soft) { back.push({ t: 'rect', x: tileLeft + (size * 0.007), y: tileTop + (size * 0.009), w: layout.tile, h: layout.tile, fill: '#000000', op: 0.16 }); }
        return { back: back, front: front };
    }

    function paintPrimitivesCanvas(context, primitives) {
        primitives.forEach(function (item) {
            context.globalAlpha = item.op; context.fillStyle = item.fill;
            if (item.t === 'poly') { context.beginPath(); item.pts.forEach(function (point, index) { if (index) { context.lineTo(point[0], point[1]); } else { context.moveTo(point[0], point[1]); } }); context.closePath(); context.fill(); }
            else if (item.t === 'circle') { context.beginPath(); context.arc(item.cx, item.cy, item.r, 0, Math.PI * 2); context.fill(); }
            else if (item.t === 'ellipse') { context.beginPath(); context.ellipse(item.cx, item.cy, item.rx, item.ry, 0, 0, Math.PI * 2); context.fill(); }
            else { context.fillRect(item.x, item.y, item.w, item.h); }
        });
        context.globalAlpha = 1;
    }

    function paintPrimitivesSvg(svg, primitives) {
        primitives.forEach(function (item) {
            var attributes = { fill: item.fill };
            if (item.op !== 1) { attributes.opacity = String(item.op); }
            if (item.t === 'poly') { attributes.points = pointString(item.pts.map(function (point) { return [round2(point[0]), round2(point[1])]; })); svg.appendChild(svgElement('polygon', attributes)); }
            else if (item.t === 'circle') { attributes.cx = round2(item.cx); attributes.cy = round2(item.cy); attributes.r = round2(item.r); svg.appendChild(svgElement('circle', attributes)); }
            else if (item.t === 'ellipse') { attributes.cx = round2(item.cx); attributes.cy = round2(item.cy); attributes.rx = round2(item.rx); attributes.ry = round2(item.ry); svg.appendChild(svgElement('ellipse', attributes)); }
            else { attributes.x = round2(item.x); attributes.y = round2(item.y); attributes.width = round2(item.w); attributes.height = round2(item.h); svg.appendChild(svgElement('rect', attributes)); }
        });
    }

    function render(text, outputSize, rawOptions) {
        var options = normaliseOptions(rawOptions), matrix = createMatrix(text), count = matrix.length, layout = tileLayout(outputSize, count, options.scene), canvas = document.createElement('canvas'), context, scene;
        canvas.width = outputSize; canvas.height = outputSize; context = canvas.getContext('2d', { alpha: false }); context.fillStyle = options.background; context.fillRect(0, 0, outputSize, outputSize);
        if (options.scene) { scene = buildScene(outputSize, layout, options); paintPrimitivesCanvas(context, scene.back); }
        context.fillStyle = options.background; context.fillRect(layout.x, layout.y, layout.tile, layout.tile);
        matrix.forEach(function (line, row) { line.forEach(function (dark, column) { if (dark) { var left = Math.floor(layout.x + ((column + options.quietZone) * layout.module)), top = Math.floor(layout.y + ((row + options.quietZone) * layout.module)), right = Math.ceil(layout.x + ((column + options.quietZone + 1) * layout.module)), bottom = Math.ceil(layout.y + ((row + options.quietZone + 1) * layout.module)); renderCanvasModule(context, left, top, Math.max(right - left, bottom - top), moduleRole(row, column, count, options), row, column, count, options); } }); });
        if (options.scene) { paintPrimitivesCanvas(context, scene.front); }
        return { canvas: canvas, matrix: matrix };
    }

    function renderSvg(text, outputSize, rawOptions) {
        var options = normaliseOptions(rawOptions), matrix = createMatrix(text), count = matrix.length, layout = tileLayout(outputSize, count, options.scene), scene, svg = svgElement('svg', { xmlns: NS, width: outputSize, height: outputSize, viewBox: '0 0 ' + outputSize + ' ' + outputSize, role: 'img', 'aria-label': '3D blossom tree QR code' });
        svg.appendChild(svgElement('rect', { width: outputSize, height: outputSize, fill: options.background }));
        if (options.scene) { scene = buildScene(outputSize, layout, options); paintPrimitivesSvg(svg, scene.back); }
        svg.appendChild(svgElement('rect', { x: layout.x, y: layout.y, width: layout.tile, height: layout.tile, fill: options.background }));
        matrix.forEach(function (line, row) { line.forEach(function (dark, column) { if (dark) { renderSvgModule(svg, layout.x + ((column + options.quietZone) * layout.module), layout.y + ((row + options.quietZone) * layout.module), layout.module, moduleRole(row, column, count, options), row, column, count, options); } }); });
        if (options.scene) { paintPrimitivesSvg(svg, scene.front); }
        return new XMLSerializer().serializeToString(svg);
    }

    window.QRGTreeRenderer = { render: render, renderSvg: renderSvg };
}(window));
