<?php
/*
Plugin Name: QR Code Generator
Plugin URI: https://mrs-dev.com
Description: Ein anpassbarer QR-Code-Generator mit Admin-Einstellungen.
Version: 1.3
Author: Raeed
Author URI: https://mrs-dev.com
License: GPL2
*/

if (!defined('ABSPATH')) exit; // Sicherheitscheck

// 🔹 Styles & Scripts laden
function qrg_enqueue_scripts() {
    wp_enqueue_style('qrg-style', plugin_dir_url(__FILE__) . 'assets/style.css');
    wp_enqueue_script('qrg-script', plugin_dir_url(__FILE__) . 'assets/qrcode.min.js', array(), '1.0', true);
    wp_enqueue_script('qrg-main', plugin_dir_url(__FILE__) . 'assets/main.js', array('qrg-script'), '1.0', true);
}
add_action('wp_enqueue_scripts', 'qrg_enqueue_scripts');

// 🔹 Admin-Datei einbinden
require_once plugin_dir_path(__FILE__) . 'qr-code-admin.php';

// 🔹 Shortcode-Funktion (Frontend)
function qrg_display_generator() {
    $default_size = get_option('qrg_default_size', '200');
    $default_color = get_option('qrg_default_color', '#000000');
    $default_bg = get_option('qrg_default_bg', '#ffffff');

    // Layout-Optionen
    $bg_color = get_option('qrg_form_bg_color', '#ffffff');
    $width = get_option('qrg_form_width', '80%');
    $padding = get_option('qrg_form_padding', '20px');
    $margin = get_option('qrg_form_margin', '20px auto');

    ob_start(); ?>
    <div class="qrg-container" style="
        background-color: <?php echo esc_attr($bg_color); ?>;
        width: <?php echo esc_attr($width); ?>;
        padding: <?php echo esc_attr($padding); ?>;
        margin: <?php echo esc_attr($margin); ?>;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
    ">
        <h2>🔲 QR-Code Generator</h2>
        <input type="text" id="qrg-text" placeholder="Gib deinen Text oder eine URL ein" />

        <div class="qrg-options">
            <label>Größe:</label>
            <select id="qrg-size">
                <?php foreach ([150,200,300,400] as $size): ?>
                    <option value="<?php echo $size; ?>" <?php selected($default_size, $size); ?>><?php echo $size; ?> px</option>
                <?php endforeach; ?>
            </select>

            <label>Farbe:</label>
            <input type="color" id="qrg-color" value="<?php echo esc_attr($default_color); ?>" />

            <label>Hintergrund:</label>
            <input type="color" id="qrg-bg" value="<?php echo esc_attr($default_bg); ?>" />
        </div>

        <button id="qrg-generate">QR-Code erstellen</button>
        <div id="qrg-result"></div>
        <button id="qrg-download" style="display:none;">QR-Code herunterladen</button>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('qr_generator', 'qrg_display_generator');
