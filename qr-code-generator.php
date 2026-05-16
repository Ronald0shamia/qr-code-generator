<?php
/*
Plugin Name: QR Code Generator
Plugin URI: https://mrs-dev.com
Description: Ein anpassbarer QR-Code-Generator mit Admin-Einstellungen, Shortcode und Download-Funktion.
Version: 1.4
Author: Raeed
Author URI: https://mrs-dev.com
License: GPL2
Text Domain: qr-code-generator
*/

if (!defined('ABSPATH')) {
    exit;
}

define('QRG_VERSION', '1.4');
define('QRG_PLUGIN_FILE', __FILE__);
define('QRG_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('QRG_PLUGIN_URL', plugin_dir_url(__FILE__));

require_once QRG_PLUGIN_DIR . 'qr-code-admin.php';

function qrg_enqueue_scripts() {
    wp_enqueue_style('qrg-style', QRG_PLUGIN_URL . 'assets/style.css', array(), QRG_VERSION);
    wp_enqueue_script('qrg-script', QRG_PLUGIN_URL . 'assets/qrcode.min.js', array(), '1.0', true);
    wp_enqueue_script('qrg-main', QRG_PLUGIN_URL . 'assets/main.js', array('qrg-script'), QRG_VERSION, true);
}
add_action('wp_enqueue_scripts', 'qrg_enqueue_scripts');

function qrg_get_generator_markup() {
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

        <button type="button" class="qrg-generate"><?php esc_html_e('QR-Code erstellen', 'qr-code-generator'); ?></button>
        <div class="qrg-result" aria-live="polite"></div>
        <button type="button" class="qrg-download" hidden><?php esc_html_e('QR-Code herunterladen', 'qr-code-generator'); ?></button>
    </div>
    <?php

    return ob_get_clean();
}

function qrg_display_generator() {
    return qrg_get_generator_markup();
}
add_shortcode('qr_generator', 'qrg_display_generator');
