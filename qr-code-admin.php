<?php
if (!defined('ABSPATH')) {
    exit;
}

add_action('admin_menu', 'qrg_add_admin_menu');
add_action('admin_init', 'qrg_register_settings');
add_action('admin_enqueue_scripts', 'qrg_admin_scripts');
add_action('wp_ajax_qrg_preview', 'qrg_ajax_preview');

function qrg_admin_scripts($hook) {
    if ($hook !== 'toplevel_page_qr-generator-settings') {
        return;
    }

    wp_enqueue_style('qrg-style', QRG_PLUGIN_URL . 'assets/style.css', array(), QRG_VERSION);
    wp_enqueue_script('qrg-script', QRG_PLUGIN_URL . 'assets/qrcode.min.js', array(), '1.0', true);
    wp_enqueue_script('qrg-tree-renderer', QRG_PLUGIN_URL . 'assets/tree-renderer.js', array('qrg-script'), QRG_VERSION, true);
    wp_enqueue_script('qrg-main', QRG_PLUGIN_URL . 'assets/main.js', array('qrg-script', 'qrg-tree-renderer'), QRG_VERSION, true);
    wp_enqueue_script('qrg-admin-js', QRG_PLUGIN_URL . 'assets/admin.js', array('jquery', 'qrg-main'), QRG_VERSION, true);
    wp_localize_script(
        'qrg-admin-js',
        'qrg_ajax',
        array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce'    => wp_create_nonce('qrg_preview'),
        )
    );
}

function qrg_add_admin_menu() {
    add_menu_page(
        __('QR Code Generator', 'qr-code-generator'),
        __('QR Generator', 'qr-code-generator'),
        'manage_options',
        'qr-generator-settings',
        'qrg_settings_page_html',
        'dashicons-qrcode',
        81
    );
}

function qrg_register_settings() {
    register_setting(
        'qrg_settings_group',
        'qrg_default_size',
        array(
            'type'              => 'integer',
            'sanitize_callback' => 'qrg_sanitize_size',
            'default'           => 200,
        )
    );

    register_setting(
        'qrg_settings_group',
        'qrg_default_color',
        array(
            'type'              => 'string',
            'sanitize_callback' => 'qrg_sanitize_hex_option',
            'default'           => '#000000',
        )
    );

    register_setting(
        'qrg_settings_group',
        'qrg_default_bg',
        array(
            'type'              => 'string',
            'sanitize_callback' => 'qrg_sanitize_hex_option',
            'default'           => '#ffffff',
        )
    );

    register_setting(
        'qrg_settings_group',
        'qrg_form_bg_color',
        array(
            'type'              => 'string',
            'sanitize_callback' => 'qrg_sanitize_hex_option',
            'default'           => '#ffffff',
        )
    );

    register_setting(
        'qrg_settings_group',
        'qrg_form_width',
        array(
            'type'              => 'string',
            'sanitize_callback' => 'qrg_sanitize_css_size',
            'default'           => '80%',
        )
    );

    register_setting(
        'qrg_settings_group',
        'qrg_form_padding',
        array(
            'type'              => 'string',
            'sanitize_callback' => 'qrg_sanitize_css_box_value',
            'default'           => '20px',
        )
    );

    register_setting(
        'qrg_settings_group',
        'qrg_form_margin',
        array(
            'type'              => 'string',
            'sanitize_callback' => 'qrg_sanitize_css_box_value',
            'default'           => '20px auto',
        )
    );
}

function qrg_sanitize_size($value) {
    $value = absint($value);
    $allowed = array(150, 200, 300, 400);

    return in_array($value, $allowed, true) ? $value : 200;
}

function qrg_sanitize_hex_option($value) {
    return sanitize_hex_color($value) ?: '#000000';
}

function qrg_sanitize_css_size($value, $default = '80%') {
    $value = trim((string) $value);

    if (preg_match('/^\d{1,4}(\.\d{1,2})?(px|%|em|rem|vw)$/', $value)) {
        return $value;
    }

    return $default;
}

function qrg_sanitize_css_box_value($value, $default = '20px') {
    $value = trim((string) $value);

    if ($value === '') {
        return $default;
    }

    $parts = preg_split('/\s+/', $value);
    if (count($parts) > 4) {
        return $default;
    }

    foreach ($parts as $part) {
        if ($part === 'auto') {
            continue;
        }

        if (!preg_match('/^\d{1,4}(\.\d{1,2})?(px|%|em|rem)$/', $part)) {
            return $default;
        }
    }

    return implode(' ', $parts);
}

function qrg_settings_page_html() {
    if (!current_user_can('manage_options')) {
        return;
    }
    ?>
    <div class="wrap qrg-admin-wrap">
        <h1><?php esc_html_e('QR Generator - Einstellungen', 'qr-code-generator'); ?></h1>

        <h2 class="nav-tab-wrapper">
            <a href="#tab-general" class="nav-tab nav-tab-active"><?php esc_html_e('Allgemein', 'qr-code-generator'); ?></a>
            <a href="#tab-layout" class="nav-tab"><?php esc_html_e('Layout', 'qr-code-generator'); ?></a>
            <a href="#tab-preview" class="nav-tab"><?php esc_html_e('Live Vorschau', 'qr-code-generator'); ?></a>
        </h2>

        <form method="post" action="options.php" id="qrg-settings-form">
            <?php settings_fields('qrg_settings_group'); ?>

            <div id="tab-general" class="qrg-tab active">
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="qrg_default_size"><?php esc_html_e('Standardgröße', 'qr-code-generator'); ?></label></th>
                        <td>
                            <select id="qrg_default_size" name="qrg_default_size">
                                <?php foreach (array(150, 200, 300, 400) as $size) : ?>
                                    <option value="<?php echo esc_attr($size); ?>" <?php selected(get_option('qrg_default_size', 200), $size); ?>>
                                        <?php echo esc_html($size); ?> px
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="qrg_default_color"><?php esc_html_e('Farbe', 'qr-code-generator'); ?></label></th>
                        <td><input type="color" id="qrg_default_color" name="qrg_default_color" value="<?php echo esc_attr(get_option('qrg_default_color', '#000000')); ?>"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="qrg_default_bg"><?php esc_html_e('Hintergrund', 'qr-code-generator'); ?></label></th>
                        <td><input type="color" id="qrg_default_bg" name="qrg_default_bg" value="<?php echo esc_attr(get_option('qrg_default_bg', '#ffffff')); ?>"></td>
                    </tr>
                </table>
            </div>

            <div id="tab-layout" class="qrg-tab">
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="qrg_form_bg_color"><?php esc_html_e('Formular Hintergrund', 'qr-code-generator'); ?></label></th>
                        <td><input type="color" id="qrg_form_bg_color" name="qrg_form_bg_color" value="<?php echo esc_attr(get_option('qrg_form_bg_color', '#ffffff')); ?>"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="qrg_form_width"><?php esc_html_e('Breite', 'qr-code-generator'); ?></label></th>
                        <td><input type="text" id="qrg_form_width" name="qrg_form_width" value="<?php echo esc_attr(get_option('qrg_form_width', '80%')); ?>"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="qrg_form_padding"><?php esc_html_e('Padding', 'qr-code-generator'); ?></label></th>
                        <td><input type="text" id="qrg_form_padding" name="qrg_form_padding" value="<?php echo esc_attr(get_option('qrg_form_padding', '20px')); ?>"></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="qrg_form_margin"><?php esc_html_e('Margin', 'qr-code-generator'); ?></label></th>
                        <td><input type="text" id="qrg_form_margin" name="qrg_form_margin" value="<?php echo esc_attr(get_option('qrg_form_margin', '20px auto')); ?>"></td>
                    </tr>
                </table>
            </div>

            <div id="tab-preview" class="qrg-tab">
                <p><strong><?php esc_html_e('So sieht dein Formular aus:', 'qr-code-generator'); ?></strong></p>
                <div id="qrg-preview-container">
                    <em><?php esc_html_e('Lade Vorschau...', 'qr-code-generator'); ?></em>
                </div>
            </div>

            <?php submit_button(__('Einstellungen speichern', 'qr-code-generator')); ?>
        </form>
    </div>
    <?php
}

function qrg_ajax_preview() {
    check_ajax_referer('qrg_preview', 'nonce');

    if (!current_user_can('manage_options')) {
        wp_send_json_error(array('message' => __('Nicht berechtigt.', 'qr-code-generator')), 403);
    }

    wp_send_json_success(qrg_get_generator_markup());
}
