<?php
if (!defined('ABSPATH')) exit;

add_action('admin_menu', 'qrg_add_admin_menu');
add_action('admin_init', 'qrg_register_settings');
add_action('admin_enqueue_scripts', 'qrg_admin_scripts');

function qrg_admin_scripts($hook) {
    if ($hook !== 'toplevel_page_qr-generator-settings') return;
    wp_enqueue_script('qrg-admin-js', plugin_dir_url(__FILE__) . 'assets/admin.js', array('jquery'), '1.0', true);
    wp_localize_script('qrg-admin-js', 'qrg_ajax', array('ajax_url' => admin_url('admin-ajax.php')));
    wp_enqueue_style('qrg-style', plugin_dir_url(__FILE__) . 'assets/style.css');
}

function qrg_add_admin_menu() {
    add_menu_page(
        'QR Code Generator',
        'QR Generator',
        'manage_options',
        'qr-generator-settings',
        'qrg_settings_page_html',
        'dashicons-qrcode',
        81
    );
}

function qrg_register_settings() {
    // Allgemein
    register_setting('qrg_settings_group', 'qrg_default_size');
    register_setting('qrg_settings_group', 'qrg_default_color');
    register_setting('qrg_settings_group', 'qrg_default_bg');
    // Layout
    register_setting('qrg_settings_group', 'qrg_form_bg_color');
    register_setting('qrg_settings_group', 'qrg_form_width');
    register_setting('qrg_settings_group', 'qrg_form_padding');
    register_setting('qrg_settings_group', 'qrg_form_margin');
}

function qrg_settings_page_html() {
    ?>
    <div class="wrap qrg-admin-wrap">
        <h1>🔲 QR Generator – Einstellungen</h1>

        <h2 class="nav-tab-wrapper">
            <a href="#tab-general" class="nav-tab nav-tab-active">⚙️ Allgemein</a>
            <a href="#tab-layout" class="nav-tab">🎨 Layout</a>
            <a href="#tab-preview" class="nav-tab">👁️ Live Vorschau</a>
        </h2>

        <form method="post" action="options.php" id="qrg-settings-form">
            <?php settings_fields('qrg_settings_group'); ?>

            <!-- Allgemein -->
            <div id="tab-general" class="qrg-tab active">
                <table class="form-table">
                    <tr><th>Standardgröße</th>
                        <td>
                            <select name="qrg_default_size">
                                <?php foreach ([150,200,300,400] as $size): ?>
                                    <option value="<?php echo $size; ?>" <?php selected(get_option('qrg_default_size', '200'), $size); ?>>
                                        <?php echo $size; ?> px
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </td>
                    </tr>
                    <tr><th>Farbe</th>
                        <td><input type="color" name="qrg_default_color" value="<?php echo esc_attr(get_option('qrg_default_color', '#000000')); ?>"></td>
                    </tr>
                    <tr><th>Hintergrund</th>
                        <td><input type="color" name="qrg_default_bg" value="<?php echo esc_attr(get_option('qrg_default_bg', '#ffffff')); ?>"></td>
                    </tr>
                </table>
            </div>

            <!-- Layout -->
            <div id="tab-layout" class="qrg-tab">
                <table class="form-table">
                    <tr><th>Formular Hintergrund</th>
                        <td><input type="color" name="qrg_form_bg_color" value="<?php echo esc_attr(get_option('qrg_form_bg_color', '#ffffff')); ?>"></td>
                    </tr>
                    <tr><th>Breite</th>
                        <td><input type="text" name="qrg_form_width" value="<?php echo esc_attr(get_option('qrg_form_width', '80%')); ?>"></td>
                    </tr>
                    <tr><th>Padding</th>
                        <td><input type="text" name="qrg_form_padding" value="<?php echo esc_attr(get_option('qrg_form_padding', '20px')); ?>"></td>
                    </tr>
                    <tr><th>Margin</th>
                        <td><input type="text" name="qrg_form_margin" value="<?php echo esc_attr(get_option('qrg_form_margin', '20px auto')); ?>"></td>
                    </tr>
                </table>
            </div>

            <!-- Vorschau -->
            <div id="tab-preview" class="qrg-tab">
                <p><strong>So sieht dein Formular aus:</strong></p>
                <div id="qrg-preview-container" style="border:1px solid #ddd; padding:20px; background:#fff;">
                    <em>Lade Vorschau...</em>
                </div>
            </div>

            <?php submit_button('Einstellungen speichern'); ?>
        </form>
    </div>
    <?php
}

// 🔹 AJAX – Live Preview
add_action('wp_ajax_qrg_preview', 'qrg_ajax_preview');
function qrg_ajax_preview() {
    ob_start();
    include plugin_dir_path(__FILE__) . 'qr-code-generator.php';
    echo do_shortcode('[qr_generator]');
    wp_send_json_success(ob_get_clean());
}
