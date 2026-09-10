<?php
/*
Plugin Name: QR Code Generator
Plugin URI: https://mrs-dev.com
Description: Ein anpassbarer QR-Code-Generator mit Admin-Einstellungen, Shortcode und Download-Funktion.
Version: 1.5
Author: Raeed
Author URI: https://mrs-dev.com
License: GPL2
Text Domain: qr-code-generator
*/

if (!defined('ABSPATH')) {
    exit;
}

define('QRG_VERSION', '1.5');
define('QRG_PLUGIN_FILE', __FILE__);
define('QRG_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('QRG_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once QRG_PLUGIN_DIR . 'qr-code-admin.php';

function qrg_enqueue_scripts() {
    wp_enqueue_style('qrg-style', QRG_PLUGIN_URL . 'assets/style.css', array(), QRG_VERSION);
    wp_enqueue_script('qrg-script', QRG_PLUGIN_URL . 'assets/qrcode.min.js', array(), '1.0', true);
    wp_enqueue_script('qrg-tree-renderer', QRG_PLUGIN_URL . 'assets/tree-renderer.js', array('qrg-script'), QRG_VERSION, true);
    wp_enqueue_script('qrg-main', QRG_PLUGIN_URL . 'assets/main.js', array('qrg-script', 'qrg-tree-renderer'), QRG_VERSION, true);
}
add_action('wp_enqueue_scripts', 'qrg_enqueue_scripts');

function qrg_get_generator_markup() {
    $instance_id = wp_unique_id('qrg-');
    $default_size = absint(get_option('qrg_default_size', 200));
    $default_color = sanitize_hex_color(get_option('qrg_default_color', '#000000')) ?: '#000000';
    $default_bg = sanitize_hex_color(get_option('qrg_default_bg', '#ffffff')) ?: '#ffffff';

    $styles = array(
        'background-color' => sanitize_hex_color(get_option('qrg_form_bg_color', '#ffffff')) ?: '#ffffff',
        'width'            => qrg_sanitize_css_size(get_option('qrg_form_width', '80%'), '80%'),
        'padding'          => qrg_sanitize_css_box_value(get_option('qrg_form_padding', '20px'), '20px'),
        'margin'           => qrg_sanitize_css_box_value(get_option('qrg_form_margin', '20px auto'), '20px auto'),
    );

    $style_attr = '';
    foreach ($styles as $property => $value) {
        $style_attr .= sprintf('%s:%s;', $property, $value);
    }

    ob_start();
    ?>
    <div class="qrg-container" style="<?php echo esc_attr($style_attr); ?>">
        <h2><?php esc_html_e('QR-Code Generator', 'qr-code-generator'); ?></h2>

        <label class="qrg-field">
            <span><?php esc_html_e('Text oder URL', 'qr-code-generator'); ?></span>
            <input type="text" class="qrg-text" placeholder="<?php esc_attr_e('Gib deinen Text oder eine URL ein', 'qr-code-generator'); ?>" />
        </label>

        <div class="qrg-options">
            <label>
                <span><?php esc_html_e('Größe', 'qr-code-generator'); ?></span>
                <select class="qrg-size">
                    <?php foreach (array(150, 200, 300, 400) as $size) : ?>
                        <option value="<?php echo esc_attr($size); ?>" <?php selected($default_size, $size); ?>>
                            <?php echo esc_html($size); ?> px
                        </option>
                    <?php endforeach; ?>
                </select>
            </label>

            <label>
                <span><?php esc_html_e('Farbe', 'qr-code-generator'); ?></span>
                <input type="color" class="qrg-color" value="<?php echo esc_attr($default_color); ?>" />
            </label>

            <label>
                <span><?php esc_html_e('Hintergrund', 'qr-code-generator'); ?></span>
                <input type="color" class="qrg-bg" value="<?php echo esc_attr($default_bg); ?>" />
            </label>
        </div>

        <fieldset class="qrg-design" aria-describedby="qrg-design-help">
            <legend><?php esc_html_e('QR-Code Design', 'qr-code-generator'); ?></legend>
            <div class="qrg-design-modes" role="radiogroup">
                <label><input type="radio" class="qrg-design-mode" name="qrg-design-<?php echo esc_attr($instance_id); ?>" value="standard" checked> <?php esc_html_e('Standard', 'qr-code-generator'); ?></label>
                <label><input type="radio" class="qrg-design-mode" name="qrg-design-<?php echo esc_attr($instance_id); ?>" value="tree"> <?php esc_html_e('3D Tree', 'qr-code-generator'); ?></label>
            </div>
            <p id="qrg-design-help" class="screen-reader-text"><?php esc_html_e('Choose the standard QR code or the validated 3D Tree QR code.', 'qr-code-generator'); ?></p>
            <div class="qrg-tree-options" hidden>
                <label><span><?php esc_html_e('Tree depth', 'qr-code-generator'); ?></span><input type="range" class="qrg-tree-depth" min="20" max="30" value="25" step="1"><output class="qrg-tree-depth-output">25%</output></label>
                <label><span><?php esc_html_e('Tree style', 'qr-code-generator'); ?></span><select class="qrg-tree-style"><option value="evergreen"><?php esc_html_e('Evergreen', 'qr-code-generator'); ?></option><option value="sculpted"><?php esc_html_e('Sculpted', 'qr-code-generator'); ?></option></select></label>
                <label><span><?php esc_html_e('Perspective', 'qr-code-generator'); ?></span><select class="qrg-tree-perspective"><option value="subtle"><?php esc_html_e('Subtle', 'qr-code-generator'); ?></option><option value="soft"><?php esc_html_e('Soft', 'qr-code-generator'); ?></option></select></label>
                <label class="qrg-tree-shadow-label"><input type="checkbox" class="qrg-tree-shadow" checked> <?php esc_html_e('Shadow', 'qr-code-generator'); ?></label>
                <label><span><?php esc_html_e('Export size', 'qr-code-generator'); ?></span><select class="qrg-export-size"><option value="1024">1024 × 1024</option><option value="2048">2048 × 2048</option></select></label>
            </div>
        </fieldset>

        <button type="button" class="qrg-generate"><?php esc_html_e('QR-Code erstellen', 'qr-code-generator'); ?></button>
        <div class="qrg-result" aria-live="polite"></div>
        <p class="qrg-validation" role="status" hidden></p>
        <div class="qrg-downloads" hidden>
            <button type="button" class="qrg-download"><?php esc_html_e('PNG herunterladen', 'qr-code-generator'); ?></button>
            <button type="button" class="qrg-download-svg"><?php esc_html_e('SVG herunterladen', 'qr-code-generator'); ?></button>
        </div>
    </div>
    <?php

    return ob_get_clean();
}

function qrg_display_generator() {
    return qrg_get_generator_markup();
}
add_shortcode('qr_generator', 'qrg_display_generator');
